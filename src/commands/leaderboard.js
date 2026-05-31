const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const { Inviter } = require('../models');
const { calcTotal, presenceEmoji, presenceLabel, fmt, chunk } = require('../utils/helpers');

const MEDALS = ['🥇', '🥈', '🥉'];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('View the invite leaderboard for this server')
    .addStringOption(opt =>
      opt.setName('sort')
         .setDescription('Sort by which stat?')
         .setRequired(false)
         .addChoices(
           { name: 'Total Invites',  value: 'total'   },
           { name: 'Regular',        value: 'regular' },
           { name: 'Left',           value: 'left'    },
           { name: 'Fake/Alt',       value: 'fake'    },
         )
    ),

  async execute(interaction, client) {
    await interaction.deferReply();

    const guild    = interaction.guild;
    const sortBy   = interaction.options.getString('sort') || 'total';
    const allStats = await Inviter.find({ guildId: guild.id });

    if (!allStats.length) {
      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x5865f2)
            .setDescription('📭 No invite data found for this server yet.')
        ],
      });
    }

    // Sort
    const sorted = allStats.sort((a, b) => {
      if (sortBy === 'total')   return calcTotal(b) - calcTotal(a);
      if (sortBy === 'regular') return b.regular    - a.regular;
      if (sortBy === 'left')    return b.left        - a.left;
      if (sortBy === 'fake')    return b.fake        - a.fake;
      return calcTotal(b) - calcTotal(a);
    });

    // Build lines
    const lines = [];
    for (let i = 0; i < sorted.length; i++) {
      const s      = sorted[i];
      const total  = calcTotal(s);
      const rank   = MEDALS[i] || `\`#${i + 1}\``;

      let mention = `<@${s.userId}>`;

      // Presence
      let member;
      try { member = await guild.members.fetch(s.userId); } catch {}
      const status     = member?.presence?.status || 'offline';
      const statusIcon = presenceEmoji(status);

      lines.push(
        `${rank} ${statusIcon} ${mention} — **${fmt(total)}** invites  ` +
        `(✅ ${fmt(s.regular)} | 🚪 ${fmt(s.left)} | ⚠️ ${fmt(s.fake)})`
      );
    }

    const pages = chunk(lines, 10);
    let   page  = 0;

    const titleMap = {
      total:   '📊 Total Invites',
      regular: '✅ Regular Invites',
      left:    '🚪 Left Members',
      fake:    '⚠️ Fake/Alt Accounts',
    };

    const buildEmbed = (p) =>
      new EmbedBuilder()
        .setColor(0xffd700)
        .setTitle(`🏆 Invite Leaderboard — ${titleMap[sortBy]}`)
        .setThumbnail(guild.iconURL({ dynamic: true }))
        .setDescription(pages[p].join('\n\n'))
        .setFooter({ text: `${guild.name} • Page ${p + 1}/${pages.length}`, iconURL: client.user.displayAvatarURL() })
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
