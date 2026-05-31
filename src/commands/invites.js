const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Inviter, Member } = require('../models');
const { getOrCreateInviter, calcTotal, presenceEmoji, presenceLabel, fmt } = require('../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('invites')
    .setDescription("View invite stats for yourself or another user")
    .addUserOption(opt =>
      opt.setName('user')
         .setDescription('The user to check (defaults to you)')
         .setRequired(false)
    ),

  async execute(interaction, client) {
    await interaction.deferReply();

    const target = interaction.options.getUser('user') || interaction.user;
    const guild  = interaction.guild;

    let targetMember;
    try { targetMember = await guild.members.fetch(target.id); } catch {}

    const stats  = await getOrCreateInviter(guild.id, target.id);
    const total  = calcTotal(stats);

    // Count people this user invited who are still in server
    const invitedList = await Member.find({
      guildId:   guild.id,
      invitedBy: target.id,
      isInServer: true,
    }).limit(5);

    const status     = targetMember?.presence?.status || 'offline';
    const statusIcon = presenceEmoji(status);
    const statusName = presenceLabel(status);

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle(`📨 Invite Stats — ${target.username}`)
      .setThumbnail(target.displayAvatarURL({ dynamic: true }))
      .setDescription(
        // ─ Highlighted total line ─
        `### ${statusIcon} **${target.username}** has **${fmt(total)}** invites`
      )
      .addFields(
        {
          name:   '📊 Breakdown',
          value: [
            `✅ **Regular**  \`${fmt(stats.regular)}\` — people currently in server`,
            `🚪 **Left**     \`${fmt(stats.left)}\` — people who left`,
            `⚠️ **Fake/Alt** \`${fmt(stats.fake)}\` — suspicious accounts`,
            `🔄 **Rejoins**  \`${fmt(stats.rejoins)}\` — people who came back`,
            `🎁 **Bonus**    \`${fmt(stats.bonus)}\` — manually added`,
          ].join('\n'),
          inline: false,
        },
        {
          name:   '🌐 Status',
          value:  `${statusIcon} ${statusName}`,
          inline: true,
        },
        {
          name:   '🔢 Net Invites',
          value:  `\`${fmt(Math.max(0, total - stats.left - stats.fake))}\``,
          inline: true,
        }
      )
      .setFooter({ text: `${guild.name} • Invite Tracker`, iconURL: client.user.displayAvatarURL() })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  },
};
