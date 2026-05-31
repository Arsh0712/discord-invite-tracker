const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { Guild } = require('../models');
const { getOrCreateGuild } = require('../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setlog')
    .setDescription('Set the channel where join/leave logs are sent')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addChannelOption(opt =>
      opt.setName('channel')
         .setDescription('The channel to log events in')
         .setRequired(true)
    ),

  async execute(interaction, client) {
    const channel = interaction.options.getChannel('channel');
    const guild   = interaction.guild;

    await Guild.findOneAndUpdate(
      { guildId: guild.id },
      { logChannelId: channel.id },
      { upsert: true }
    );

    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x57f287)
          .setDescription(`✅ Log channel set to ${channel}`)
      ],
      ephemeral: true,
    });
  },
};
