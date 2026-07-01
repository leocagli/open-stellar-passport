export interface ToastInput {
  title: string;
  message?: string;
}

export interface ToastEntry extends ToastInput {
  id: string;
  state: "visible" | "closing";
}

interface ToastSnapshot {
  toasts: ToastEntry[];
  queued: number;
}

const MAX_VISIBLE_TOASTS = 3;
const AUTO_DISMISS_MS = 4_000;
const EXIT_MS = 220;

type Listener = () => void;

class NotificationCenter {
  private listeners = new Set<Listener>();
  private visible: ToastEntry[] = [];
  private queue: ToastEntry[] = [];
  private dismissTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private cleanupTimers = new Map<string, ReturnType<typeof setTimeout>>();

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  getSnapshot(): ToastSnapshot {
    return {
      toasts: [...this.visible],
      queued: this.queue.length,
    };
  }

  push(input: ToastInput): string {
    const toast: ToastEntry = {
      id: crypto.randomUUID(),
      title: input.title,
      message: input.message,
      state: "visible",
    };

    if (this.visible.length < MAX_VISIBLE_TOASTS) {
      this.visible = [...this.visible, toast];
      this.scheduleDismiss(toast.id);
    } else {
      this.queue = [...this.queue, toast];
    }

    this.emit();
    return toast.id;
  }

  dismiss(id: string): void {
    const current = this.visible.find((toast) => toast.id === id);
    if (!current || current.state === "closing") return;

    this.clearTimer(this.dismissTimers, id);
    this.visible = this.visible.map((toast) =>
      toast.id === id ? { ...toast, state: "closing" } : toast,
    );
    this.cleanupTimers.set(
      id,
      setTimeout(() => {
        this.cleanupTimers.delete(id);
        this.visible = this.visible.filter((toast) => toast.id !== id);
        this.promoteNext();
        this.emit();
      }, EXIT_MS),
    );
    this.emit();
  }

  reset(): void {
    for (const id of this.dismissTimers.keys()) this.clearTimer(this.dismissTimers, id);
    for (const id of this.cleanupTimers.keys()) this.clearTimer(this.cleanupTimers, id);
    this.visible = [];
    this.queue = [];
    this.emit();
  }

  private promoteNext(): void {
    if (this.visible.length >= MAX_VISIBLE_TOASTS) return;
    const next = this.queue.shift();
    if (!next) return;
    this.visible = [...this.visible, next];
    this.scheduleDismiss(next.id);
  }

  private scheduleDismiss(id: string): void {
    this.dismissTimers.set(
      id,
      setTimeout(() => {
        this.dismissTimers.delete(id);
        this.dismiss(id);
      }, AUTO_DISMISS_MS),
    );
  }

  private clearTimer(store: Map<string, ReturnType<typeof setTimeout>>, id: string): void {
    const timer = store.get(id);
    if (!timer) return;
    clearTimeout(timer);
    store.delete(id);
  }

  private emit(): void {
    for (const listener of this.listeners) listener();
  }
}

export const notificationCenter = new NotificationCenter();

export function getNotificationSnapshot(): ToastSnapshot {
  return notificationCenter.getSnapshot();
}

export function pushToast(input: ToastInput): string {
  return notificationCenter.push(input);
}

export function dismissToast(id: string): void {
  notificationCenter.dismiss(id);
}

export function resetNotificationCenter(): void {
  notificationCenter.reset();
}

export const notificationTiming = {
  AUTO_DISMISS_MS,
  EXIT_MS,
  MAX_VISIBLE_TOASTS,
} as const;
