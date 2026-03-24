import { Client } from 'discord.js';

export function handleReady(client: Client<true>) {
  console.log(`Logged in as ${client.user.tag}`);
  client.user.setActivity('Magpie Industries | /help');
}
