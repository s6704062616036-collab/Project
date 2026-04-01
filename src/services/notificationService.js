const mongoose = require("mongoose");

const Notification = require("../models/Notification");
const User = require("../models/User");
const { mapNotification } = require("../utils/notificationMapper");

const safeText = (value) => `${value ?? ""}`.trim();

const toTarget = (target = {}) => {
  const route = safeText(target?.route);
  const params = target?.params && typeof target.params === "object" ? target.params : {};
  return {
    route,
    params,
  };
};

const normalizeNotificationInput = (notification = {}) => {
  const userId = safeText(notification?.userId);
  const title = safeText(notification?.title);
  const type = safeText(notification?.type) || "system";

  if (!mongoose.isValidObjectId(userId) || !title) {
    return null;
  }

  return {
    user: userId,
    type,
    title,
    message: safeText(notification?.message),
    target: toTarget(notification?.target),
    metadata: notification?.metadata && typeof notification.metadata === "object" ? notification.metadata : {},
  };
};

const createNotification = async (notification = {}) => {
  const normalizedNotification = normalizeNotificationInput(notification);
  if (!normalizedNotification) return null;

  return Notification.create(normalizedNotification);
};

const createNotifications = async (notifications = []) => {
  const payloads = (Array.isArray(notifications) ? notifications : [])
    .map((notification) => normalizeNotificationInput(notification))
    .filter(Boolean);

  if (!payloads.length) return [];

  return Notification.insertMany(payloads, { ordered: false }).catch(async () => {
    const createdNotifications = [];
    for (const payload of payloads) {
      try {
        const notification = await Notification.create(payload);
        createdNotifications.push(notification);
      } catch {
        // ignore one failed notification and continue with the rest
      }
    }

    return createdNotifications;
  });
};

const notifyAdmins = async ({ title, message, type = "admin_alert", target, metadata } = {}) => {
  const adminIds = await User.find({ role: "admin" }).distinct("_id");
  if (!adminIds.length) return [];

  return createNotifications(
    adminIds.map((adminId) => ({
      userId: adminId?.toString?.() ?? `${adminId ?? ""}`,
      type,
      title,
      message,
      target,
      metadata,
    }))
  );
};

const listNotificationsForUser = async ({ userId, baseUrl, limit = 50 } = {}) => {
  const normalizedUserId = safeText(userId);
  if (!mongoose.isValidObjectId(normalizedUserId)) {
    const error = new Error("Invalid user id");
    error.status = 400;
    throw error;
  }

  const normalizedLimit = Number.isFinite(Number(limit)) ? Math.min(Math.max(Number(limit), 1), 100) : 50;
  const notifications = await Notification.find({ user: normalizedUserId })
    .sort({ createdAt: -1 })
    .limit(normalizedLimit)
    .lean();
  const unreadCount = await Notification.countDocuments({
    user: normalizedUserId,
    readAt: null,
  });

  return {
    notifications: notifications.map((notification) => mapNotification(notification, { baseUrl })),
    unreadCount,
  };
};

const markNotificationReadForUser = async ({ notificationId, userId, baseUrl } = {}) => {
  const normalizedNotificationId = safeText(notificationId);
  const normalizedUserId = safeText(userId);

  if (!mongoose.isValidObjectId(normalizedNotificationId)) {
    const error = new Error("Invalid notification id");
    error.status = 400;
    throw error;
  }

  const notification = await Notification.findOne({
    _id: normalizedNotificationId,
    user: normalizedUserId,
  });
  if (!notification) {
    const error = new Error("Notification not found");
    error.status = 404;
    throw error;
  }

  if (!notification.readAt) {
    notification.readAt = new Date();
    await notification.save();
  }

  return {
    notification: mapNotification(notification.toObject(), { baseUrl }),
    unreadCount: await Notification.countDocuments({
      user: normalizedUserId,
      readAt: null,
    }),
  };
};

const markAllNotificationsReadForUser = async ({ userId } = {}) => {
  const normalizedUserId = safeText(userId);
  if (!mongoose.isValidObjectId(normalizedUserId)) {
    const error = new Error("Invalid user id");
    error.status = 400;
    throw error;
  }

  await Notification.updateMany(
    {
      user: normalizedUserId,
      readAt: null,
    },
    {
      $set: {
        readAt: new Date(),
      },
    }
  );

  return {
    unreadCount: 0,
  };
};

const deleteNotificationForUser = async ({ notificationId, userId } = {}) => {
  const normalizedNotificationId = safeText(notificationId);
  const normalizedUserId = safeText(userId);

  if (!mongoose.isValidObjectId(normalizedNotificationId)) {
    const error = new Error("Invalid notification id");
    error.status = 400;
    throw error;
  }

  const notification = await Notification.findOne({
    _id: normalizedNotificationId,
    user: normalizedUserId,
  });

  if (!notification) {
    const error = new Error("Notification not found");
    error.status = 404;
    throw error;
  }

  if (!notification.readAt) {
    const error = new Error("Only read notifications can be deleted");
    error.status = 400;
    throw error;
  }

  await notification.deleteOne();

  return {
    deletedId: normalizedNotificationId,
    unreadCount: await Notification.countDocuments({
      user: normalizedUserId,
      readAt: null,
    }),
  };
};

module.exports = {
  createNotification,
  createNotifications,
  notifyAdmins,
  listNotificationsForUser,
  markNotificationReadForUser,
  markAllNotificationsReadForUser,
  deleteNotificationForUser,
};
