import { loadJson, saveJson } from './data';

const FILENAME = 'events.json';

export interface OrgEvent {
  id: string;
  name: string;
  description: string;
  dateTime: string; // ISO string
  createdBy: string;
  channelId: string;
  guildId: string;
}

export function getEvents(): OrgEvent[] {
  return loadJson<OrgEvent[]>(FILENAME, []);
}

export function addEvent(event: OrgEvent) {
  const events = getEvents();
  events.push(event);
  saveJson(FILENAME, events);
}

export function removeEvent(id: string) {
  const events = getEvents().filter((e) => e.id !== id);
  saveJson(FILENAME, events);
}

export function getUpcomingEvents(guildId: string): OrgEvent[] {
  const now = new Date().toISOString();
  return getEvents()
    .filter((e) => e.guildId === guildId && e.dateTime > now)
    .sort((a, b) => a.dateTime.localeCompare(b.dateTime));
}
