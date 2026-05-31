const { EmbedBuilder } = require('discord.js');
const { Invite, Member, Inviter, Guild } = require('../models');
const { getOrCreateInviter, getOrCreateGuild, isFakeAccount, presenceEmoji, presenceLabel, calcTotal, fmt } = require('../utils/helpers');

module.exports = {
  name: 'guildMemberAdd',
  async execute(member, client) {
    const guild = member.guild;

    // ── Diff the invite cache to find which invite was used ───────────────────
    let usedCode = null;
    let inviterUser = null;

    try {
      const cachedInvites = client.inviteCache.get(guild.id) || new Map();
      const freshInvites  = await guild.invites.fetch();

      // Find the code whose use count increased
      for (const [code, freshInv] of freshInvites) {
        const cachedUses = cachedInvites.get(code) || 0;
        if (freshInv.uses > cachedUses) {
          usedCode   = code;
          inviterUser = freshInv.inviter;

          // Update DB
          await Invite.findOneAndUpdate(
            { guildId: guild.id, code },
            { inviterId: inviterUser?.id, uses: freshInv.uses },
            { upsert: true }
          );
          break;
        }
      }

      // Refresh cache
      const newMap = new Map();
      freshInvites.forEach(inv => newMap.set(inv.code, inv.uses));
      client.inviteCache.set(guild.id, newMap);
    } catch (err) {
      console.warn(`[guildMemberAdd] Could not diff invites: ${err.message}`);
    }

    // ── Determine if this is a rejoin ─────────────────────────────────────────
    const existingRecord = await Member.findOne({ guildId: guild.id, userId: member.id });
    const isRejoin = !!existingRecord;

    // ── Determine fake/alt status ─────────────────────────────────────────────
    const guildSettings = await getOrCreateGuild(guild.id);
    const fake = isFakeAccount(member, guildSettings.fakeAccountAge);

    // ── Save/update member record ─────────────────────────────────────────────
    if (isRejoin) {
      await Member.findOneAndUpdate(
        { guildId: guild.id, userId: member.id },
        {
          invitedBy:   inviterUser?.id || existingRecord.invitedBy,
          inviteCode:  usedCode || existingRecord.inviteCode,
          joinedAt:    new Date(),
          leftAt:      null,
          isInServer:  true,
          isFake:      fake,
          $inc:        { rejoinCount: 1 },
        }
      );
    } else {
      await Member.create({
        guildId:    guild.id,
        userId:     member.id,
        invitedBy:  inviterUser?.id || null,
        inviteCode: usedCode || null,
        joinedAt:   new Date(),
        isFake:     fake,
      });
    }

    // ── Update inviter stats ──────────────────────────────────────────────────
    if (inviterUser && inviterUser.id !== member.id) {
      const inviter = await getOrCreateInviter(guild.id, inviterUser.id);

      if (fake) {
        inviter.fake += 1;
      } else if (isRejoin) {
        inviter.rejoins += 1;
        if (guildSettings.countRejoin) inviter.regular += 1;
      } else {
        inviter.regular += 1;
      }

      await inviter.save();
    }

    // ── Send log embed ────────────────────────────────────────────────────────
    const logChannelId = guildSettings.logChannelId || process.env.LOG_CHANNEL_ID;
    if (!logChannelId) return;

    const logChannel = guild.channels.cache.get(logChannelId);
    if (!logChannel) return;

    let inviterStats = null;
    let inviterMember = null;
    if (inviterUser) {
      inviterStats  = await getOrCreateInviter(guild.id, inviterUser.id);
      try { inviterMember = await guild.members.fetch(inviterUser.id); } catch {}
    }

    const status     = inviterMember?.presence?.status || 'offline';
    const statusIcon = presenceEmoji(status);
    const statusName = presenceLabel(status);

    const accountAge = Math.floor((Date.now() - member.user.createdTimestamp) / (1000 * 60 * 60 * 24));

    const embed = new EmbedBuilder()
      .setColor(isRejoin ? 0xf0a500 : fake ? 0xe74c3c : 0x57f287)
      .setTitle(`${isRejoin ? '🔄 Member Rejoined' : fake ? '⚠️ Suspicious Join' : '✅ Member Joined'}`)
      .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
      .addFields(
        {
          name:   '👤 Member',
          value:  `${member} (${member.user.tag})\nID: \`${member.id}\``,
          inline: false,
        },
        {
          name:   '📅 Account Created',
          value:  `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R> (${accountAge} days old)`,
          inline: true,
        },
        {
          name:   '🔢 Member Count',
          value:  `${guild.memberCount}`,
          inline: true,
        }
      );

    if (inviterUser && inviterStats) {
      const total = calcTotal(inviterStats);
      embed.addFields(
        {
          name:   '📨 Invited By',
          value:  `${statusIcon} **${inviterUser.tag}** is ${statusName}\n${inviterUser} • \`${inviterUser.id}\``,
          inline: false,
        },
        {
          name:   '📊 Their Invite Stats',
          value:  [
            `**${fmt(total)}** total invites`,
            `✅ \`${fmt(inviterStats.regular)}\` joined  •  🚪 \`${fmt(inviterStats.left)}\` left`,
            `⚠️ \`${fmt(inviterStats.fake)}\` fake  •  🔄 \`${fmt(inviterStats.rejoins)}\` rejoins`,
          ].join('\n'),
          inline: false,
        },
        {
          name:   '🔗 Invite Code',
          value:  usedCode ? `\`${usedCode}\`` : 'Unknown',
          inline: true,
        }
      );
    } else {
      embed.addFields({
        name:  '📨 Invited By',
        value: inviterUser ? `${inviterUser.tag}` : '_Could not determine inviter_',
      });
    }

    if (isRejoin) embed.addFields({ name: '🔄 Rejoin', value: `This user has rejoined the server.`, inline: true });
    if (fake)    embed.addFields({ name: '⚠️ Fake/Alt', value: `Account is only **${accountAge} days old**.`, inline: true });

    embed.setFooter({ text: `Invite Tracker`, iconURL: client.user.displayAvatarURL() })
         .setTimestamp();

    logChannel.send({ embeds: [embed] }).catch(() => {});
  },
};
