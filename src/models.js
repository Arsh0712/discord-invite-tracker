const mongoose = require('mongoose');

// ─── Invite Schema ─────────────────────────────────────────────────────────────
// Tracks every invite code and who created it
const inviteSchema = new mongoose.Schema({
  guildId:   { type: String, required: true, index: true },
  inviterId: { type: String, required: true, index: true },
  code:      { type: String, required: true },
  uses:      { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
});
inviteSchema.index({ guildId: 1, code: 1 }, { unique: true });

// ─── Member Invite Record ──────────────────────────────────────────────────────
// Tracks who invited whom, and join/leave history
const memberSchema = new mongoose.Schema({
  guildId:    { type: String, required: true, index: true },
  userId:     { type: String, required: true, index: true },
  invitedBy:  { type: String, default: null },   // userId of the inviter
  inviteCode: { type: String, default: null },
  joinedAt:   { type: Date, default: Date.now },
  leftAt:     { type: Date, default: null },
  isInServer: { type: Boolean, default: true },
  rejoinCount:{ type: Number, default: 0 },       // how many times they rejoined
  isFake:     { type: Boolean, default: false },   // alt/fake account flag
});
memberSchema.index({ guildId: 1, userId: 1 });

// ─── Inviter Stats ─────────────────────────────────────────────────────────────
// Aggregated stats per inviter per guild
const inviterSchema = new mongoose.Schema({
  guildId:  { type: String, required: true },
  userId:   { type: String, required: true },
  // Counters
  regular:  { type: Number, default: 0 },   // real joins still in server
  left:     { type: Number, default: 0 },   // people who left
  fake:     { type: Number, default: 0 },   // alt/fake accounts
  bonus:    { type: Number, default: 0 },   // manually added bonus invites
  rejoins:  { type: Number, default: 0 },   // people who rejoined
});
inviterSchema.index({ guildId: 1, userId: 1 }, { unique: true });

// Virtual: total = regular + bonus (left and fake are subtracted in display)
inviterSchema.virtual('total').get(function () {
  return this.regular + this.bonus;
});

// ─── Guild Settings ────────────────────────────────────────────────────────────
const guildSchema = new mongoose.Schema({
  guildId:        { type: String, required: true, unique: true },
  logChannelId:   { type: String, default: null },
  fakeAccountAge: { type: Number, default: 7 },   // days — accounts younger than this are "fake"
  countRejoin:    { type: Boolean, default: false }, // count rejoins as real invites?
  createdAt:      { type: Date, default: Date.now },
});

module.exports = {
  Invite:   mongoose.model('Invite',   inviteSchema),
  Member:   mongoose.model('Member',   memberSchema),
  Inviter:  mongoose.model('Inviter',  inviterSchema),
  Guild:    mongoose.model('Guild',    guildSchema),
};
