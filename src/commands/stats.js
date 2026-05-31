const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Member, Inviter } = require('../models');
const { fmt } = require('../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('stats')
    .setDescription('View overall invite statistics for this server'),

  async execute(interaction, client) {
    await interaction.deferReply();

    const guild = interaction.guild;

    const [totalInvites, totalJoins, totalLeft, totalFake, totalRejoins, topInviter] = await Promise.all([
      Inviter.aggregate([{ $match: { guildId: guild.id } }, { $group: { _id: null, sum: { $sum: { $add: ['$regular', '$bonus'] } } } }]),
      Member.countDocuments({ guildId: guild.id }),
      Member.countDocuments({ guildId: guild.id, isInServer: false }),
      Member.countDocuments({ guildId: guild.id, isFake: true }),
      Member.countDocuments({ guildId: guild.id, rejoinCount: { $gt: 0 } }),
      Inviter.findOne({ guildId: guild.id }).sort({ regular: -1 }),
    ]);

    const netInvites = totalInvites[0]?.sum || 0;

    let topLine = 'Nobody yet!';
    if (topInviter) {
      try {
        const u = await client.users.fetch(topInviter.userId);
        topLine = `${u.username} — **${fmt(topInviter.regular + topInviter.bonus)}** invites`;
      } catch {
        topLine = `<@${topInviter.userId}> — **${fmt(topInviter.regular + topInviter.bonus)}** invites`;
      }
    }

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle(`📊 Server Invite Stats — ${guild.name}`)
      .setThumbnail(guild.iconURL({ dynamic: true }))
      .addFields(
        { name: '👥 Total Members',    value: fmt(guild.memberCount),    inline: true },
        { name: '📈 Total Joins Ever', value: fmt(totalJoins),           inline: true },
        { name: '🚪 Total Left',       value: fmt(totalLeft),            inline: true },
        { name: '⚠️ Fake/Alt Joins',   value: fmt(totalFake),            inline: true },
        { name: '🔄 Rejoiners',        value: fmt(totalRejoins),         inline: true },
        { name: '🏆 Top Inviter',      value: topLine,                   inline: false },
      )
      .setFooter({ text: `${guild.name} • Invite Tracker`, iconURL: client.user.displayAvatarURL() })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  },
};
