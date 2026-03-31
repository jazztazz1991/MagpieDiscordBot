import {
  Client,
  Collection,
  GatewayIntentBits,
  Partials,
} from 'discord.js';
import { config } from './config';
import { Command } from './types';

// Import commands
import { pingCommand } from './commands/ping';
import { pollCommand } from './commands/poll';
import { reactionRoleCommand } from './commands/reactionrole';
import { eventCommand } from './commands/event';
import { eventAdminCommand } from './commands/eventadmin';
import { modCommand } from './commands/mod';
import { lookupCommand } from './commands/lookup';
import { nestPingsCommand } from './commands/nestpings';
import { orderSetupCommand } from './commands/ordersetup';
import { orderCommand } from './commands/order';

// Import event handlers
import { handleReady } from './events/ready';
import { handleGuildMemberAdd } from './events/guildMemberAdd';
import { handleReactionAdd } from './events/messageReactionAdd';
import { handleReactionRemove } from './events/messageReactionRemove';
import { handleInteractionCreate } from './events/interactionCreate';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.MessageContent,
  ],
  partials: [
    Partials.Message,
    Partials.Channel,
    Partials.Reaction,
  ],
});

// Set up commands collection
const commands = new Collection<string, Command>();
const commandList: Command[] = [
  pingCommand,
  pollCommand,
  reactionRoleCommand,
  eventCommand,
  eventAdminCommand,
  modCommand,
  lookupCommand,
  nestPingsCommand,
  orderSetupCommand,
  orderCommand,
];

for (const command of commandList) {
  commands.set(command.data.name, command);
}

// Store commands on client for access in event handlers
(client as any).commands = commands;

// Register event handlers
client.once('ready', (c) => handleReady(c));
client.on('guildMemberAdd', (member) => handleGuildMemberAdd(member));
client.on('messageReactionAdd', (reaction, user) => handleReactionAdd(reaction, user));
client.on('messageReactionRemove', (reaction, user) => handleReactionRemove(reaction, user));
client.on('interactionCreate', (interaction) => handleInteractionCreate(interaction));

client.login(config.token);
