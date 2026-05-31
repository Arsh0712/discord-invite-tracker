const { Invite } = require('../models');

module.exports = {
  name: 'guildCreate',
  async execute(guild, client) {
    try {
      const invites = await guild.invites.fetch();
      const codeMap = new Map();
      invites.forEach(inv => codeMap.set(inv.code, inv.uses));
      client.inviteCache.set(guild.id, codeMap);

      for (const inv of invites.values()) {
        if (!inv.inviter) continue;
        await Invite.findOneAndUpdate(
          { guildId: guild.id, code: inv.code },
          { inviterId: inv.inviter.id, uses: inv.uses },
          { upsert: true, new: true }
        );
      }
    } catch (err) {
      console.warn(`Could not cache invites for new guild ${guild.id}: ${err.message}`);
    }
  },
};
