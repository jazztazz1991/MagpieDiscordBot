import { Client, EmbedBuilder, TextChannel } from 'discord.js';
import { getActiveOrders, getActiveOrdersMessageInfo, setActiveOrdersMessageInfo } from './orderStore';

export function buildActiveOrdersEmbed(guildId: string): EmbedBuilder {
  const orders = getActiveOrders(guildId);

  const embed = new EmbedBuilder()
    .setTitle('Active Orders')
    .setColor(0xe67e22)
    .setFooter({ text: 'Magpie Industries Order Board' })
    .setTimestamp();

  if (orders.length === 0) {
    embed.setDescription('No active orders.');
    return embed;
  }

  const lines = orders.map((o) => {
    const qty = o.quantity ? ` x${o.quantity}` : '';
    const qual = o.quality ? ` [${o.quality}]` : '';
    return `**#${o.id}** — ${o.items}${qty}${qual} ・ \`${o.status}\``;
  });

  embed.setDescription(lines.join('\n'));
  return embed;
}

export async function refreshActiveOrdersMessage(client: Client, guildId: string) {
  const info = getActiveOrdersMessageInfo();
  if (!info.channelId || !info.messageId) return;

  try {
    const channel = await client.channels.fetch(info.channelId);
    if (!channel || !(channel instanceof TextChannel)) return;

    const message = await channel.messages.fetch(info.messageId);
    const embed = buildActiveOrdersEmbed(guildId);
    await message.edit({ embeds: [embed] });
  } catch (error) {
    console.error('Failed to refresh active orders message:', error);
  }
}

export async function createActiveOrdersMessage(channel: TextChannel, guildId: string) {
  const embed = buildActiveOrdersEmbed(guildId);
  const message = await channel.send({ embeds: [embed] });
  setActiveOrdersMessageInfo(message.id, channel.id);
  return message;
}
