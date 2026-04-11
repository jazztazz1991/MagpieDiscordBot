import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from 'discord.js';
import { Command } from '../types';
import { addReactionRole } from '../utils/reactionRoleStore';

const ROLE_MAPPINGS = [
  { emoji: '\u{1F426}', name: 'Citizen - Magpies' },
  { emoji: '\u{1F91D}', name: 'Friend' },
  { emoji: '\u{1F4B0}', name: 'Trader' },
];

export const identityPingsCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('identitypings')
    .setDescription('Set up the identity reaction role message')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),

  async execute(interaction: ChatInputCommandInteraction) {
    const guild = interaction.guild;
    if (!guild) return;

    await interaction.deferReply({ ephemeral: true });

    // Create roles that don't already exist
    const roleMap = new Map<string, string>();
    for (const mapping of ROLE_MAPPINGS) {
      let role = guild.roles.cache.find((r) => r.name === mapping.name);
      if (!role) {
        role = await guild.roles.create({
          name: mapping.name,
          mentionable: true,
          reason: 'Identity Pings setup',
        });
      }
      roleMap.set(mapping.emoji, role.id);
    }

    const embed = new EmbedBuilder()
      .setTitle('Join the Flock')
      .setDescription(
        'React below to let us know who you are. Pick the shiny that fits!\n\n' +
        '\u{1F426}  **Citizen - Magpies** — Full flock member\n' +
        '\u{1F91D}  **Friend** — Friend of the nest\n' +
        '\u{1F4B0}  **Trader** — Here to do business\n' +
        '\n' +
        'React to this message to claim your role!'
      )
      .setColor(0x5865f2)
      .setFooter({ text: 'Magpie Industries' });

    const channel = interaction.channel;
    if (!channel || !('send' in channel)) return;

    const message = await channel.send({ embeds: [embed] });

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

    await interaction.editReply('Identity roles message created!');
  },
};
