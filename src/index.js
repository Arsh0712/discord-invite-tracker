require('dotenv').config();
const { Client, GatewayIntentBits, Partials, Collection } = require('discord.js');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

// ─── Client Setup ─────────────────────────────────────────────────────────────
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildInvites,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.GuildMember, Partials.User],
});

client.commands = new Collection();

// ─── Load Commands ─────────────────────────────────────────────────────────────
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'));

for (const file of commandFiles) {
  const command = require(path.join(commandsPath, file));
  if (command.data && command.execute) {
    client.commands.set(command.data.name, command);
    console.log(chalk.green(`  ✓ Loaded command: /${command.data.name}`));
  }
}

// ─── Load Events ──────────────────────────────────────────────────────────────
const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(f => f.endsWith('.js'));

for (const file of eventFiles) {
  const event = require(path.join(eventsPath, file));
  if (event.once) {
    client.once(event.name, (...args) => event.execute(...args, client));
  } else {
    client.on(event.name, (...args) => event.execute(...args, client));
  }
  console.log(chalk.blue(`  ✓ Loaded event: ${event.name}`));
}

// ─── MongoDB Connection ────────────────────────────────────────────────────────
const MONGO_URI = process.env.MONGO_URI || process.env.MONGO_URL;

if (!MONGO_URI) {
  console.error(chalk.red('✗ MONGO_URI / MONGO_URL environment variable is not set!'));
  process.exit(1);
}

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log(chalk.magenta('  ✓ Connected to MongoDB'));
    // Login after DB is ready
    client.login(process.env.DISCORD_TOKEN);
  })
  .catch(err => {
    console.error(chalk.red('✗ MongoDB connection error:'), err);
    process.exit(1);
  });

// ─── Global error handlers ────────────────────────────────────────────────────
process.on('unhandledRejection', err => {
  console.error(chalk.red('[UnhandledRejection]'), err);
});
process.on('uncaughtException', err => {
  console.error(chalk.red('[UncaughtException]'), err);
});
