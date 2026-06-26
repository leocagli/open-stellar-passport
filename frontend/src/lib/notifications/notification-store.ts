export interface NotificationEntry {
  id: string;
  agentId: string;
  title: string;
  message: string;
  readAt: string | null;
  createdAt: string;
}

const store = new Map<string, NotificationEntry[]>();

function list(agentId: string): NotificationEntry[] {
  let entries = store.get(agentId);
  if (!entries) {
    entries = [];
    store.set(agentId, entries);
  }
  return entries;
}

export function addNotification(
  agentId: string,
  fields: Pick<NotificationEntry, "title" | "message">,
): NotificationEntry {
  const n: NotificationEntry = {
    id: crypto.randomUUID(),
    agentId,
    readAt: null,
    createdAt: new Date().toISOString(),
    ...fields,
  };
  list(agentId).push(n);
  return n;
}

export function getNotifications(agentId: string): NotificationEntry[] {
  return [...list(agentId)];
}

export function markNotificationRead(
  agentId: string,
  notificationId: string,
): boolean {
  const n = list(agentId).find((x) => x.id === notificationId);
  if (!n) return false;
  n.readAt = new Date().toISOString();
  return true;
}

export function markAllRead(agentId: string): void {
  const ts = new Date().toISOString();
  for (const n of list(agentId)) n.readAt = ts;
}

/** For testing only. */
export function _reset(): void {
  store.clear();
}
