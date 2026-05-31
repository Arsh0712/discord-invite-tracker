const { Invite } = require('../models');

module.exports = {
  name: 'inviteCreate',
  async execute(invite, client) {
    const cache = client.inviteCache.get(invite.guild.id) || new Map();
    cache.set(invite.code, invite.uses);
    client.inviteCache.set(invite.guild.id, cache);

    if (invite.inviter) {
      await Invite.findOneAndUpdate(
        { guildId: invite.guild.id, code: invite.code },
        { inviterId: invite.inviter.id, uses: invite.uses || 0 },
        { upsert: true, new: true }
      );
    }
  },
};
