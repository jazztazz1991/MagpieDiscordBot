import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
  SlashCommandBuilder,
  TextChannel,
} from 'discord.js';
import { Command } from '../types';
import { createActiveOrdersMessage } from '../utils/orderEmbed';

export const orderSetupCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('ordersetup')
    .setDescription('Set up the order system')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((sub) =>
      sub
        .setName('button')
        .setDescription('Post the "Place an Order" button in this channel')
    )
    .addSubcommand((sub) =>
      sub
        .setName('board')
        .setDescription('Post the active orders board in this channel')
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const sub = interaction.options.getSubcommand();
    const channel = interaction.channel;
    if (!channel || !(channel instanceof TextChannel)) return;

    if (sub === 'button') {
      const embed = new EmbedBuilder()
        .setTitle('Magpie Industries — Place an Order')
        .setDescription(
          'Need something hauled, mined, salvaged, or retrieved?\n\n' +
          'Click the button below to submit an order to Magpie Industries. ' +
          'You will be notified via DM when your order status changes.'
        )
        .setColor(0xe67e22)
        .setFooter({ text: 'Magpie Industries' });

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId('order_place')
          .setLabel('Place an Order')
          .setStyle(ButtonStyle.Primary)
      );

      await channel.send({ embeds: [embed], components: [row] });
      await interaction.reply({ content: 'Order button posted!', ephemeral: true });

    } else if (sub === 'board') {
      await createActiveOrdersMessage(channel, interaction.guildId!);
      await interaction.reply({ content: 'Active orders board posted! It will auto-update as orders change.', ephemeral: true });
    }
  },
};
