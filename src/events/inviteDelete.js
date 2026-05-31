module.exports = {
  name: 'inviteDelete',
  async execute(invite, client) {
    const cache = client.inviteCache.get(invite.guild.id);
    if (cache) {
      cache.delete(invite.code);
    }
    // We do NOT delete from DB — historical tracking needs the record
  },
};
