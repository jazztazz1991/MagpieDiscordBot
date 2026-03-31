import {
  ActionRowBuilder,
  ButtonInteraction,
  ModalBuilder,
  ModalSubmitInteraction,
  TextInputBuilder,
  TextInputStyle,
} from 'discord.js';
import { createOrder } from '../utils/orderStore';
import { refreshActiveOrdersMessage } from '../utils/orderEmbed';

export async function handleOrderButton(interaction: ButtonInteraction) {
  if (interaction.customId !== 'order_place') return;

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

export async function handleOrderModalSubmit(interaction: ModalSubmitInteraction) {
  if (interaction.customId !== 'order_modal') return;

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

  // Refresh the active orders board
  await refreshActiveOrdersMessage(interaction.client, interaction.guildId!);
}
