export interface WebhookEvent {
  event: string;
  payload: Record<string, unknown>;
  firedAt: number;
}

export type WebhookHandler = (event: WebhookEvent) => void | Promise<void>;

const handlers: WebhookHandler[] = [];
const eventLog: WebhookEvent[] = [];

export function onWebhook(handler: WebhookHandler): void {
  handlers.push(handler);
}

export function fireWebhook(event: string, payload: Record<string, unknown>): void {
  const entry: WebhookEvent = { event, payload, firedAt: Date.now() };
  eventLog.push(entry);
  for (const h of handlers) {
    try {
      void h(entry);
    } catch {
      // fire-and-forget: handler errors must not block the caller
    }
  }
}

export function getWebhookLog(): WebhookEvent[] {
  return [...eventLog];
}

/** For testing only. */
export function _reset(): void {
  handlers.length = 0;
  eventLog.length = 0;
}
