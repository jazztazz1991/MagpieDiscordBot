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

async function resolveGroup(discordId: string, groupName: string | null): Promise<{ id: string; name: string } | { error: string }> {
  const res = await apiCall(`/api/discord-bot/groups/${discordId}`);
  if (!res.success) {
    if (res.error === 'Account not linked') {
      return { error: '❌ Account not linked. Use `/wikelo link <username>` first.' };
    }
    return { error: `❌ ${res.error || 'Failed to fetch groups.'}` };
  }
  const groups = res.data;
  if (groups.length === 0) {
    return { error: '❌ You have no groups. Create one with `/wikelo group create` or join one with `/wikelo group join`.' };
  }
  if (groupName) {
    const match = groups.find((g: any) => g.name.toLowerCase() === groupName.toLowerCase());
    if (!match) {
      const names = groups.map((g: any) => `• ${g.name}`).join('\n');
      return { error: `❌ No group named "${groupName}". Your groups:\n${names}` };
    }
    return { id: match.id, name: match.name };
  }
  if (groups.length === 1) {
    return { id: groups[0].id, name: groups[0].name };
  }
  const names = groups.map((g: any) => `• ${g.name}`).join('\n');
  return { error: `You're in multiple groups — specify which one:\n${names}` };
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
      sub
        .setName('project')
        .setDescription('View details of a specific personal project')
        .addStringOption((opt) =>
          opt.setName('name').setDescription('Project name').setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub.setName('wake').setDescription('Wake up the Magpie Industries site (Render cold start)')
    )
    .addSubcommandGroup((grp) =>
      grp
        .setName('group')
        .setDescription('Manage shared Wikelo project groups')
        .addSubcommand((sub) =>
          sub
            .setName('create')
            .setDescription('Create a new group')
            .addStringOption((opt) =>
              opt.setName('name').setDescription('Group name').setRequired(true)
            )
        )
        .addSubcommand((sub) =>
          sub
            .setName('join')
            .setDescription('Join a group with an invite code')
            .addStringOption((opt) =>
              opt.setName('code').setDescription('Group invite code').setRequired(true)
            )
        )
        .addSubcommand((sub) =>
          sub.setName('list').setDescription('List your groups')
        )
        .addSubcommand((sub) =>
          sub
            .setName('status')
            .setDescription("Show a group's shopping list")
            .addStringOption((opt) =>
              opt.setName('group_name').setDescription('Group name (optional if you only have one group)')
            )
        )
        .addSubcommand((sub) =>
          sub
            .setName('add')
            .setDescription("Add collected items to a group's projects")
            .addStringOption((opt) =>
              opt.setName('item').setDescription('Item name').setRequired(true)
            )
            .addIntegerOption((opt) =>
              opt.setName('quantity').setDescription('How many to add').setRequired(true).setMinValue(1)
            )
            .addStringOption((opt) =>
              opt.setName('group_name').setDescription('Group name (optional if you only have one group)')
            )
        )
        .addSubcommand((sub) =>
          sub
            .setName('info')
            .setDescription('Show group details, members, and invite code')
            .addStringOption((opt) =>
              opt.setName('group_name').setDescription('Group name (optional if you only have one group)')
            )
        )
        .addSubcommand((sub) =>
          sub
            .setName('activity')
            .setDescription('Show recent contribution activity for a group')
            .addStringOption((opt) =>
              opt.setName('group_name').setDescription('Group name (optional if you only have one group)')
            )
            .addIntegerOption((opt) =>
              opt.setName('limit').setDescription('Number of entries to show (max 50)').setMinValue(1).setMaxValue(50)
            )
        )
        .addSubcommand((sub) =>
          sub
            .setName('contributions')
            .setDescription('Show who has contributed what to a group')
            .addStringOption((opt) =>
              opt.setName('group_name').setDescription('Group name (optional if you only have one group)')
            )
        )
        .addSubcommand((sub) =>
          sub
            .setName('leave')
            .setDescription('Leave a group (owners must delete instead)')
            .addStringOption((opt) =>
              opt.setName('group_name').setDescription('Group name (optional if you only have one group)')
            )
        )
        .addSubcommand((sub) =>
          sub
            .setName('project')
            .setDescription('View details of a specific group project')
            .addStringOption((opt) =>
              opt.setName('name').setDescription('Project name').setRequired(true)
            )
            .addStringOption((opt) =>
              opt.setName('group_name').setDescription('Group name (optional if you only have one group)')
            )
        )
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const subgroup = interaction.options.getSubcommandGroup(false);
    const sub = interaction.options.getSubcommand();
    const discordId = interaction.user.id;

    if (!BOT_SECRET) {
      await interaction.reply({ content: '❌ Bot is not configured for Magpie API access.', ephemeral: true });
      return;
    }

    try {
      if (subgroup === 'group') {
        switch (sub) {
          case 'create': {
            const name = interaction.options.getString('name', true);
            await interaction.deferReply();

            const res = await apiCall('/api/discord-bot/groups/create', {
              method: 'POST',
              body: JSON.stringify({ discordId, name }),
            });

            if (!res.success) {
              if (res.error === 'Account not linked') {
                await interaction.editReply('❌ Account not linked. Use `/wikelo link <username>` first.');
              } else {
                await interaction.editReply(`❌ ${res.error || 'Failed to create group.'}`);
              }
              return;
            }

            const embed = new EmbedBuilder()
              .setColor(0x4ade80)
              .setTitle(`Group Created: ${res.data.name}`)
              .setDescription(
                `Share this invite code with your group members:\n\n**\`${res.data.inviteCode}\`**\n\nThey can join with \`/wikelo group join ${res.data.inviteCode}\``
              )
              .setFooter({ text: 'Magpie Industries — Wikelo Tracker' })
              .setTimestamp();

            await interaction.editReply({ embeds: [embed] });
            break;
          }

          case 'join': {
            const code = interaction.options.getString('code', true);
            await interaction.deferReply();

            const res = await apiCall('/api/discord-bot/groups/join', {
              method: 'POST',
              body: JSON.stringify({ discordId, inviteCode: code }),
            });

            if (res.success) {
              await interaction.editReply(`✅ Joined group **${res.data.groupName}**!`);
            } else {
              if (res.error === 'Account not linked') {
                await interaction.editReply('❌ Account not linked. Use `/wikelo link <username>` first.');
              } else {
                await interaction.editReply(`❌ ${res.error || 'Failed to join group. Check the invite code.'}`);
              }
            }
            break;
          }

          case 'list': {
            await interaction.deferReply();

            const res = await apiCall(`/api/discord-bot/groups/${discordId}`);

            if (!res.success) {
              if (res.error === 'Account not linked') {
                await interaction.editReply('❌ Account not linked. Use `/wikelo link <username>` first.');
              } else {
                await interaction.editReply(`❌ ${res.error || 'Failed to fetch groups.'}`);
              }
              return;
            }

            if (res.data.length === 0) {
              await interaction.editReply('No groups yet. Create one with `/wikelo group create` or join one with `/wikelo group join`.');
              return;
            }

            const embed = new EmbedBuilder()
              .setColor(0x5b8def)
              .setTitle('Your Groups')
              .setFooter({ text: 'Magpie Industries — Wikelo Tracker' })
              .setTimestamp();

            for (const g of res.data) {
              embed.addFields({
                name: g.name,
                value: `Members: ${g.memberCount} · Projects: ${g.projectCount} · Code: \`${g.inviteCode}\``,
                inline: false,
              });
            }

            await interaction.editReply({ embeds: [embed] });
            break;
          }

          case 'status': {
            const groupName = interaction.options.getString('group_name');
            await interaction.deferReply();

            const resolved = await resolveGroup(discordId, groupName);
            if ('error' in resolved) {
              await interaction.editReply(resolved.error);
              return;
            }

            const res = await apiCall(`/api/discord-bot/groups/${resolved.id}/shopping-list/${discordId}`);

            if (!res.success) {
              await interaction.editReply(`❌ ${res.error || 'Failed to fetch group status.'}`);
              return;
            }

            const { projectCount, overallProgress, totalRemaining, items } = res.data;

            if (projectCount === 0) {
              await interaction.editReply(`No active projects in **${resolved.name}**.`);
              return;
            }

            const allItems = items
              .filter((i: any) => i.remaining > 0)
              .map((i: any) => `⬜ ${i.name}: **${i.collected}/${i.needed}**`);

            const completedItems = items
              .filter((i: any) => i.remaining <= 0)
              .map((i: any) => `✅ ${i.name}: **${i.collected}/${i.needed}**`);

            const allLines = [...allItems, ...completedItems];
            const header = `**${projectCount}** project${projectCount > 1 ? 's' : ''} · **${totalRemaining}** items remaining\n`;

            const embeds: EmbedBuilder[] = [];
            let current = header + '\n';
            let isFirst = true;

            for (const line of allLines) {
              if (current.length + line.length + 1 > 3900) {
                const embed = new EmbedBuilder()
                  .setColor(0x5b8def)
                  .setDescription(current);
                if (isFirst) {
                  embed.setTitle(`${resolved.name} — ${overallProgress}%`);
                  isFirst = false;
                }
                embeds.push(embed);
                current = '';
              }
              current += line + '\n';
            }

            const lastEmbed = new EmbedBuilder()
              .setColor(0x5b8def)
              .setDescription(current)
              .setFooter({ text: 'Magpie Industries — Wikelo Tracker' })
              .setTimestamp();
            if (isFirst) {
              lastEmbed.setTitle(`${resolved.name} — ${overallProgress}%`);
            }
            embeds.push(lastEmbed);

            await interaction.editReply({ embeds: embeds.slice(0, 10) });
            break;
          }

          case 'add': {
            const item = interaction.options.getString('item', true);
            const quantity = interaction.options.getInteger('quantity', true);
            const groupName = interaction.options.getString('group_name');
            await interaction.deferReply();

            const resolved = await resolveGroup(discordId, groupName);
            if ('error' in resolved) {
              await interaction.editReply(resolved.error);
              return;
            }

            const res = await apiCall(`/api/discord-bot/groups/${resolved.id}/add-items`, {
              method: 'POST',
              body: JSON.stringify({ discordId, itemName: item, quantity }),
            });

            if (!res.success) {
              await interaction.editReply(`❌ ${res.error || 'Failed to add items.'}`);
              return;
            }

            const { updated, totalAdded, updates } = res.data;
            if (updated === 0) {
              await interaction.editReply(`No projects in **${resolved.name}** need **${item}**.`);
              return;
            }

            const lines = updates.map(
              (u: any) => `**${u.projectName}**: ${u.itemName} ${u.oldCount} → ${u.newCount}`
            );

            const embed = new EmbedBuilder()
              .setColor(0x4ade80)
              .setTitle(`Added ${totalAdded}x ${item} to ${resolved.name}`)
              .setDescription(lines.join('\n'))
              .setFooter({ text: 'Magpie Industries — Wikelo Tracker' })
              .setTimestamp();

            await interaction.editReply({ embeds: [embed] });
            break;
          }

          case 'info': {
            const groupName = interaction.options.getString('group_name');
            await interaction.deferReply();

            const resolved = await resolveGroup(discordId, groupName);
            if ('error' in resolved) {
              await interaction.editReply(resolved.error);
              return;
            }

            const res = await apiCall(`/api/discord-bot/groups/${resolved.id}/detail/${discordId}`);

            if (!res.success) {
              await interaction.editReply(`❌ ${res.error || 'Failed to fetch group details.'}`);
              return;
            }

            const { name, inviteCode, ownerName, memberCount, members, projects } = res.data;
            const memberLines = members
              .map((m: any) => `${m.isOwner ? '👑' : '•'} ${m.username}`)
              .join('\n');

            const embed = new EmbedBuilder()
              .setColor(0x5b8def)
              .setTitle(name)
              .setDescription(
                `**Owner:** ${ownerName}\n**Invite Code:** \`${inviteCode}\`\n**Members:** ${memberCount}\n**Projects:** ${projects.length}`
              )
              .addFields({ name: 'Members', value: memberLines || 'No members.', inline: false })
              .setFooter({ text: 'Magpie Industries — Wikelo Tracker' })
              .setTimestamp();

            await interaction.editReply({ embeds: [embed] });
            break;
          }

          case 'activity': {
            const groupName = interaction.options.getString('group_name');
            const limit = interaction.options.getInteger('limit') ?? 20;
            await interaction.deferReply();

            const resolved = await resolveGroup(discordId, groupName);
            if ('error' in resolved) {
              await interaction.editReply(resolved.error);
              return;
            }

            const res = await apiCall(`/api/discord-bot/groups/${resolved.id}/log/${discordId}?limit=${limit}`);

            if (!res.success) {
              await interaction.editReply(`❌ ${res.error || 'Failed to fetch activity.'}`);
              return;
            }

            if (res.data.length === 0) {
              await interaction.editReply(`No activity in **${resolved.name}** yet.`);
              return;
            }

            const lines = res.data.map((entry: any) => {
              const unix = Math.floor(new Date(entry.createdAt).getTime() / 1000);
              const sign = entry.delta > 0 ? '+' : '';
              return `<t:${unix}:R> **${entry.username}** ${sign}${entry.delta} ${entry.itemName} → ${entry.projectName} (now ${entry.newTotal})`;
            });

            const embed = new EmbedBuilder()
              .setColor(0x5b8def)
              .setTitle(`Activity — ${resolved.name}`)
              .setDescription(lines.join('\n').slice(0, 4000))
              .setFooter({ text: 'Magpie Industries — Wikelo Tracker' })
              .setTimestamp();

            await interaction.editReply({ embeds: [embed] });
            break;
          }

          case 'contributions': {
            const groupName = interaction.options.getString('group_name');
            await interaction.deferReply();

            const resolved = await resolveGroup(discordId, groupName);
            if ('error' in resolved) {
              await interaction.editReply(resolved.error);
              return;
            }

            const res = await apiCall(`/api/discord-bot/groups/${resolved.id}/contributions/${discordId}`);

            if (!res.success) {
              await interaction.editReply(`❌ ${res.error || 'Failed to fetch contributions.'}`);
              return;
            }

            const { members } = res.data;
            if (!members || members.length === 0) {
              await interaction.editReply(`No contributions in **${resolved.name}** yet.`);
              return;
            }

            const embeds: EmbedBuilder[] = [];
            let current = new EmbedBuilder()
              .setColor(0x5b8def)
              .setTitle(`Contributions — ${resolved.name}`);
            let fieldCount = 0;

            for (const member of members) {
              if (member.items.length === 0) continue;
              const value = member.items
                .map((i: any) => `${i.itemName}: **${i.netTotal}**`)
                .join('\n')
                .slice(0, 1024);

              if (fieldCount >= 25) {
                embeds.push(current);
                current = new EmbedBuilder().setColor(0x5b8def);
                fieldCount = 0;
              }
              current.addFields({ name: member.username, value, inline: true });
              fieldCount++;
            }

            current.setFooter({ text: 'Magpie Industries — Wikelo Tracker' }).setTimestamp();
            embeds.push(current);

            await interaction.editReply({ embeds: embeds.slice(0, 10) });
            break;
          }

          case 'leave': {
            const groupName = interaction.options.getString('group_name');
            await interaction.deferReply({ ephemeral: true });

            const resolved = await resolveGroup(discordId, groupName);
            if ('error' in resolved) {
              await interaction.editReply(resolved.error);
              return;
            }

            const res = await apiCall(`/api/discord-bot/groups/${resolved.id}/leave`, {
              method: 'POST',
              body: JSON.stringify({ discordId }),
            });

            if (res.success) {
              await interaction.editReply(`✅ Left group **${res.data.groupName}**.`);
            } else {
              await interaction.editReply(`❌ ${res.error || 'Failed to leave group.'}`);
            }
            break;
          }

          case 'project': {
            const projectName = interaction.options.getString('name', true);
            const groupName = interaction.options.getString('group_name');
            await interaction.deferReply();

            const resolved = await resolveGroup(discordId, groupName);
            if ('error' in resolved) {
              await interaction.editReply(resolved.error);
              return;
            }

            const res = await apiCall(`/api/discord-bot/groups/${resolved.id}/detail/${discordId}`);

            if (!res.success) {
              await interaction.editReply(`❌ ${res.error || 'Failed to fetch group details.'}`);
              return;
            }

            const project = res.data.projects.find(
              (p: any) => p.name.toLowerCase() === projectName.toLowerCase()
            );

            if (!project) {
              const available = res.data.projects.map((p: any) => `• ${p.name}`).join('\n');
              await interaction.editReply(
                `❌ No project named "${projectName}" in **${resolved.name}**.${available ? `\n\nAvailable projects:\n${available}` : ''}`
              );
              return;
            }

            const materialLines = project.materials.map((m: any) => {
              const done = m.collected >= m.required;
              return `${done ? '✅' : '⬜'} ${m.itemName}: **${m.collected}/${m.required}**`;
            });

            const embed = new EmbedBuilder()
              .setColor(0x5b8def)
              .setTitle(`${project.name} — ${project.progress}%`)
              .setDescription(
                `Status: \`${project.status}\`\nGroup: **${resolved.name}**\n\n${materialLines.join('\n').slice(0, 3900)}`
              )
              .setFooter({ text: 'Magpie Industries — Wikelo Tracker' })
              .setTimestamp();

            await interaction.editReply({ embeds: [embed] });
            break;
          }
        }
        return;
      }

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

        case 'project': {
          const projectName = interaction.options.getString('name', true);
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

          const project = res.data.find(
            (p: any) => p.name.toLowerCase() === projectName.toLowerCase()
          );

          if (!project) {
            const available = res.data.map((p: any) => `• ${p.name}`).join('\n');
            await interaction.editReply(
              `❌ No personal project named "${projectName}".${available ? `\n\nYour projects:\n${available}` : ''}`
            );
            return;
          }

          const materialLines = project.materials.map((m: any) => {
            const done = m.collected >= m.required;
            return `${done ? '✅' : '⬜'} ${m.itemName}: **${m.collected}/${m.required}**`;
          });

          const embed = new EmbedBuilder()
            .setColor(0x5b8def)
            .setTitle(`${project.name} — ${project.progress}%`)
            .setDescription(materialLines.join('\n').slice(0, 3900) || 'No materials tracked.')
            .setFooter({ text: 'Magpie Industries — Wikelo Tracker' })
            .setTimestamp();

          await interaction.editReply({ embeds: [embed] });
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
