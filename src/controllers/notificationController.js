const notificationService = require("../services/notificationService");

const getApiBaseUrl = (req) => `${req.protocol}://${req.get("host")}`;

const handleNotificationError = (res, error, fallbackMessage) => {
  const status = Number(error?.status) || 500;
  return res.status(status).json({
    success: false,
    message: status >= 500 ? fallbackMessage : error.message,
    ...(status >= 500 ? { error: error.message } : {}),
  });
};

const listMyNotifications = async (req, res) => {
  try {
    const result = await notificationService.listNotificationsForUser({
      userId: req.user.id,
      baseUrl: getApiBaseUrl(req),
      limit: req.query?.limit,
    });

    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    return handleNotificationError(res, error, "Server error while fetching notifications");
  }
};

const readNotification = async (req, res) => {
  try {
    const result = await notificationService.markNotificationReadForUser({
      notificationId: req.params.notificationId,
      userId: req.user.id,
      baseUrl: getApiBaseUrl(req),
    });

    return res.status(200).json({
      success: true,
      ...result,
      message: "Notification marked as read",
    });
  } catch (error) {
    return handleNotificationError(res, error, "Server error while updating notification");
  }
};

const readAllNotifications = async (req, res) => {
  try {
    const result = await notificationService.markAllNotificationsReadForUser({
      userId: req.user.id,
    });

    return res.status(200).json({
      success: true,
      ...result,
      message: "All notifications marked as read",
    });
  } catch (error) {
    return handleNotificationError(res, error, "Server error while updating notifications");
  }
};

const deleteNotification = async (req, res) => {
  try {
    const result = await notificationService.deleteNotificationForUser({
      notificationId: req.params.notificationId,
      userId: req.user.id,
    });

    return res.status(200).json({
      success: true,
      ...result,
      message: "Notification deleted",
    });
  } catch (error) {
    return handleNotificationError(res, error, "Server error while deleting notification");
  }
};

module.exports = {
  listMyNotifications,
  readNotification,
  readAllNotifications,
  deleteNotification,
};
