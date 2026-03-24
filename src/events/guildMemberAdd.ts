import { EmbedBuilder, GuildMember } from 'discord.js';

export async function handleGuildMemberAdd(member: GuildMember) {
  // Find the system channel or first available text channel
  const channel = member.guild.systemChannel;
  if (!channel) return;

  const embed = new EmbedBuilder()
    .setTitle('Welcome to Magpie Industries!')
    .setDescription(
      `Hey ${member}, welcome aboard! We're glad to have you in the org.\n\n` +
      `Make sure to check out the roles channel to pick your division.`
    )
    .setThumbnail(member.user.displayAvatarURL())
    .setColor(0x5865f2)
    .setFooter({ text: `Member #${member.guild.memberCount}` })
    .setTimestamp();

  await channel.send({ embeds: [embed] });
}
