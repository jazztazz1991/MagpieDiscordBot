import { loadJson, saveJson } from './data';

export type OrderStatus =
  | 'Placed'
  | 'Not Accepted'
  | 'Accepted'
  | 'Searching'
  | 'Refining'
  | 'Pending Delivery'
  | 'Delivered';

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

export function createOrder(order: Omit<Order, 'id' | 'status' | 'createdAt'>): Order {
  const data = load();
  const newOrder: Order = {
    ...order,
    id: data.nextId,
    status: 'Placed',
    createdAt: new Date().toISOString(),
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

export function getActiveOrders(guildId: string): Order[] {
  const data = load();
  const hidden: OrderStatus[] = ['Not Accepted', 'Delivered'];
  return data.orders.filter((o) => o.guildId === guildId && !hidden.includes(o.status));
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
