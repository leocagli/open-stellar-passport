import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getNotificationSnapshot,
  notificationTiming,
  pushToast,
  resetNotificationCenter,
} from "./notification-center";

describe("notification-center", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetNotificationCenter();
  });

  it("caps visible toasts at 3 and queues the rest", () => {
    for (let index = 1; index <= 5; index += 1) {
      pushToast({ title: `Toast ${index}` });
    }

    const snapshot = getNotificationSnapshot();
    expect(snapshot.toasts).toHaveLength(notificationTiming.MAX_VISIBLE_TOASTS);
    expect(snapshot.queued).toBe(2);
    expect(snapshot.toasts.map((toast) => toast.title)).toEqual(["Toast 1", "Toast 2", "Toast 3"]);
  });

  it("auto-dismisses and promotes queued toasts", () => {
    for (let index = 1; index <= 4; index += 1) {
      pushToast({ title: `Toast ${index}` });
    }

    vi.advanceTimersByTime(notificationTiming.AUTO_DISMISS_MS);
    expect(getNotificationSnapshot().toasts.every((toast) => toast.state === "closing")).toBe(true);

    vi.advanceTimersByTime(notificationTiming.EXIT_MS);
    const snapshot = getNotificationSnapshot();
    expect(snapshot.toasts).toHaveLength(1);
    expect(snapshot.toasts[0].title).toBe("Toast 4");
    expect(snapshot.queued).toBe(0);
  });
});
