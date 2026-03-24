import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  SlashCommandBuilder,
} from 'discord.js';
import { Command } from '../types';

const RSI_BASE = 'https://robertsspaceindustries.com';

export const lookupCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('lookup')
    .setDescription('Star Citizen lookups')
    .addSubcommand((sub) =>
      sub
        .setName('citizen')
        .setDescription('Look up a Star Citizen player')
        .addStringOption((opt) =>
          opt.setName('handle').setDescription('RSI handle / username').setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('org')
        .setDescription('Look up a Star Citizen organization')
        .addStringOption((opt) =>
          opt.setName('sid').setDescription('Organization SID (spectrum ID)').setRequired(true)
        )
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const sub = interaction.options.getSubcommand();
    await interaction.deferReply();

    try {
      if (sub === 'citizen') {
        await lookupCitizen(interaction);
      } else if (sub === 'org') {
        await lookupOrg(interaction);
      }
    } catch (error) {
      console.error('Lookup error:', error);
      await interaction.editReply('Failed to fetch data from RSI.');
    }
  },
};

async function lookupCitizen(interaction: ChatInputCommandInteraction) {
  const handle = interaction.options.getString('handle', true);

  const res = await fetch(`${RSI_BASE}/api/spectrum/search/member/autocomplete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ community_id: '1', text: handle }),
  });
  const json: any = await res.json();

  const members = json.data?.members;
  if (!members || members.length === 0) {
    await interaction.editReply('Player not found.');
    return;
  }

  // Find exact match (case-insensitive)
  const member = members.find(
    (m: any) => m.nickname.toLowerCase() === handle.toLowerCase()
  ) ?? members[0];

  const avatar = member.avatar?.startsWith('http')
    ? member.avatar
    : member.avatar ? `${RSI_BASE}${member.avatar}` : null;

  const badges = member.meta?.badges ?? [];
  const orgBadge = badges.find((b: any) => b.url?.includes('/orgs/'));

  const embed = new EmbedBuilder()
    .setTitle(member.displayname || handle)
    .setURL(`${RSI_BASE}/citizens/${member.nickname}`)
    .setThumbnail(avatar)
    .setColor(0x5865f2)
    .addFields(
      { name: 'Handle', value: member.nickname || handle, inline: true },
      { name: 'Badge', value: badges[0]?.name ?? 'None', inline: true }
    );

  if (orgBadge) {
    embed.addFields(
      { name: 'Organization', value: orgBadge.name, inline: true }
    );
  }

  await interaction.editReply({ embeds: [embed] });
}

async function lookupOrg(interaction: ChatInputCommandInteraction) {
  const sid = interaction.options.getString('sid', true);

  // Use spectrum search to find org members, and scrape basic info
  const res = await fetch(`${RSI_BASE}/api/orgs/getOrgMembers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ symbol: sid, search: '', pagesize: 1, page: 1 }),
  });
  const json: any = await res.json();

  if (!json.success || json.data?.totalrows === undefined) {
    await interaction.editReply('Organization not found.');
    return;
  }

  const memberCount = json.data.totalrows;

  const embed = new EmbedBuilder()
    .setTitle(sid.toUpperCase())
    .setURL(`${RSI_BASE}/orgs/${sid}`)
    .setColor(0x5865f2)
    .addFields(
      { name: 'SID', value: sid.toUpperCase(), inline: true },
      { name: 'Members', value: String(memberCount), inline: true }
    );

  await interaction.editReply({ embeds: [embed] });
}
