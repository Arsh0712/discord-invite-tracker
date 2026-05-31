const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { Inviter, Member } = require('../models');
const { getOrCreateInviter, fmt } = require('../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('bonus')
    .setDescription('Add or remove bonus invites for a user (Admin only)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand(sub =>
      sub.setName('add')
         .setDescription('Add bonus invites')
         .addUserOption(opt => opt.setName('user').setDescription('User').setRequired(true))
         .addIntegerOption(opt => opt.setName('amount').setDescription('Amount to add').setRequired(true).setMinValue(1))
    )
    .addSubcommand(sub =>
      sub.setName('remove')
         .setDescription('Remove bonus invites')
         .addUserOption(opt => opt.setName('user').setDescription('User').setRequired(true))
         .addIntegerOption(opt => opt.setName('amount').setDescription('Amount to remove').setRequired(true).setMinValue(1))
    )
    .addSubcommand(sub =>
      sub.setName('reset')
         .setDescription('Reset ALL invite stats for a user')
         .addUserOption(opt => opt.setName('user').setDescription('User').setRequired(true))
    ),

  async execute(interaction, client) {
    await interaction.deferReply({ ephemeral: true });

    const sub    = interaction.options.getSubcommand();
    const target = interaction.options.getUser('user');
    const guild  = interaction.guild;

    if (sub === 'reset') {
      await Inviter.findOneAndUpdate(
        { guildId: guild.id, userId: target.id },
        { regular: 0, left: 0, fake: 0, bonus: 0, rejoins: 0 },
        { upsert: true }
      );
      await Member.updateMany(
        { guildId: guild.id, invitedBy: target.id },
        { invitedBy: null }
      );

      return interaction.editReply({
        embeds: [new EmbedBuilder().setColor(0x57f287).setDescription(`✅ Reset all invite stats for **${target.username}**.`)],
      });
    }

    const amount = interaction.options.getInteger('amount');
    const delta  = sub === 'add' ? amount : -amount;
    const stats  = await getOrCreateInviter(guild.id, target.id);

    stats.bonus = Math.max(0, (stats.bonus || 0) + delta);
    await stats.save();

    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x57f287)
          .setDescription(
            `✅ ${sub === 'add' ? 'Added' : 'Removed'} **${amount}** bonus invite(s) ${sub === 'add' ? 'to' : 'from'} **${target.username}**.\nThey now have **${fmt(stats.bonus)}** bonus invites.`
          ),
      ],
    });
  },
};
