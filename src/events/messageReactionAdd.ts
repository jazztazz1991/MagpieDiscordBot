import { MessageReaction, PartialMessageReaction, User, PartialUser } from 'discord.js';
import { getReactionRolesForMessage } from '../utils/reactionRoleStore';

export async function handleReactionAdd(
  reaction: MessageReaction | PartialMessageReaction,
  user: User | PartialUser
) {
  if (user.bot) return;

  // Fetch partial reaction if needed
  if (reaction.partial) {
    try {
      await reaction.fetch();
    } catch {
      return;
    }
  }

  const mappings = getReactionRolesForMessage(reaction.message.id);
  if (mappings.length === 0) return;

  const emoji = reaction.emoji.name ?? reaction.emoji.id;
  const mapping = mappings.find(
    (m) => m.emoji === emoji || m.emoji === `<:${reaction.emoji.name}:${reaction.emoji.id}>`
  );
  if (!mapping) return;

  const guild = reaction.message.guild;
  if (!guild) return;

  try {
    const member = await guild.members.fetch(user.id);
    await member.roles.add(mapping.roleId);
  } catch (error) {
    console.error('Failed to add role:', error);
  }
}
