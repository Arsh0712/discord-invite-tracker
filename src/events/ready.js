const chalk = require('chalk');
const { Invite, Guild } = require('../models');

module.exports = {
  name: 'ready',
  once: true,
  async execute(client) {
    console.log(chalk.cyan(`\n  ✓ Logged in as ${client.user.tag}`));
    console.log(chalk.cyan(`  ✓ Serving ${client.guilds.cache.size} guild(s)\n`));

    client.user.setPresence({
      activities: [{ name: '/invites | Tracking Invites', type: 3 }],
      status: 'online',
    });

    // ── Cache all guild invites into memory ───────────────────────────────────
    // We store a Map<guildId, Map<code, uses>> so we can diff on new joins
    client.inviteCache = new Map();

    for (const [guildId, guild] of client.guilds.cache) {
      try {
        const invites = await guild.invites.fetch();
        const codeMap = new Map();
        invites.forEach(inv => codeMap.set(inv.code, inv.uses));
        client.inviteCache.set(guildId, codeMap);

        // Persist invites to DB (upsert)
        for (const inv of invites.values()) {
          if (!inv.inviter) continue;
          await Invite.findOneAndUpdate(
            { guildId, code: inv.code },
            { inviterId: inv.inviter.id, uses: inv.uses },
            { upsert: true, new: true }
          );
        }
      } catch (err) {
        console.warn(chalk.yellow(`  ⚠ Could not fetch invites for guild ${guildId}: ${err.message}`));
      }
    }

    console.log(chalk.green('  ✓ Invite cache warmed up'));
  },
};
