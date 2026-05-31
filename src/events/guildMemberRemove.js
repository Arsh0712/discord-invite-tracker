const { EmbedBuilder } = require('discord.js');
const { Member, Inviter } = require('../models');
const { getOrCreateInviter, getOrCreateGuild, calcTotal, fmt, presenceEmoji, presenceLabel } = require('../utils/helpers');

module.exports = {
  name: 'guildMemberRemove',
  async execute(member, client) {
    const guild = member.guild;

    // Mark member as left in DB
    const record = await Member.findOneAndUpdate(
      { guildId: guild.id, userId: member.id, isInServer: true },
      { leftAt: new Date(), isInServer: false },
      { new: true }
    );

    if (!record || !record.invitedBy) return;

    // Decrement inviter's regular count, increment left count
    await Inviter.findOneAndUpdate(
      { guildId: guild.id, userId: record.invitedBy },
      { $inc: { regular: -1, left: 1 } }
    );

    // ── Send leave log ────────────────────────────────────────────────────────
    const guildSettings = await getOrCreateGuild(guild.id);
    const logChannelId  = guildSettings.logChannelId || process.env.LOG_CHANNEL_ID;
    if (!logChannelId) return;

    const logChannel = guild.channels.cache.get(logChannelId);
    if (!logChannel) return;

    let inviterTag   = 'Unknown';
    let inviterStats = null;

    try {
      const inviterUser = await client.users.fetch(record.invitedBy);
      inviterTag   = inviterUser?.tag || 'Unknown';
      inviterStats = await getOrCreateInviter(guild.id, record.invitedBy);
    } catch {}

    const embed = new EmbedBuilder()
      .setColor(0xe74c3c)
      .setTitle('🚪 Member Left')
      .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
      .addFields(
        {
          name:  '👤 Member',
          value: `${member.user.tag}\nID: \`${member.id}\``,
        },
        {
          name:   '📨 Was Invited By',
          value:  inviterTag,
          inline: true,
        },
        {
          name:   '🔗 Invite Code',
          value:  record.inviteCode ? `\`${record.inviteCode}\`` : 'Unknown',
          inline: true,
        }
      );

    if (inviterStats) {
      embed.addFields({
        name:  '📊 Inviter Stats After',
        value: `**${fmt(calcTotal(inviterStats))}** total • ✅ \`${fmt(inviterStats.regular)}\` • 🚪 \`${fmt(inviterStats.left)}\` • ⚠️ \`${fmt(inviterStats.fake)}\``,
      });
    }

    embed.setFooter({ text: 'Invite Tracker', iconURL: client.user.displayAvatarURL() }).setTimestamp();
    logChannel.send({ embeds: [embed] }).catch(() => {});
  },
};
