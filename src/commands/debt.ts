import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from 'discord.js';
import { Command } from '../types';
import { addDebt, getAllDebts, getUserDebt } from '../utils/debtStore';

export const debtCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('debt')
    .setDescription('Manage aUEC debts')
    .addSubcommand((sub) =>
      sub
        .setName('add')
        .setDescription('Add aUEC debt to a user (admin only)')
        .addUserOption((opt) => opt.setName('user').setDescription('The user').setRequired(true))
        .addIntegerOption((opt) => opt.setName('amount').setDescription('aUEC amount to add').setRequired(true))
        .addStringOption((opt) => opt.setName('reason').setDescription('Reason for the debt').setRequired(true))
    )
    .addSubcommand((sub) =>
      sub
        .setName('reduce')
        .setDescription('Reduce aUEC debt from a user (admin only)')
        .addUserOption((opt) => opt.setName('user').setDescription('The user').setRequired(true))
        .addIntegerOption((opt) => opt.setName('amount').setDescription('aUEC amount to reduce').setRequired(true))
        .addStringOption((opt) => opt.setName('reason').setDescription('Reason for the reduction').setRequired(true))
    )
    .addSubcommand((sub) =>
      sub
        .setName('check')
        .setDescription('Check your own aUEC debt balance')
    )
    .addSubcommand((sub) =>
      sub
        .setName('ledger')
        .setDescription('View all outstanding debts (admin only)')
    )
    .addSubcommand((sub) =>
      sub
        .setName('history')
        .setDescription('View all transactions for a user (admin only)')
        .addUserOption((opt) => opt.setName('user').setDescription('The user').setRequired(true))
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'add' || sub === 'reduce') {
      // Admin check
      if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
        await interaction.reply({ content: 'You need Manage Server permission to use this.', ephemeral: true });
        return;
      }

      const target = interaction.options.getUser('user', true);
      const amount = interaction.options.getInteger('amount', true);
      const reason = interaction.options.getString('reason', true);

      if (amount <= 0) {
        await interaction.reply({ content: 'Amount must be a positive number.', ephemeral: true });
        return;
      }

      const actualAmount = sub === 'add' ? amount : -amount;
      const user = addDebt(target.id, target.username, interaction.guildId!, actualAmount, reason, interaction.user.id);

      const action = sub === 'add' ? 'added to' : 'reduced from';
      await interaction.reply({
        content: `**${amount.toLocaleString()} aUEC** ${action} **${target.username}**.\n` +
          `**Reason:** ${reason}\n` +
          `**New balance:** ${user.balance.toLocaleString()} aUEC`,
        ephemeral: true,
      });

    } else if (sub === 'check') {
      const debt = getUserDebt(interaction.user.id, interaction.guildId!);

      if (!debt || debt.balance === 0) {
        await interaction.reply({ content: 'You have no outstanding debt.', ephemeral: true });
        return;
      }

      const recent = debt.ledger.slice(-5).reverse();
      const history = recent.map((e) => {
        const sign = e.amount > 0 ? '+' : '';
        return `${sign}${e.amount.toLocaleString()} aUEC — ${e.reason} (<t:${Math.floor(new Date(e.date).getTime() / 1000)}:R>)`;
      });

      const embed = new EmbedBuilder()
        .setTitle('Your aUEC Debt')
        .setDescription(`**Balance: ${debt.balance.toLocaleString()} aUEC**`)
        .setColor(debt.balance > 0 ? 0xed4245 : 0x57f287)
        .setFooter({ text: 'Magpie Industries' });

      if (history.length > 0) {
        embed.addFields({ name: 'Recent History', value: history.join('\n') });
      }

      await interaction.reply({ embeds: [embed], ephemeral: true });

    } else if (sub === 'ledger') {
      // Admin check
      if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
        await interaction.reply({ content: 'You need Manage Server permission to use this.', ephemeral: true });
        return;
      }

      const debts = getAllDebts(interaction.guildId!);

      if (debts.length === 0) {
        await interaction.reply({ content: 'No outstanding debts.', ephemeral: true });
        return;
      }

      const lines = debts
        .sort((a, b) => b.balance - a.balance)
        .map((d) => `**${d.username}** — ${d.balance.toLocaleString()} aUEC`);

      const total = debts.reduce((sum, d) => sum + d.balance, 0);

      const embed = new EmbedBuilder()
        .setTitle('Outstanding Debts')
        .setDescription(lines.join('\n'))
        .setColor(0xe67e22)
        .setFooter({ text: `Total: ${total.toLocaleString()} aUEC | ${debts.length} user(s)` })
        .setTimestamp();

      await interaction.reply({ embeds: [embed], ephemeral: true });

    } else if (sub === 'history') {
      if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
        await interaction.reply({ content: 'You need Manage Server permission to use this.', ephemeral: true });
        return;
      }

      const target = interaction.options.getUser('user', true);
      const debt = getUserDebt(target.id, interaction.guildId!);

      if (!debt || debt.ledger.length === 0) {
        await interaction.reply({ content: `No transactions found for **${target.username}**.`, ephemeral: true });
        return;
      }

      const lines = debt.ledger.map((e) => {
        const sign = e.amount > 0 ? '+' : '';
        const timestamp = `<t:${Math.floor(new Date(e.date).getTime() / 1000)}:f>`;
        return `${sign}${e.amount.toLocaleString()} aUEC — ${e.reason} — ${timestamp}`;
      });

      // Discord embed description max is 4096 chars, truncate if needed
      let description = lines.join('\n');
      if (description.length > 4000) {
        const truncated = lines.slice(-30);
        description = `*Showing last 30 of ${lines.length} transactions*\n\n` + truncated.join('\n');
      }

      const embed = new EmbedBuilder()
        .setTitle(`Debt History — ${target.username}`)
        .setDescription(description)
        .setColor(debt.balance > 0 ? 0xed4245 : 0x57f287)
        .setFooter({ text: `Balance: ${debt.balance.toLocaleString()} aUEC | ${debt.ledger.length} transaction(s)` })
        .setTimestamp();

      await interaction.reply({ embeds: [embed], ephemeral: true });
    }
  },
};
