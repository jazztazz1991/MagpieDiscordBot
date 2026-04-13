import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  EmbedBuilder,
} from 'discord.js';
import { Command } from '../types';

// Magpie Industries API URL — set in .env
const API_URL = process.env.MAGPIE_API_URL || 'https://magpie-api.onrender.com';
const BOT_SECRET = process.env.MAGPIE_BOT_SECRET || '';

async function apiCall(path: string, options?: RequestInit): Promise<any> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bot ${BOT_SECRET}`,
      ...options?.headers,
    },
  });
  return res.json();
}

export const wikeloCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('wikelo')
    .setDescription('Manage your Wikelo contract tracker')
    .addSubcommand((sub) =>
      sub
        .setName('link')
        .setDescription('Link your Discord account to your Magpie Industries account')
        .addStringOption((opt) =>
          opt.setName('username').setDescription('Your Magpie Industries username').setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('add')
        .setDescription('Add collected items to your active projects')
        .addStringOption((opt) =>
          opt.setName('item').setDescription('Item name (e.g., "Wikelo Favor", "Carinite")').setRequired(true)
        )
        .addIntegerOption((opt) =>
          opt.setName('quantity').setDescription('How many to add').setRequired(true).setMinValue(1)
        )
    )
    .addSubcommand((sub) =>
      sub.setName('status').setDescription('Show your shopping list summary')
    )
    .addSubcommand((sub) =>
      sub.setName('projects').setDescription('List your active Wikelo projects')
    )
    .addSubcommand((sub) =>
      sub.setName('wake').setDescription('Wake up the Magpie Industries site (Render cold start)')
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const sub = interaction.options.getSubcommand();
    const discordId = interaction.user.id;

    if (!BOT_SECRET) {
      await interaction.reply({ content: '❌ Bot is not configured for Magpie API access.', ephemeral: true });
      return;
    }

    try {
      switch (sub) {
        case 'link': {
          const username = interaction.options.getString('username', true);
          await interaction.deferReply({ ephemeral: true });

          const res = await apiCall('/api/discord-bot/link', {
            method: 'POST',
            body: JSON.stringify({ discordId, username }),
          });

          if (res.success) {
            await interaction.editReply(`✅ Linked to Magpie account **${res.data.username}**. You can now use \`/wikelo add\` and \`/wikelo status\`.`);
          } else {
            await interaction.editReply(`❌ ${res.error || 'Failed to link account. Make sure the username is correct.'}`);
          }
          break;
        }

        case 'add': {
          const item = interaction.options.getString('item', true);
          const quantity = interaction.options.getInteger('quantity', true);
          await interaction.deferReply();

          const res = await apiCall('/api/discord-bot/add-items', {
            method: 'POST',
            body: JSON.stringify({ discordId, itemName: item, quantity }),
          });

          if (!res.success) {
            if (res.error === 'Account not linked') {
              await interaction.editReply('❌ Account not linked. Use `/wikelo link <username>` first.');
            } else {
              await interaction.editReply(`❌ ${res.error || 'Failed to add items.'}`);
            }
            return;
          }

          const { updated, totalAdded, updates } = res.data;
          if (updated === 0) {
            await interaction.editReply(`No active projects need **${item}**. Check the item name or create a project on the site.`);
            return;
          }

          const lines = updates.map(
            (u: any) => `**${u.projectName}**: ${u.itemName} ${u.oldCount} → ${u.newCount}`
          );

          const embed = new EmbedBuilder()
            .setColor(0x4ade80)
            .setTitle(`Added ${totalAdded}x ${item}`)
            .setDescription(lines.join('\n'))
            .setFooter({ text: 'Magpie Industries — Wikelo Tracker' })
            .setTimestamp();

          await interaction.editReply({ embeds: [embed] });
          break;
        }

        case 'status': {
          await interaction.deferReply();

          const res = await apiCall(`/api/discord-bot/shopping-list/${discordId}`);

          if (!res.success) {
            if (res.error === 'Account not linked') {
              await interaction.editReply('❌ Account not linked. Use `/wikelo link <username>` first.');
            } else {
              await interaction.editReply(`❌ ${res.error || 'Failed to fetch status.'}`);
            }
            return;
          }

          const { projectCount, overallProgress, totalRemaining, items } = res.data;

          if (projectCount === 0) {
            await interaction.editReply('No active projects. Create one at the Magpie Industries site!');
            return;
          }

          const allItems = items
            .filter((i: any) => i.remaining > 0)
            .map((i: any) => `⬜ ${i.name}: **${i.collected}/${i.needed}**`);

          const completedItems = items
            .filter((i: any) => i.remaining <= 0)
            .map((i: any) => `✅ ${i.name}: **${i.collected}/${i.needed}**`);

          const allLines = [...allItems, ...completedItems];
          const header = `**${projectCount}** active project${projectCount > 1 ? 's' : ''} · **${totalRemaining}** items remaining\n`;

          // Discord embed description max is 4096 chars — split into chunks if needed
          const embeds: EmbedBuilder[] = [];
          let current = header + '\n';
          let isFirst = true;

          for (const line of allLines) {
            if (current.length + line.length + 1 > 3900) {
              const embed = new EmbedBuilder()
                .setColor(0x5b8def)
                .setDescription(current);
              if (isFirst) {
                embed.setTitle(`Shopping List — ${overallProgress}%`);
                isFirst = false;
              }
              embeds.push(embed);
              current = '';
            }
            current += line + '\n';
          }

          // Final embed with remaining content
          const lastEmbed = new EmbedBuilder()
            .setColor(0x5b8def)
            .setDescription(current)
            .setFooter({ text: 'Magpie Industries — Wikelo Tracker' })
            .setTimestamp();
          if (isFirst) {
            lastEmbed.setTitle(`Shopping List — ${overallProgress}%`);
          }
          embeds.push(lastEmbed);

          await interaction.editReply({ embeds: embeds.slice(0, 10) });
          break;
        }

        case 'wake': {
          await interaction.deferReply();
          const start = Date.now();

          const res = await fetch(`${API_URL}/api/health`);
          const elapsed = ((Date.now() - start) / 1000).toFixed(1);

          if (res.ok) {
            await interaction.editReply(`✅ Magpie Industries site is up! (responded in ${elapsed}s)`);
          } else {
            await interaction.editReply(`⚠️ Site responded with status ${res.status} after ${elapsed}s.`);
          }
          break;
        }

        case 'projects': {
          await interaction.deferReply();

          const res = await apiCall(`/api/discord-bot/projects/${discordId}`);

          if (!res.success) {
            if (res.error === 'Account not linked') {
              await interaction.editReply('❌ Account not linked. Use `/wikelo link <username>` first.');
            } else {
              await interaction.editReply(`❌ ${res.error || 'Failed to fetch projects.'}`);
            }
            return;
          }

          if (res.data.length === 0) {
            await interaction.editReply('No active projects. Create one at the Magpie Industries site!');
            return;
          }

          const embed = new EmbedBuilder()
            .setColor(0x5b8def)
            .setTitle('Active Wikelo Projects')
            .setFooter({ text: 'Magpie Industries — Wikelo Tracker' })
            .setTimestamp();

          for (const project of res.data.slice(0, 10)) {
            const remaining = project.materials
              .filter((m: any) => m.collected < m.required)
              .slice(0, 5)
              .map((m: any) => `${m.itemName}: ${m.collected}/${m.required}`)
              .join(', ');

            embed.addFields({
              name: `${project.name} — ${project.progress}%`,
              value: remaining || 'All materials collected!',
              inline: false,
            });
          }

          await interaction.editReply({ embeds: [embed] });
          break;
        }
      }
    } catch (err) {
      console.error('Wikelo command error:', err);
      const reply = interaction.deferred
        ? interaction.editReply('❌ Failed to connect to Magpie Industries API.')
        : interaction.reply({ content: '❌ Failed to connect to Magpie Industries API.', ephemeral: true });
      await reply;
    }
  },
};
