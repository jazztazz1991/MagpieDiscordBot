import { REST, Routes } from 'discord.js';
import { config } from '../config';

import { pingCommand } from '../commands/ping';
import { pollCommand } from '../commands/poll';
import { reactionRoleCommand } from '../commands/reactionrole';
import { eventCommand } from '../commands/event';
import { eventAdminCommand } from '../commands/eventadmin';
import { modCommand } from '../commands/mod';
import { lookupCommand } from '../commands/lookup';
import { nestPingsCommand } from '../commands/nestpings';

const commands = [
  pingCommand.data.toJSON(),
  pollCommand.data.toJSON(),
  reactionRoleCommand.data.toJSON(),
  eventCommand.data.toJSON(),
  eventAdminCommand.data.toJSON(),
  modCommand.data.toJSON(),
  lookupCommand.data.toJSON(),
  nestPingsCommand.data.toJSON(),
];

const rest = new REST({ version: '10' }).setToken(config.token);

(async () => {
  try {
    console.log(`Deploying ${commands.length} slash commands...`);

    await rest.put(
      Routes.applicationGuildCommands(config.clientId, config.guildId),
      { body: commands }
    );

    console.log('Commands deployed successfully!');
  } catch (error) {
    console.error('Failed to deploy commands:', error);
  }
})();
