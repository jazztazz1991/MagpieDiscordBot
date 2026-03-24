import {
  ChatInputCommandInteraction,
  GuildScheduledEventEntityType,
  GuildScheduledEventPrivacyLevel,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from 'discord.js';
import { Command } from '../types';

export const eventAdminCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('event-admin')
    .setDescription('Create and manage org events')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageEvents)
    .addSubcommand((sub) =>
      sub
        .setName('create')
        .setDescription('Schedule a new Discord event')
        .addStringOption((opt) => opt.setName('name').setDescription('Event name').setRequired(true))
        .addStringOption((opt) =>
          opt.setName('datetime').setDescription('Start date & time (e.g. "2026-03-25 20:00")').setRequired(true)
        )
        .addStringOption((opt) => opt.setName('description').setDescription('Event description'))
        .addStringOption((opt) =>
          opt.setName('end_datetime').setDescription('End date & time (e.g. "2026-03-25 22:00")')
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('cancel')
        .setDescription('Cancel a Discord event')
        .addStringOption((opt) =>
          opt.setName('event_id').setDescription('The Discord event ID to cancel').setRequired(true)
        )
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const sub = interaction.options.getSubcommand();
    const guild = interaction.guild;
    if (!guild) return;

    if (sub === 'create') {
      const name = interaction.options.getString('name', true);
      const datetimeStr = interaction.options.getString('datetime', true);
      const description = interaction.options.getString('description') ?? undefined;
      const endDatetimeStr = interaction.options.getString('end_datetime');

      const startTime = new Date(datetimeStr);
      if (isNaN(startTime.getTime())) {
        await interaction.reply({ content: 'Invalid start date. Use something like `2026-03-25 20:00`.', ephemeral: true });
        return;
      }

      if (startTime.getTime() <= Date.now()) {
        await interaction.reply({ content: 'Event start time must be in the future.', ephemeral: true });
        return;
      }

      let endTime: Date | undefined;
      if (endDatetimeStr) {
        endTime = new Date(endDatetimeStr);
        if (isNaN(endTime.getTime())) {
          await interaction.reply({ content: 'Invalid end date. Use something like `2026-03-25 22:00`.', ephemeral: true });
          return;
        }
      }

      await interaction.deferReply();

      try {
        const event = await guild.scheduledEvents.create({
          name,
          description,
          scheduledStartTime: startTime,
          scheduledEndTime: endTime ?? new Date(startTime.getTime() + 2 * 60 * 60 * 1000),
          privacyLevel: GuildScheduledEventPrivacyLevel.GuildOnly,
          entityType: GuildScheduledEventEntityType.External,
          entityMetadata: { location: 'Star Citizen / Discord' },
        });

        await interaction.editReply(
          `Event created! **${event.name}** — <t:${Math.floor(startTime.getTime() / 1000)}:F>\n${event.url}`
        );
      } catch (error) {
        console.error('Event creation error:', error);
        await interaction.editReply('Failed to create the event. Make sure the bot has Manage Events permission.');
      }

    } else if (sub === 'cancel') {
      const eventId = interaction.options.getString('event_id', true);

      await interaction.deferReply({ ephemeral: true });

      try {
        const event = await guild.scheduledEvents.fetch(eventId);
        await event.delete();
        await interaction.editReply(`Event **${event.name}** has been cancelled.`);
      } catch (error) {
        console.error('Event cancel error:', error);
        await interaction.editReply('Could not find or delete that event. Check the event ID.');
      }
    }
  },
};
