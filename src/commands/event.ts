import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  SlashCommandBuilder,
} from 'discord.js';
import { Command } from '../types';

export const eventCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('event')
    .setDescription('View org events')
    .addSubcommand((sub) =>
      sub.setName('list').setDescription('List upcoming events')
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const guild = interaction.guild;
    if (!guild) return;

    await interaction.deferReply();

    const events = await guild.scheduledEvents.fetch();
    const upcoming = events
      .filter((e) => e.scheduledStartTimestamp !== null && e.scheduledStartTimestamp > Date.now())
      .sort((a, b) => (a.scheduledStartTimestamp ?? 0) - (b.scheduledStartTimestamp ?? 0));

    if (upcoming.size === 0) {
      await interaction.editReply('No upcoming events scheduled.');
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle('Upcoming Events')
      .setColor(0x5865f2)
      .setDescription(
        upcoming
          .map(
            (e) =>
              `**${e.name}** (ID: \`${e.id}\`)\n${e.description ?? 'No description'}\n<t:${Math.floor((e.scheduledStartTimestamp ?? 0) / 1000)}:F>`
          )
          .join('\n\n')
      );

    await interaction.editReply({ embeds: [embed] });
  },
};
