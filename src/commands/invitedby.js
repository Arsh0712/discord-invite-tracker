const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Member, Inviter } = require('../models');
const { calcTotal, presenceEmoji, presenceLabel, fmt, getOrCreateInviter } = require('../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('invitedby')
    .setDescription('Find out who invited a specific user')
    .addUserOption(opt =>
      opt.setName('user')
         .setDescription('The user to look up')
         .setRequired(true)
    ),

  async execute(interaction, client) {
    await interaction.deferReply();

    const target = interaction.options.getUser('user');
    const guild  = interaction.guild;

    const record = await Member.findOne({ guildId: guild.id, userId: target.id }).sort({ joinedAt: -1 });

    if (!record || !record.invitedBy) {
      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x5865f2)
            .setDescription(`❓ Could not find invite data for **${target.username}**.`)
        ],
      });
    }

    let inviterUser;
    try { inviterUser = await client.users.fetch(record.invitedBy); } catch {}

    let inviterMember;
    try { inviterMember = await guild.members.fetch(record.invitedBy); } catch {}

    const inviterStats = await getOrCreateInviter(guild.id, record.invitedBy);
    const total        = calcTotal(inviterStats);
    const status       = inviterMember?.presence?.status || 'offline';
    const statusIcon   = presenceEmoji(status);
    const statusName   = presenceLabel(status);

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle(`🔍 Who Invited ${target.username}?`)
      .setThumbnail(target.displayAvatarURL({ dynamic: true }))
      .addFields(
        {
          name:  '👤 Member',
          value: `${target} (${target.tag})\nJoined: <t:${Math.floor(new Date(record.joinedAt).getTime() / 1000)}:R>`,
        },
        {
          name:  '📨 Invited By',
          value: inviterUser
            ? `${statusIcon} **${inviterUser.tag}** — ${statusName}\n${inviterUser}`
            : `<@${record.invitedBy}>`,
        },
        {
          name:  '🔗 Used Invite Code',
          value: record.inviteCode ? `\`${record.inviteCode}\`` : 'Unknown',
          inline: true,
        },
        {
          name:  '🔄 Rejoin Count',
          value: `\`${record.rejoinCount}\``,
          inline: true,
        },
        {
          name:  '⚠️ Fake/Alt',
          value: record.isFake ? 'Yes' : 'No',
          inline: true,
        }
      );

    if (inviterStats) {
      embed.addFields({
        name:  `📊 ${inviterUser?.username || 'Inviter'}'s Stats`,
        value: `### ${statusIcon} **${inviterUser?.username || 'Unknown'}** has **${fmt(total)}** invites\n` +
               `✅ \`${fmt(inviterStats.regular)}\` regular  •  🚪 \`${fmt(inviterStats.left)}\` left  •  ⚠️ \`${fmt(inviterStats.fake)}\` fake`,
      });
    }

    embed.setFooter({ text: `${guild.name} • Invite Tracker`, iconURL: client.user.displayAvatarURL() })
         .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  },
};
