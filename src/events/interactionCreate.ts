import { Interaction, Collection } from 'discord.js';
import { Command } from '../types';
import { handleOrderButton, handleOrderModalSubmit } from './orderInteractions';

export async function handleInteractionCreate(interaction: Interaction) {
  // Handle button clicks
  if (interaction.isButton()) {
    try {
      await handleOrderButton(interaction);
    } catch (error) {
      console.error('Error handling button:', error);
    }
    return;
  }

  // Handle modal submissions
  if (interaction.isModalSubmit()) {
    try {
      await handleOrderModalSubmit(interaction);
    } catch (error) {
      console.error('Error handling modal:', error);
    }
    return;
  }

  // Handle slash commands
  if (!interaction.isChatInputCommand()) return;

  const commands = (interaction.client as any).commands as Collection<string, Command>;
  const command = commands.get(interaction.commandName);

  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(`Error executing ${interaction.commandName}:`, error);
    try {
      const reply = { content: 'Something went wrong executing that command.', ephemeral: true };
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(reply);
      } else {
        await interaction.reply(reply);
      }
    } catch {
      // Interaction expired or already handled
    }
  }
}
