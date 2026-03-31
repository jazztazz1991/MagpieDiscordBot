import {
  ActionRowBuilder,
  ButtonInteraction,
  ModalBuilder,
  ModalSubmitInteraction,
  TextInputBuilder,
  TextInputStyle,
} from 'discord.js';
import { counterOrder, createOrder, getOrder, getQueuePosition, updateOrderStatus } from '../utils/orderStore';
import { refreshActiveOrdersMessage } from '../utils/orderEmbed';

export async function handleOrderButton(interaction: ButtonInteraction) {
  const id = interaction.customId;

  if (id === 'order_place') {
    return handlePlaceOrderButton(interaction);
  }

  if (id.startsWith('quote_accept_')) {
    const orderId = parseInt(id.replace('quote_accept_', ''), 10);
    return handleQuoteAccept(interaction, orderId);
  }

  if (id.startsWith('quote_deny_')) {
    const orderId = parseInt(id.replace('quote_deny_', ''), 10);
    return handleQuoteDeny(interaction, orderId);
  }

  if (id.startsWith('quote_counter_')) {
    const orderId = parseInt(id.replace('quote_counter_', ''), 10);
    return handleQuoteCounter(interaction, orderId);
  }
}

async function handlePlaceOrderButton(interaction: ButtonInteraction) {
  const modal = new ModalBuilder()
    .setCustomId('order_modal')
    .setTitle('Place an Order');

  const customerName = new TextInputBuilder()
    .setCustomId('customer_name')
    .setLabel('Your Name / RSI Handle')
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(100);

  const items = new TextInputBuilder()
    .setCustomId('items')
    .setLabel('Item(s) Requested')
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setPlaceholder('e.g. Quantanium, Laranite, Medical Supplies')
    .setMaxLength(200);

  const quantity = new TextInputBuilder()
    .setCustomId('quantity')
    .setLabel('Quantity')
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setPlaceholder('e.g. 32 SCU, 100 units')
    .setMaxLength(50);

  const quality = new TextInputBuilder()
    .setCustomId('quality')
    .setLabel('Quality (if applicable)')
    .setStyle(TextInputStyle.Short)
    .setRequired(false)
    .setPlaceholder('e.g. Grade A, Raw, Refined')
    .setMaxLength(50);

  const notes = new TextInputBuilder()
    .setCustomId('notes')
    .setLabel('Additional Notes')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(false)
    .setPlaceholder('Delivery location, deadline, special instructions...')
    .setMaxLength(500);

  modal.addComponents(
    new ActionRowBuilder<TextInputBuilder>().addComponents(customerName),
    new ActionRowBuilder<TextInputBuilder>().addComponents(items),
    new ActionRowBuilder<TextInputBuilder>().addComponents(quantity),
    new ActionRowBuilder<TextInputBuilder>().addComponents(quality),
    new ActionRowBuilder<TextInputBuilder>().addComponents(notes),
  );

  await interaction.showModal(modal);
}

async function handleQuoteAccept(interaction: ButtonInteraction, orderId: number) {
  const order = getOrder(orderId);
  if (!order) {
    await interaction.reply({ content: 'Order not found.', ephemeral: true });
    return;
  }

  const updated = updateOrderStatus(orderId, 'Accepted');
  if (!updated) return;

  const position = getQueuePosition(orderId, order.guildId);

  // Disable the buttons on the message
  await interaction.update({
    content: `You accepted the quote of **${order.quotedPrice}** for order **#${order.id}**.\nYou are **#${position}** in the queue.`,
    embeds: [],
    components: [],
  });

  // Notify the admin who quoted
  if (order.quotedBy) {
    try {
      const admin = await interaction.client.users.fetch(order.quotedBy);
      await admin.send(
        `Order **#${order.id}** (${order.items}) — customer **${order.customerName}** has **accepted** your quote of **${order.quotedPrice}**.`
      );
    } catch {
      // Admin DMs closed
    }
  }

  // Refresh board
  const guild = interaction.client.guilds.cache.find((g) => g.id === order.guildId);
  if (guild) {
    await refreshActiveOrdersMessage(interaction.client, order.guildId);
  }
}

