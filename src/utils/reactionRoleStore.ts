import { loadJson, saveJson } from './data';

const FILENAME = 'reactionRoles.json';

export interface ReactionRoleMapping {
  messageId: string;
  channelId: string;
  guildId: string;
  emoji: string;
  roleId: string;
}

export function getReactionRoles(): ReactionRoleMapping[] {
  return loadJson<ReactionRoleMapping[]>(FILENAME, []);
}

export function addReactionRole(mapping: ReactionRoleMapping) {
  const mappings = getReactionRoles();
  mappings.push(mapping);
  saveJson(FILENAME, mappings);
}

export function getReactionRolesForMessage(messageId: string): ReactionRoleMapping[] {
  return getReactionRoles().filter((m) => m.messageId === messageId);
}

export function removeReactionRolesForMessage(messageId: string) {
  const mappings = getReactionRoles().filter((m) => m.messageId !== messageId);
  saveJson(FILENAME, mappings);
}
