import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  SlashCommandBuilder,
} from 'discord.js';
import { Command } from '../types';

const NUMBER_EMOJIS = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];

export const pollCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('poll')
    .setDescription('Create a poll')
    .addStringOption((opt) =>
      opt.setName('question').setDescription('The poll question').setRequired(true)
    )
    .addStringOption((opt) =>
      opt
        .setName('options')
        .setDescription('Poll options separated by | (e.g. "Option A | Option B | Option C")')
        .setRequired(true)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const question = interaction.options.getString('question', true);
    const optionsRaw = interaction.options.getString('options', true);
    const options = optionsRaw.split('|').map((o) => o.trim()).filter(Boolean);

    if (options.length < 2 || options.length > 10) {
      await interaction.reply({ content: 'Provide between 2 and 10 options.', ephemeral: true });
      return;
    }

    const description = options.map((opt, i) => `${NUMBER_EMOJIS[i]}  ${opt}`).join('\n\n');

    const embed = new EmbedBuilder()
      .setTitle(`📊  ${question}`)
      .setDescription(description)
      .setColor(0x5865f2)
      .setFooter({ text: `Poll by ${interaction.user.tag}` })
      .setTimestamp();

    const channel = interaction.channel;
    if (!channel || !('send' in channel)) return;
    const message = await channel.send({ embeds: [embed] });

    for (let i = 0; i < options.length; i++) {
      await message.react(NUMBER_EMOJIS[i]);
    }

    await interaction.reply({ content: 'Poll created!', ephemeral: true });
  },
};
