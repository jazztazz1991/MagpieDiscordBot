import { loadJson, saveJson } from './data';

export type OrderStatus =
  | 'Placed'
  | 'Quoted'
  | 'Not Accepted'
  | 'Accepted'
  | 'Searching'
  | 'Refining'
  | 'Pending Delivery'
  | 'Delivered'
  | 'Cancelled';

export interface Order {
  id: number;
  customerName: string;
  customerId: string;
  items: string;
  quantity: string;
  quality: string;
  notes: string;
  status: OrderStatus;
  guildId: string;
  createdAt: string;
  quotedPrice: string | null;
  quotedBy: string | null;
  counterPrice: string | null;
}

interface OrderData {
  nextId: number;
  orders: Order[];
  /** Message ID of the running orders embed in #active-orders */
  activeOrdersMessageId: string | null;
  activeOrdersChannelId: string | null;
}

const FILE = 'orders.json';

function load(): OrderData {
  return loadJson<OrderData>(FILE, {
    nextId: 1001,
    orders: [],
    activeOrdersMessageId: null,
    activeOrdersChannelId: null,
  });
}

function save(data: OrderData) {
  saveJson(FILE, data);
}

export function createOrder(order: Omit<Order, 'id' | 'status' | 'createdAt' | 'quotedPrice' | 'quotedBy' | 'counterPrice'>): Order {
  const data = load();
  const newOrder: Order = {
    ...order,
    id: data.nextId,
    status: 'Placed',
    createdAt: new Date().toISOString(),
    quotedPrice: null,
    quotedBy: null,
    counterPrice: null,
  };
  data.nextId++;
  data.orders.push(newOrder);
  save(data);
  return newOrder;
}

export function updateOrderStatus(orderId: number, status: OrderStatus): Order | null {
  const data = load();
  const order = data.orders.find((o) => o.id === orderId);
  if (!order) return null;
  order.status = status;
  save(data);
  return order;
}

export function quoteOrder(orderId: number, price: string, quotedBy: string): Order | null {
  const data = load();
  const order = data.orders.find((o) => o.id === orderId);
  if (!order) return null;
  order.status = 'Quoted';
  order.quotedPrice = price;
  order.quotedBy = quotedBy;
  order.counterPrice = null;
  save(data);
  return order;
}

export function counterOrder(orderId: number, counterPrice: string): Order | null {
  const data = load();
  const order = data.orders.find((o) => o.id === orderId);
  if (!order) return null;
  order.counterPrice = counterPrice;
  order.status = 'Placed'; // Back to placed for admin to re-quote
  save(data);
  return order;
}

/** Public board: only accepted through pending delivery */
export function getActiveOrders(guildId: string): Order[] {
  const data = load();
  const shown: OrderStatus[] = ['Accepted', 'Searching', 'Refining', 'Pending Delivery'];
  return data.orders.filter((o) => o.guildId === guildId && shown.includes(o.status));
}

/** Admin board: all active orders (excludes Delivered and Cancelled) */
export function getAllOrders(guildId: string): Order[] {
  const data = load();
  const hidden: OrderStatus[] = ['Delivered', 'Cancelled'];
  return data.orders.filter((o) => o.guildId === guildId && !hidden.includes(o.status));
}

/** Queue position: count of accepted, non-delivered orders ahead of this one */
export function getQueuePosition(orderId: number, guildId: string): number {
  const active = getActiveOrders(guildId);
  const index = active.findIndex((o) => o.id === orderId);
  return index === -1 ? active.length : index + 1;
}

export function getOrder(orderId: number): Order | null {
  const data = load();
  return data.orders.find((o) => o.id === orderId) ?? null;
}

export function getActiveOrdersMessageInfo(): { messageId: string | null; channelId: string | null } {
  const data = load();
  return {
    messageId: data.activeOrdersMessageId,
    channelId: data.activeOrdersChannelId,
  };
}

export function setActiveOrdersMessageInfo(messageId: string, channelId: string) {
  const data = load();
  data.activeOrdersMessageId = messageId;
  data.activeOrdersChannelId = channelId;
  save(data);
}
