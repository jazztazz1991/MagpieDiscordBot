import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from 'discord.js';
import { Command } from '../types';
import { addReactionRole } from '../utils/reactionRoleStore';

const ROLE_MAPPINGS = [
  // Industrial Operations
  { emoji: '\u{1F4E6}', name: 'Boxed Shiny Movements' },
  { emoji: '\u26CF\uFE0F', name: 'New Shiny Retrieval' },
  { emoji: '\u{1F3D7}\uFE0F', name: 'Rusty Shiny Retrieval & Polish' },
  { emoji: '\u2604\uFE0F', name: 'BIG SHINY NEED MORE SHINY SHOOTERS' },
  // Tactical & Security
  { emoji: '\u{1F52B}', name: 'Shiny Ground-Keepers' },
  { emoji: '\u2694\uFE0F', name: 'The Raptor-Wing' },
  { emoji: '\u{1F3E5}', name: 'Broken Wing Rescue' },
  { emoji: '\u{1F6F0}\uFE0F', name: 'Space Shiny Retrieval' },
  { emoji: '\u{1F48E}', name: 'Onyx' },
  // The Crayon Hoard
  { emoji: '\u{1F535}', name: 'Blue Crayon' },
  { emoji: '\u{1F7E2}', name: 'Green Crayon' },
  { emoji: '\u{1F7E1}', name: 'Yellow Crayon' },
  { emoji: '\u{1F534}', name: 'Red Crayon' },
];

export const nestPingsCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('nestpings')
    .setDescription('Set up the Nest Pings reaction role message')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),

  async execute(interaction: ChatInputCommandInteraction) {
    const guild = interaction.guild;
    if (!guild) return;

    await interaction.deferReply({ ephemeral: true });

    // Create roles that don't already exist
    const roleMap = new Map<string, string>(); // emoji -> roleId
    for (const mapping of ROLE_MAPPINGS) {
      let role = guild.roles.cache.find((r) => r.name === mapping.name);
      if (!role) {
        role = await guild.roles.create({
          name: mapping.name,
          mentionable: true,
          reason: 'Nest Pings setup',
        });
      }
      roleMap.set(mapping.emoji, role.id);
    }

    // Build the embed
    const embed = new EmbedBuilder()
      .setTitle('The Nest Pings')
      .setDescription(
        'Select the reactions below to claim your roles and receive pings for specific operations. Choose the "shiny" that matches your flight path.' +
        '\n\n' +
        '**Industrial Operations**\n' +
        '\u{1F4E6}  Boxed Shiny Movements (Cargo Runs)\n' +
        '\u26CF\uFE0F  New Shiny Retrieval (Mining Runs)\n' +
        '\u{1F3D7}\uFE0F  Rusty Shiny Retrieval & Polish (Salvage Runs)\n' +
        '\u2604\uFE0F  BIG SHINY NEED MORE SHINY SHOOTERS (Large Scale Mining/Orion Ops)\n' +
        '\n' +
        '**Tactical & Security**\n' +
        '\u{1F52B}  Shiny Ground-Keepers (FPS / Ground Combat)\n' +
        '\u2694\uFE0F  The Raptor-Wing (Ship Combat)\n' +
        '\u{1F3E5}  Broken Wing Rescue (Search & Rescue)\n' +
        '\u{1F6F0}\uFE0F  Space Shiny Retrieval (EVA / Satellite Ops)\n' +
        '\u{1F48E}  Onyx (Onyx Facility Ops)\n' +
        '\n' +
        '**The Crayon Hoard**\n' +
        '\u{1F535}  Blue Crayon\n' +
        '\u{1F7E2}  Green Crayon\n' +
        '\u{1F7E1}  Yellow Crayon\n' +
        '\u{1F534}  Red Crayon (Secret Squirrel)\n' +
        '\n' +
        'React to this message to equip your roles!'
      )
      .setColor(0x5865f2)
      .setFooter({ text: 'Magpie Industries' });

    const channel = interaction.channel;
    if (!channel || !('send' in channel)) return;

    const message = await channel.send({ embeds: [embed] });

    // Add reactions and save mappings
    for (const mapping of ROLE_MAPPINGS) {
      await message.react(mapping.emoji);
      addReactionRole({
        messageId: message.id,
        channelId: message.channel.id,
        guildId: guild.id,
        emoji: mapping.emoji,
        roleId: roleMap.get(mapping.emoji)!,
      });
    }

    await interaction.editReply('Nest Pings message created and all 13 roles are set up!');
  },
};