async function handleQuoteDeny(interaction: ButtonInteraction, orderId: number) {
  const order = getOrder(orderId);
  if (!order) {
    await interaction.reply({ content: 'Order not found.', ephemeral: true });
    return;
  }

  updateOrderStatus(orderId, 'Not Accepted');

  await interaction.update({
    content: `You denied the quote for order **#${order.id}**. The order has been cancelled.`,
    embeds: [],
    components: [],
  });

  // Notify the admin
  if (order.quotedBy) {
    try {
      const admin = await interaction.client.users.fetch(order.quotedBy);
      await admin.send(
        `Order **#${order.id}** (${order.items}) — customer **${order.customerName}** has **denied** your quote of **${order.quotedPrice}**.`
      );
    } catch {
      // Admin DMs closed
    }
  }

  await refreshActiveOrdersMessage(interaction.client, order.guildId);
}

async function handleQuoteCounter(interaction: ButtonInteraction, orderId: number) {
  const modal = new ModalBuilder()
    .setCustomId(`counter_modal_${orderId}`)
    .setTitle(`Counter Offer — Order #${orderId}`);

  const counterPrice = new TextInputBuilder()
    .setCustomId('counter_price')
    .setLabel('Your counter offer')
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setPlaceholder('e.g. 40,000 aUEC')
    .setMaxLength(100);

  modal.addComponents(
    new ActionRowBuilder<TextInputBuilder>().addComponents(counterPrice),
  );

  await interaction.showModal(modal);
}

export async function handleOrderModalSubmit(interaction: ModalSubmitInteraction) {
  const id = interaction.customId;

  if (id === 'order_modal') {
    return handleNewOrderSubmit(interaction);
  }

  if (id.startsWith('counter_modal_')) {
    const orderId = parseInt(id.replace('counter_modal_', ''), 10);
    return handleCounterSubmit(interaction, orderId);
  }
}

async function handleNewOrderSubmit(interaction: ModalSubmitInteraction) {
  const customerName = interaction.fields.getTextInputValue('customer_name');
  const items = interaction.fields.getTextInputValue('items');
  const quantity = interaction.fields.getTextInputValue('quantity');
  const quality = interaction.fields.getTextInputValue('quality') || '';
  const notes = interaction.fields.getTextInputValue('notes') || '';

  const order = createOrder({
    customerName,
    customerId: interaction.user.id,
    items,
    quantity,
    quality,
    notes,
    guildId: interaction.guildId!,
  });

  await interaction.reply({
    content: `Order **#${order.id}** placed! You'll receive a DM when the status changes.\n\n` +
      `**Items:** ${items}\n**Quantity:** ${quantity}` +
      (quality ? `\n**Quality:** ${quality}` : '') +
      (notes ? `\n**Notes:** ${notes}` : ''),
    ephemeral: true,
  });

  await refreshActiveOrdersMessage(interaction.client, interaction.guildId!);
}

async function handleCounterSubmit(interaction: ModalSubmitInteraction, orderId: number) {
  const price = interaction.fields.getTextInputValue('counter_price');

  const order = counterOrder(orderId, price);
  if (!order) {
    await interaction.reply({ content: 'Order not found.', ephemeral: true });
    return;
  }

  await interaction.reply({
    content: `Counter offer of **${price}** sent for order **#${order.id}**. Waiting for Magpie Industries to respond.`,
    ephemeral: true,
  });

  // Notify the admin who quoted
  if (order.quotedBy) {
    try {
      const admin = await interaction.client.users.fetch(order.quotedBy);
      await admin.send(
        `Order **#${order.id}** (${order.items}) — customer **${order.customerName}** has **countered** your quote of **${order.quotedPrice}** with **${price}**.\n` +
        `Use \`/order quote ${order.id} <new_price>\` to re-quote or \`/order status ${order.id} Not Accepted\` to deny.`
      );
    } catch {
      // Admin DMs closed
    }
  }

  await refreshActiveOrdersMessage(interaction.client, order.guildId);
}
