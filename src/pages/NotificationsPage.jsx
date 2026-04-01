import React from "react";
import { NotificationService } from "../services/NotificationService";

export class NotificationsPage extends React.Component {
  state = {
    loading: true,
    error: "",
    done: "",
    notifications: [],
    markingId: "",
    markingAll: false,
    deletingId: "",
  };

  notificationService = NotificationService.instance();

  componentDidMount() {
    this.loadNotifications();
  }

  loadNotifications = async () => {
    this.setState({ loading: true, error: "", done: "" });
    try {
      const { notifications } = await this.notificationService.listMyNotifications();
      this.setState({ notifications: notifications ?? [] });
      this.props.onNotificationsChanged?.();
    } catch (error) {
      this.setState({
        error: error?.message ?? "โหลดรายการแจ้งเตือนไม่สำเร็จ",
      });
    } finally {
      this.setState({ loading: false });
    }
  };

  syncNotificationToState(updatedNotification) {
    if (!updatedNotification?.id) return;

    this.setState((state) => ({
      notifications: (state.notifications ?? []).map((notification) =>
        notification?.id === updatedNotification.id ? updatedNotification : notification,
      ),
    }));
  }

  markAsRead = async (notification) => {
    const notificationId = `${notification?.id ?? ""}`.trim();
    if (!notificationId || !notification?.isUnread?.()) return;

    this.setState({ markingId: notificationId, error: "" });
    try {
      const result = await this.notificationService.markAsRead(notificationId);
      if (result?.notification) {
        this.syncNotificationToState(result.notification);
      }
      this.props.onNotificationsChanged?.();
    } catch (error) {
      this.setState({
        error: error?.message ?? "อัปเดตสถานะแจ้งเตือนไม่สำเร็จ",
      });
    } finally {
      this.setState({ markingId: "" });
    }
  };

  markAllAsRead = async () => {
    if (!this.state.notifications.some((notification) => notification?.isUnread?.())) return;

    this.setState({ markingAll: true, error: "", done: "" });
    try {
      const result = await this.notificationService.markAllAsRead();
      this.setState((state) => ({
        notifications: (state.notifications ?? []).map((notification) =>
          notification?.isUnread?.()
            ? notification.constructor.fromJSON({
                ...notification,
                readAt: new Date().toISOString(),
              })
            : notification,
        ),
        done: result?.message ?? "ทำเครื่องหมายอ่านแล้วทั้งหมดเรียบร้อย",
      }));
      this.props.onNotificationsChanged?.();
    } catch (error) {
      this.setState({
        error: error?.message ?? "อัปเดตสถานะแจ้งเตือนทั้งหมดไม่สำเร็จ",
      });
    } finally {
      this.setState({ markingAll: false });
    }
  };

  deleteNotification = async (notification) => {
    const notificationId = `${notification?.id ?? ""}`.trim();
    if (!notificationId || notification?.isUnread?.()) return;

    this.setState({ deletingId: notificationId, error: "", done: "" });
    try {
      const result = await this.notificationService.deleteNotification(notificationId);
      this.setState((state) => ({
        notifications: (state.notifications ?? []).filter((item) => item?.id !== notificationId),
        done: result?.message ?? "ลบข้อความที่อ่านแล้วเรียบร้อย",
      }));
      this.props.onNotificationsChanged?.();
    } catch (error) {
      this.setState({
        error: error?.message ?? "ลบข้อความแจ้งเตือนไม่สำเร็จ",
      });
    } finally {
      this.setState({ deletingId: "" });
    }
  };

  openNotification = async (notification) => {
    await this.markAsRead(notification);
    this.props.onOpenNotification?.(notification);
  };

  renderEmptyState() {
    return (
      <div className="app-panel-card border-dashed bg-zinc-50/90 p-8 text-center text-sm text-zinc-500">
        ยังไม่มีการแจ้งเตือนในตอนนี้
      </div>
    );
  }

