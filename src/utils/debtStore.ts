import { loadJson, saveJson } from './data';

export interface DebtEntry {
  oderId: string;
  odername: string;
  amount: number; // positive = owes, negative = credit
  reason: string;
  date: string;
  addedBy: string;
}

export interface UserDebt {
  userId: string;
  username: string;
  guildId: string;
  balance: number; // positive = owes aUEC
  ledger: DebtEntry[];
}

interface DebtData {
  debts: UserDebt[];
}

const FILE = 'debts.json';

function load(): DebtData {
  return loadJson<DebtData>(FILE, { debts: [] });
}

function save(data: DebtData) {
  saveJson(FILE, data);
}

function getOrCreateUser(data: DebtData, userId: string, username: string, guildId: string): UserDebt {
  let user = data.debts.find((d) => d.userId === userId && d.guildId === guildId);
  if (!user) {
    user = { userId, username, guildId, balance: 0, ledger: [] };
    data.debts.push(user);
  }
  user.username = username; // Keep username up to date
  return user;
}

export function addDebt(userId: string, username: string, guildId: string, amount: number, reason: string, addedBy: string): UserDebt {
  const data = load();
  const user = getOrCreateUser(data, userId, username, guildId);
  user.balance += amount;
  user.ledger.push({
    oderId: Date.now().toString(36),
    odername: username,
    amount,
    reason,
    date: new Date().toISOString(),
    addedBy,
  });
  save(data);
  return user;
}

export function getUserDebt(userId: string, guildId: string): UserDebt | null {
  const data = load();
  return data.debts.find((d) => d.userId === userId && d.guildId === guildId) ?? null;
}

export function getAllDebts(guildId: string): UserDebt[] {
  const data = load();
  return data.debts.filter((d) => d.guildId === guildId && d.balance !== 0);
}
