import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from 'discord.js';
import { Command } from '../types';
import { getAllOrders, getOrder, getQueuePosition, OrderStatus, updateOrderStatus } from '../utils/orderStore';
import { refreshActiveOrdersMessage } from '../utils/orderEmbed';

const VALID_STATUSES: OrderStatus[] = [
  'Placed',
  'Not Accepted',
  'Accepted',
  'Searching',
  'Refining',
  'Pending Delivery',
  'Delivered',
];

export const orderCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('order')
    .setDescription('Manage orders')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((sub) =>
      sub
        .setName('status')
        .setDescription('Update an order status')
        .addIntegerOption((opt) =>
          opt.setName('order_id').setDescription('The order number').setRequired(true)
        )
        .addStringOption((opt) =>
          opt
            .setName('new_status')
            .setDescription('The new status')
            .setRequired(true)
            .addChoices(
              { name: 'Placed', value: 'Placed' },
              { name: 'Not Accepted', value: 'Not Accepted' },
              { name: 'Accepted', value: 'Accepted' },
              { name: 'Searching', value: 'Searching' },
              { name: 'Refining', value: 'Refining' },
              { name: 'Pending Delivery', value: 'Pending Delivery' },
              { name: 'Delivered', value: 'Delivered' },
            )
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('view')
        .setDescription('View details of a specific order')
        .addIntegerOption((opt) =>
          opt.setName('order_id').setDescription('The order number').setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('board')
        .setDescription('View all orders (Placed through Pending Delivery)')
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'status') {
      const orderId = interaction.options.getInteger('order_id', true);
      const newStatus = interaction.options.getString('new_status', true) as OrderStatus;

      const order = updateOrderStatus(orderId, newStatus);
      if (!order) {
        await interaction.reply({ content: `Order #${orderId} not found.`, ephemeral: true });
        return;
      }

      await interaction.reply({
        content: `Order **#${order.id}** updated to **${newStatus}**.`,
        ephemeral: true,
      });

      // DM the customer about the status change
      try {
        const user = await interaction.client.users.fetch(order.customerId);
        let dmMessage = `Your Magpie Industries order **#${order.id}** (${order.items}) has been updated to: **${newStatus}**`;
        if (newStatus === 'Accepted') {
          const position = getQueuePosition(order.id, interaction.guildId!);
          dmMessage += `\nYou are **#${position}** in the queue.`;
        }
        await user.send(dmMessage);
      } catch {
        // User may have DMs closed, that's fine
      }

      // Refresh the active orders board
      await refreshActiveOrdersMessage(interaction.client, interaction.guildId!);

    } else if (sub === 'view') {
      const orderId = interaction.options.getInteger('order_id', true);
      const order = getOrder(orderId);

      if (!order) {
        await interaction.reply({ content: `Order #${orderId} not found.`, ephemeral: true });
        return;
      }

      const embed = new EmbedBuilder()
        .setTitle(`Order #${order.id}`)
        .setColor(0xe67e22)
        .addFields(
          { name: 'Customer', value: order.customerName, inline: true },
          { name: 'Status', value: order.status, inline: true },
          { name: 'Items', value: order.items, inline: false },
          { name: 'Quantity', value: order.quantity, inline: true },
        )
        .setFooter({ text: `Placed ${new Date(order.createdAt).toLocaleDateString()}` });

      if (order.quality) {
        embed.addFields({ name: 'Quality', value: order.quality, inline: true });
      }
      if (order.notes) {
        embed.addFields({ name: 'Notes', value: order.notes, inline: false });
      }

      await interaction.reply({ embeds: [embed], ephemeral: true });

    } else if (sub === 'board') {
      const orders = getAllOrders(interaction.guildId!);

      if (orders.length === 0) {
        await interaction.reply({ content: 'No active orders.', ephemeral: true });
        return;
      }

      const lines = orders.map((o) => {
        const qty = o.quantity ? ` x${o.quantity}` : '';
        const qual = o.quality ? ` [${o.quality}]` : '';
        return `**#${o.id}** — ${o.customerName} — ${o.items}${qty}${qual} · \`${o.status}\``;
      });

      const embed = new EmbedBuilder()
        .setTitle('All Orders (Admin View)')
        .setDescription(lines.join('\n'))
        .setColor(0xe67e22)
        .setFooter({ text: `${orders.length} order(s)` })
        .setTimestamp();

      await interaction.reply({ embeds: [embed], ephemeral: true });
    }
  },
};
