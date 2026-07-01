import { createContext, use, useEffect, useState, type ReactNode } from "react";
import {
  dismissToast,
  getNotificationSnapshot,
  notificationCenter,
  pushToast,
  type ToastEntry,
} from "@/lib/notifications/notification-center";
import { Check, X } from "./icons";
import { cx } from "./primitives";

interface NotificationsContextValue {
  push: typeof pushToast;
  dismiss: typeof dismissToast;
  toasts: ToastEntry[];
}

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [snapshot, setSnapshot] = useState(() => getNotificationSnapshot());

  useEffect(() => notificationCenter.subscribe(() => setSnapshot(getNotificationSnapshot())), []);

  return (
    <NotificationsContext value={{ push: pushToast, dismiss: dismissToast, toasts: snapshot.toasts }}>
      {children}
      <ToastViewport toasts={snapshot.toasts} />
    </NotificationsContext>
  );
}

export function useNotifications(): NotificationsContextValue {
  const value = use(NotificationsContext);
  if (!value) throw new Error("useNotifications must be used within NotificationProvider");
  return value;
}

function ToastViewport({ toasts }: { toasts: ToastEntry[] }) {
  return (
    <div className="pointer-events-none fixed right-4 top-4 z-50 flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-3">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={cx(
            "pointer-events-auto rounded border border-line bg-card px-4 py-3 shadow-[0_18px_50px_-24px_rgba(0,0,0,0.35)] transition-all duration-200 ease-out",
            toast.state === "visible" ? "translate-y-0 opacity-100" : "-translate-y-2 opacity-0",
          )}
          role="status"
          aria-live="polite"
        >
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-verified/10 text-verified">
              <Check width={15} height={15} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-fg">{toast.title}</p>
              {toast.message ? <p className="mt-1 text-sm leading-relaxed text-muted">{toast.message}</p> : null}
            </div>
            <button
              type="button"
              onClick={() => dismissToast(toast.id)}
              className="rounded p-1 text-faint transition-colors hover:bg-black/[0.04] hover:text-fg"
              aria-label="Dismiss notification"
            >
              <X width={14} height={14} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
