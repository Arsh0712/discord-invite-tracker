# 🎯 Discord Invite Tracker Bot

A **production-grade** Discord invite tracking bot inspired by Falcon Bot Premium — tracks joins, rejoins, left members, fake/alt accounts, and shows real-time presence status. Built with **Discord.js v14**, **MongoDB**, and deployable to **Railway** in minutes.

---

## ✨ Features

| Feature | Description |
|---|---|
| 📊 **Invite Stats** | Real, left, fake/alt, rejoins, bonus — all tracked |
| 🔄 **Rejoin Tracking** | Counts rejoins separately — works forever |
| ⚠️ **Fake/Alt Detection** | Flags accounts younger than N days |
| 🟢 **Presence Status** | Shows Online / Idle / DND / Offline with emoji |
| 🏆 **Leaderboard** | Paginated, sortable by any stat |
| 📋 **Invited List** | See every person a user invited |
| 🔍 **Invited By** | Find who invited a specific member |
| 🎁 **Bonus Invites** | Admins can add/remove bonus invites |
| 📢 **Join/Leave Logs** | Rich embeds with full invite attribution |
| ♾️ **Infinite History** | Data persists forever in MongoDB |

---

## 🚀 Quick Start

### 1. Create your Discord Bot

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. **New Application** → give it a name
3. Go to **Bot** tab → **Add Bot**
4. Copy your **Bot Token** (you'll need this)
5. Go to **OAuth2 → General** → copy your **Client ID**
6. Under **Bot** tab, enable these **Privileged Gateway Intents**:
   - ✅ **Server Members Intent**
   - ✅ **Presence Intent**
   - ✅ **Message Content Intent**

### 2. Invite the Bot to your Server

Use this URL (replace `YOUR_CLIENT_ID`):
```
https://discord.com/api/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=8&scope=bot%20applications.commands
```

### 3. Clone & Configure

```bash
git clone https://github.com/YOUR_USERNAME/discord-invite-tracker.git
cd discord-invite-tracker
cp .env.example .env
```

Edit `.env`:
```env
DISCORD_TOKEN=your_bot_token_here
CLIENT_ID=your_client_id_here
MONGO_URI=mongodb://localhost:27017/invitetracker
GUILD_ID=           # optional: for faster command deployment in one server
LOG_CHANNEL_ID=     # optional: fallback log channel ID
```

### 4. Install & Deploy Commands

```bash
npm install
npm run deploy     # registers slash commands
npm start          # starts the bot
```

---

## ☁️ Deploy to Railway

### Option A — GitHub Auto-Deploy (Recommended)

1. Push this repo to GitHub
2. Go to [railway.app](https://railway.app) → **New Project**
3. Choose **Deploy from GitHub repo**
4. Select your repository
5. Add a **MongoDB** plugin: **New → Database → Add MongoDB**
6. Go to your bot service → **Variables** tab, add:

| Variable | Value |
|---|---|
| `DISCORD_TOKEN` | Your bot token |
| `CLIENT_ID` | Your application client ID |
| `MONGO_URL` | Railway auto-fills this from the MongoDB plugin |
| `LOG_CHANNEL_ID` | (optional) channel ID for logs |
| `GUILD_ID` | (optional) for guild-specific command deploy |

7. **Deploy** — Railway will auto-build and run `node src/index.js`

### Option B — Railway CLI

```bash
npm install -g @railway/cli
railway login
railway init
railway up
```

> **Note:** Railway's MongoDB plugin sets `MONGO_URL` automatically. The bot reads both `MONGO_URI` and `MONGO_URL`.

---

## 📖 Commands

| Command | Description |
|---|---|
| `/invites` | Your invite stats (total highlighted, with presence) |
| `/invites [user]` | Another user's invite stats |
| `/invited` | List everyone you've invited |
| `/invited [user]` | List everyone a user has invited |
| `/invitedby <user>` | Who invited a specific member |
| `/leaderboard` | Server invite leaderboard |
| `/leaderboard [sort]` | Sort by total / regular / left / fake |
| `/stats` | Server-wide invite statistics |
| `/setlog <channel>` | Set the join/leave log channel *(Admin)* |
| `/bonus add <user> <n>` | Add bonus invites *(Admin)* |
| `/bonus remove <user> <n>` | Remove bonus invites *(Admin)* |
| `/bonus reset <user>` | Reset all stats for a user *(Admin)* |

---

## 📊 How Invites are Counted

```
Total = Regular + Bonus
```

| Stat | Meaning |
|---|---|
| **Regular** | People who joined via this user's invite and are still in the server |
| **Left** | People who joined via this user's invite but have since left |
| **Fake/Alt** | Accounts younger than the threshold (default: 7 days) |
| **Rejoins** | People who left and came back — tracked separately |
| **Bonus** | Manually added by admins |

The **Total** displayed is `Regular + Bonus`. Left and Fake are shown as informational stats below.

---

## 🗂️ Project Structure

```
discord-invite-tracker/
├── src/
│   ├── index.js              # Entry point
│   ├── models.js             # MongoDB schemas
│   ├── deploy-commands.js    # Slash command registration
│   ├── commands/
│   │   ├── invites.js        # /invites
│   │   ├── invited.js        # /invited
│   │   ├── invitedby.js      # /invitedby
│   │   ├── leaderboard.js    # /leaderboard
│   │   ├── stats.js          # /stats
│   │   ├── setlog.js         # /setlog
│   │   └── bonus.js          # /bonus
│   ├── events/
│   │   ├── ready.js          # Bot ready + invite cache warm-up
│   │   ├── guildCreate.js    # Cache invites when joining new guild
│   │   ├── guildMemberAdd.js # Join detection + invite diffing
│   │   ├── guildMemberRemove.js # Leave tracking
│   │   ├── inviteCreate.js   # Cache new invites
│   │   ├── inviteDelete.js   # Remove from cache
│   │   └── interactionCreate.js # Route slash commands
│   └── utils/
│       └── helpers.js        # Shared utilities
├── .env.example
├── .gitignore
├── package.json
└── railway.json
```

---

## 🔧 Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DISCORD_TOKEN` | ✅ | Your bot token from Discord Developer Portal |
| `CLIENT_ID` | ✅ | Your application's Client ID |
| `MONGO_URI` or `MONGO_URL` | ✅ | MongoDB connection string |
| `GUILD_ID` | ❌ | Deploy commands to one guild only (instant) |
| `LOG_CHANNEL_ID` | ❌ | Fallback log channel (overridden by /setlog) |

---

## 📝 License

MIT — free to use, modify, and deploy.
