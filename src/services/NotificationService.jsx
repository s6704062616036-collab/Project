import { HttpClient } from "./HttpClient";
import { Notification } from "../models/Notification";

export class NotificationService {
  static #instance = null;

  static instance() {
    if (!NotificationService.#instance) {
      NotificationService.#instance = new NotificationService();
    }
    return NotificationService.#instance;
  }

  constructor() {
    this.http = new HttpClient({ baseUrl: import.meta.env.VITE_API_URL ?? "" });
  }

  async listMyNotifications() {
    const result = await this.http.get("/api/notifications");

    return {
      notifications: Array.isArray(result?.notifications)
        ? result.notifications.map((item) => Notification.fromJSON(item))
        : [],
      unreadCount: Number(result?.unreadCount) || 0,
    };
  }

  async markAsRead(notificationId) {
    const normalizedNotificationId = `${notificationId ?? ""}`.trim();
    if (!normalizedNotificationId) {
      return { notification: null, unreadCount: 0 };
    }

    const result = await this.http.post(
      `/api/notifications/${encodeURIComponent(normalizedNotificationId)}/read`,
      {},
    );

    return {
      notification: result?.notification ? Notification.fromJSON(result.notification) : null,
      unreadCount: Number(result?.unreadCount) || 0,
      message: result?.message ?? "",
    };
  }

  async markAllAsRead() {
    const result = await this.http.post("/api/notifications/read-all", {});
    return {
      unreadCount: Number(result?.unreadCount) || 0,
      message: result?.message ?? "",
    };
  }
}
