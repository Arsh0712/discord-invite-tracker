const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const { Member } = require('../models');
const { chunk, fmt } = require('../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('invited')
    .setDescription("List the members that a user has invited")
    .addUserOption(opt =>
      opt.setName('user')
         .setDescription('The user to check (defaults to you)')
         .setRequired(false)
    ),

  async execute(interaction, client) {
    await interaction.deferReply();

    const target = interaction.options.getUser('user') || interaction.user;
    const guild  = interaction.guild;

    const allInvited = await Member.find({
      guildId:   guild.id,
      invitedBy: target.id,
    }).sort({ joinedAt: -1 });

    if (allInvited.length === 0) {
      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x5865f2)
            .setDescription(`📭 **${target.username}** hasn't invited anyone yet.`)
        ],
      });
    }

    const inServer  = allInvited.filter(m => m.isInServer && !m.isFake);
    const leftList  = allInvited.filter(m => !m.isInServer);
    const fakeList  = allInvited.filter(m => m.isFake);
    const rejoiners = allInvited.filter(m => m.rejoinCount > 0);

    // Build user mention lines, paginated 10 per page
    const lines = allInvited.map(m => {
      const icons = [];
      if (!m.isInServer) icons.push('🚪');
      if (m.isFake)      icons.push('⚠️');
      if (m.rejoinCount) icons.push(`🔄×${m.rejoinCount}`);
      return `• <@${m.userId}> ${icons.join(' ')}`;
    });

    const pages  = chunk(lines, 10);
    let   page   = 0;

    const buildEmbed = (p) =>
      new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle(`👥 Invited by ${target.username}`)
        .setThumbnail(target.displayAvatarURL({ dynamic: true }))
        .setDescription(pages[p].join('\n'))
        .addFields(
          { name: '✅ In Server',  value: fmt(inServer.length),  inline: true },
          { name: '🚪 Left',      value: fmt(leftList.length),  inline: true },
          { name: '⚠️ Fake/Alt',  value: fmt(fakeList.length),  inline: true },
          { name: '🔄 Rejoined',  value: fmt(rejoiners.length), inline: true },
          { name: '📊 Total',     value: fmt(allInvited.length), inline: true },
        )
        .setFooter({ text: `Page ${p + 1}/${pages.length}` })
        .setTimestamp();

    const buildRow = (p) =>
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('prev')
          .setLabel('◀ Prev')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(p === 0),
        new ButtonBuilder()
          .setCustomId('next')
          .setLabel('Next ▶')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(p === pages.length - 1)
      );

    const msg = await interaction.editReply({
      embeds: [buildEmbed(page)],
      components: pages.length > 1 ? [buildRow(page)] : [],
    });

    if (pages.length <= 1) return;

    const collector = msg.createMessageComponentCollector({
      componentType: ComponentType.Button,
      filter: i => i.user.id === interaction.user.id,
      time: 60_000,
    });

    collector.on('collect', async i => {
      if (i.customId === 'prev') page = Math.max(0, page - 1);
      if (i.customId === 'next') page = Math.min(pages.length - 1, page + 1);
      await i.update({ embeds: [buildEmbed(page)], components: [buildRow(page)] });
    });

    collector.on('end', () => {
      interaction.editReply({ components: [] }).catch(() => {});
    });
  },
};
