const { Inviter, Guild } = require('../models');

// ─── Get or create inviter stats ──────────────────────────────────────────────
async function getOrCreateInviter(guildId, userId) {
  let doc = await Inviter.findOne({ guildId, userId });
  if (!doc) {
    doc = await Inviter.create({ guildId, userId });
  }
  return doc;
}

// ─── Get or create guild settings ─────────────────────────────────────────────
async function getOrCreateGuild(guildId) {
  let doc = await Guild.findOne({ guildId });
  if (!doc) {
    doc = await Guild.create({ guildId });
  }
  return doc;
}

// ─── Calculate total displayed invites ────────────────────────────────────────
// total = regular + bonus  (left and fake are informational deductions)
function calcTotal(inviter) {
  return (inviter.regular || 0) + (inviter.bonus || 0);
}

// ─── Presence status emoji ────────────────────────────────────────────────────
function presenceEmoji(status) {
  const map = {
    online:    '🟢',
    idle:      '🌙',
    dnd:       '🔴',
    offline:   '⚫',
    invisible: '⚫',
  };
  return map[status] || '⚫';
}

function presenceLabel(status) {
  const map = {
    online:    'Online',
    idle:      'Idle',
    dnd:       'Do Not Disturb',
    offline:   'Offline',
    invisible: 'Offline',
  };
  return map[status] || 'Offline';
}

// ─── Check if account is likely fake/alt ──────────────────────────────────────
function isFakeAccount(member, minAgeDays = 7) {
  const accountAgeDays = (Date.now() - member.user.createdTimestamp) / (1000 * 60 * 60 * 24);
  return accountAgeDays < minAgeDays;
}

// ─── Format big numbers ───────────────────────────────────────────────────────
function fmt(n) {
  return Number(n || 0).toLocaleString();
}

// ─── Chunk array for pagination ───────────────────────────────────────────────
function chunk(arr, size) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
  return chunks;
}

module.exports = {
  getOrCreateInviter,
  getOrCreateGuild,
  calcTotal,
  presenceEmoji,
  presenceLabel,
  isFakeAccount,
  fmt,
  chunk,
};
