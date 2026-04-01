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
    const itemsSummary = o.items.split('\n').map((line) => `  ${line.trim()}`).join('\n');
    return `**#${o.id}** · \`${o.status}\`\n${itemsSummary}`;
  });

  embed.setDescription(lines.join('\n\n'));
  return embed;
}

/** Fire-and-forget refresh — does not block the caller */
export function refreshActiveOrdersMessage(client: Client, guildId: string) {
  const info = getActiveOrdersMessageInfo();
  if (!info.channelId || !info.messageId) return;

  // Run in background, don't block
  doRefresh(client, guildId, info.channelId, info.messageId).catch((error) => {
    console.error('Failed to refresh active orders message:', error);
  });
}

async function doRefresh(client: Client, guildId: string, channelId: string, messageId: string) {
  const channel = client.channels.cache.get(channelId) as TextChannel | undefined
    ?? await client.channels.fetch(channelId) as TextChannel | null;
  if (!channel || !(channel instanceof TextChannel)) return;

  const message = await channel.messages.fetch(messageId);
  const embed = buildActiveOrdersEmbed(guildId);
  await message.edit({ embeds: [embed] });
}

export async function createActiveOrdersMessage(channel: TextChannel, guildId: string) {
  const embed = buildActiveOrdersEmbed(guildId);
  const message = await channel.send({ embeds: [embed] });
  setActiveOrdersMessageInfo(message.id, channel.id);
  return message;
}
