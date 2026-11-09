export interface UserNotification {
  id: string;
  type: "ban" | "info";
  title: string;
  message: string;
  companyId?: string;
  createdAt: string;
  read: boolean;
}

const notificationsKey = (userKey: string) => `mansa_user_notifications_${userKey}`;

export function getUserNotifications(userKey: string): UserNotification[] {
  if (typeof window === "undefined" || !userKey) return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(notificationsKey(userKey)) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function addUserNotification(
  userKey: string,
  notification: Omit<UserNotification, "id" | "createdAt" | "read">,
): UserNotification | null {
  if (typeof window === "undefined" || !userKey) return null;
  const item: UserNotification = {
    ...notification,
    id: `notification-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    read: false,
  };
  const updated = [item, ...getUserNotifications(userKey)].slice(0, 50);
  localStorage.setItem(notificationsKey(userKey), JSON.stringify(updated));
  window.dispatchEvent(new CustomEvent("mansa_user_notifications_updated", { detail: item }));
  return item;
}
