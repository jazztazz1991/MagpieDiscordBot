import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from 'discord.js';
import { Command } from '../types';

export const modCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('mod')
    .setDescription('Moderation commands')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addSubcommand((sub) =>
      sub
        .setName('kick')
        .setDescription('Kick a member')
        .addUserOption((opt) => opt.setName('user').setDescription('User to kick').setRequired(true))
        .addStringOption((opt) => opt.setName('reason').setDescription('Reason for kick'))
    )
    .addSubcommand((sub) =>
      sub
        .setName('ban')
        .setDescription('Ban a member')
        .addUserOption((opt) => opt.setName('user').setDescription('User to ban').setRequired(true))
        .addStringOption((opt) => opt.setName('reason').setDescription('Reason for ban'))
    )
    .addSubcommand((sub) =>
      sub
        .setName('timeout')
        .setDescription('Timeout a member')
        .addUserOption((opt) => opt.setName('user').setDescription('User to timeout').setRequired(true))
        .addIntegerOption((opt) =>
          opt
            .setName('minutes')
            .setDescription('Timeout duration in minutes')
            .setRequired(true)
            .setMinValue(1)
            .setMaxValue(40320)
        )
        .addStringOption((opt) => opt.setName('reason').setDescription('Reason for timeout'))
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const sub = interaction.options.getSubcommand();
    const target = interaction.options.getUser('user', true);
    const reason = interaction.options.getString('reason') ?? 'No reason provided';
    const member = await interaction.guild!.members.fetch(target.id).catch(() => null);

    if (!member) {
      await interaction.reply({ content: 'Could not find that member.', ephemeral: true });
      return;
    }

    if (!member.moderatable) {
      await interaction.reply({ content: 'I cannot moderate this user (they may have higher permissions).', ephemeral: true });
      return;
    }

    const embed = new EmbedBuilder().setColor(0xed4245).setTimestamp();

    try {
      if (sub === 'kick') {
        await member.kick(reason);
        embed.setTitle('Member Kicked').setDescription(`**${target.tag}** was kicked.\nReason: ${reason}`);
      } else if (sub === 'ban') {
        await member.ban({ reason });
        embed.setTitle('Member Banned').setDescription(`**${target.tag}** was banned.\nReason: ${reason}`);
      } else if (sub === 'timeout') {
        const minutes = interaction.options.getInteger('minutes', true);
        await member.timeout(minutes * 60 * 1000, reason);
        embed.setTitle('Member Timed Out').setDescription(`**${target.tag}** was timed out for ${minutes} minute(s).\nReason: ${reason}`);
      }
      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error('Moderation error:', error);
      await interaction.reply({ content: 'Failed to execute moderation action.', ephemeral: true });
    }
  },
};