  renderNotificationCard(notification) {
    const isUnread = notification?.isUnread?.() ?? false;
    const targetLabel = notification?.hasTarget?.() ? "เปิดดู" : "";
    const isMarking = this.state.markingId === notification?.id;
    const isDeleting = this.state.deletingId === notification?.id;

    return (
      <article
        key={notification?.id || notification?.createdAt}
        className={`rounded-3xl border p-4 shadow-sm transition ${
          isUnread
            ? "border-amber-200 bg-gradient-to-br from-amber-50 via-white to-amber-100/60 shadow-[0_18px_45px_-24px_rgba(251,191,36,0.42)]"
            : "border-white/70 bg-white/92 backdrop-blur-sm"
        }`}
      >
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                  isUnread
                    ? "bg-zinc-900 text-white"
                    : "bg-zinc-100 text-zinc-700"
                }`}
              >
                {notification?.getTypeLabel?.() ?? "การแจ้งเตือน"}
              </span>
              {isUnread ? (
                <span className="rounded-full bg-rose-100 px-2.5 py-1 text-[11px] font-semibold text-rose-700">
                  ยังไม่ได้อ่าน
                </span>
              ) : null}
            </div>
            <div className="text-lg font-semibold text-zinc-900">
              {notification?.title || "การแจ้งเตือน"}
            </div>
            {notification?.message ? (
              <div className="whitespace-pre-wrap break-words text-sm text-zinc-700">
                {notification.message}
              </div>
            ) : null}
            <div className="text-xs text-zinc-500">
              {notification?.getCreatedAtLabel?.() ?? "-"}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2 rounded-2xl border border-zinc-200 bg-white/90 p-1.5 shadow-sm">
            {notification?.isUnread?.() ? (
              <button
                type="button"
                className="rounded-xl border border-transparent bg-zinc-100 px-3.5 py-2 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-200 disabled:opacity-60"
                onClick={() => this.markAsRead(notification)}
                disabled={isMarking}
              >
                {isMarking ? "กำลังอัปเดต..." : "อ่านแล้ว"}
              </button>
            ) : null}
            {!notification?.isUnread?.() ? (
              <button
                type="button"
                className="grid h-10 w-10 place-items-center rounded-xl border border-rose-200 bg-rose-50 text-base font-semibold text-rose-600 transition hover:bg-rose-100 disabled:opacity-60"
                onClick={() => this.deleteNotification(notification)}
                disabled={isDeleting}
                title="ลบข้อความนี้"
                aria-label="ลบข้อความนี้"
              >
                {isDeleting ? "..." : "×"}
              </button>
            ) : null}
            {targetLabel ? (
              <button
                type="button"
                className="rounded-xl bg-zinc-900 px-3.5 py-2 text-xs font-semibold text-white shadow-[0_14px_30px_-18px_rgba(24,24,27,0.7)] transition hover:-translate-y-0.5 disabled:opacity-60"
                onClick={() => this.openNotification(notification)}
              >
                {targetLabel}
              </button>
            ) : null}
          </div>
        </div>
      </article>
    );
  }

  render() {
    const { user } = this.props;
    const { loading, error, done, notifications, markingAll } = this.state;
    const pageTitle = user?.isAdmin?.() ? "ศูนย์แจ้งเตือนผู้ดูแลระบบ" : "ศูนย์แจ้งเตือน";

    return (
      <div className="min-h-dvh bg-zinc-50">
        <div className="app-topbar-shell sticky top-0 z-40 border-b border-zinc-200 bg-[#A4E3D8]">
          <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-4 px-4 py-5">
            <div className="flex min-w-0 items-center gap-4">
              <button
              type="button"
              onClick={this.props.onGoBack}
              title="กลับ"
              className="shrink-0 overflow-hidden rounded-2xl border border-white/55 bg-white/15 p-0 shadow-[0_14px_28px_-22px_rgba(15,23,42,0.35)] backdrop-blur-sm"
            >
              <img
                src="/App logo.jpg"
                alt="App logo"
                className="h-20 w-20 object-cover"
              />
              </button>

              <div className="min-w-0">
              <div className="truncate text-2xl font-semibold text-zinc-900">{pageTitle}</div>
              <div className="text-sm text-zinc-700">รวมเหตุการณ์สำคัญของระบบไว้ในที่เดียว</div>
              </div>

            </div>

            <div className="flex items-center gap-3">
              <button
              type="button"
              className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              onClick={this.loadNotifications}
            >
              รีเฟรช
            </button>

            <button
              type="button"
              className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-900 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md disabled:opacity-60"
              onClick={this.markAllAsRead}
              disabled={markingAll}
            >
              {markingAll ? "กำลังอัปเดต..." : "อ่านทั้งหมด"}
            </button>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-5xl px-4 py-6 space-y-4">
          {loading ? (
            <div className="app-panel-card p-5 text-sm text-zinc-500">
              กำลังโหลดรายการแจ้งเตือน...
            </div>
          ) : null}

          {error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          {done ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
              {done}
            </div>
          ) : null}

          {!loading && !notifications.length ? this.renderEmptyState() : null}

          {!loading && notifications.length ? (
            <div className="space-y-3">
              {notifications.map((notification) => this.renderNotificationCard(notification))}
            </div>
          ) : null}
        </div>
      </div>
    );
  }
}
