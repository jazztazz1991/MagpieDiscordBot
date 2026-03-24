import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from 'discord.js';
import { Command } from '../types';
import { addReactionRole, removeReactionRolesForMessage } from '../utils/reactionRoleStore';

export const reactionRoleCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('reactionrole')
    .setDescription('Set up reaction roles')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .addSubcommand((sub) =>
      sub
        .setName('create')
        .setDescription('Create a reaction role message')
        .addStringOption((opt) =>
          opt.setName('title').setDescription('Title for the embed').setRequired(true)
        )
        .addStringOption((opt) =>
          opt
            .setName('roles')
            .setDescription('Emoji-role pairs, e.g. "🚀 @Pilot | 🔧 @Engineer | 🛡️ @Marine"')
            .setRequired(true)
        )
        .addStringOption((opt) =>
          opt.setName('description').setDescription('Optional description for the embed')
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('remove')
        .setDescription('Remove a reaction role message by its message ID')
        .addStringOption((opt) =>
          opt.setName('message_id').setDescription('The message ID to remove').setRequired(true)
        )
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'create') {
      await handleCreate(interaction);
    } else if (sub === 'remove') {
      await handleRemove(interaction);
    }
  },
};

async function handleCreate(interaction: ChatInputCommandInteraction) {
  const title = interaction.options.getString('title', true);
  const rolesInput = interaction.options.getString('roles', true);
  const description = interaction.options.getString('description') ?? 'React to get your roles!';

  // Parse "emoji @Role | emoji @Role" format
  const pairs = rolesInput.split('|').map((s) => s.trim());
  const parsed: { emoji: string; roleId: string; roleName: string }[] = [];

  for (const pair of pairs) {
    // Match: emoji (unicode or custom) then a role mention or role ID
    const match = pair.match(/^(.+?)\s+<@&(\d+)>$/);
    if (!match) {
      await interaction.reply({
        content: `Could not parse: \`${pair}\`\nFormat: \`emoji @Role | emoji @Role\``,
        ephemeral: true,
      });
      return;
    }
    const emoji = match[1].trim();
    const roleId = match[2];
    const role = interaction.guild?.roles.cache.get(roleId);
    parsed.push({ emoji, roleId, roleName: role?.name ?? 'Unknown Role' });
  }

  const embed = new EmbedBuilder()
    .setTitle(title)
    .setDescription(
      description +
        '\n\n' +
        parsed.map((p) => `${p.emoji}  —  **${p.roleName}**`).join('\n')
    )
    .setColor(0x5865f2)
    .setFooter({ text: 'Magpie Industries' });

  const channel = interaction.channel;
  if (!channel || !('send' in channel)) return;
  const message = await channel.send({ embeds: [embed] });

  // Add reactions and save mappings
  for (const p of parsed) {
    await message.react(p.emoji);
    addReactionRole({
      messageId: message.id,
      channelId: message.channel.id,
      guildId: interaction.guildId!,
      emoji: p.emoji,
      roleId: p.roleId,
    });
  }

  await interaction.reply({ content: 'Reaction role message created!', ephemeral: true });
}

async function handleRemove(interaction: ChatInputCommandInteraction) {
  const messageId = interaction.options.getString('message_id', true);
  removeReactionRolesForMessage(messageId);
  await interaction.reply({ content: `Removed reaction role mappings for message \`${messageId}\`.`, ephemeral: true });
}
