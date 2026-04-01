import React from "react";
import { ProfilePopup } from "../components/HeaderActionPopups";
import { OrderService } from "../services/OrderService";
import { ShippingMethod } from "../models/ShippingMethod";
import { RealtimeSyncManager } from "../utils/RealtimeSyncManager";
import { NotificationBellButton } from "../components/NotificationBellButton";

const getStatusBadgeClassName = (status) => {
  switch (`${status ?? ""}`.trim()) {
    case "approved":
    case "accepted":
    case "confirmed":
    case "completed":
    case "awaiting_meetup":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "awaiting_buyer_confirmation":
      return "border-sky-200 bg-sky-50 text-sky-700";
    case "preparing_parcel":
      return "border-indigo-200 bg-indigo-50 text-indigo-700";
    case "rejected":
    case "cancelled":
    case "cancelled_by_seller":
    case "rejected_by_buyer":
      return "border-red-200 bg-red-50 text-red-700";
    case "pending_meetup_response":
    case "countered_by_seller":
    case "awaiting_parcel_pickup":
      return "border-sky-200 bg-sky-50 text-sky-700";
    case "parcel_in_transit":
      return "border-blue-200 bg-blue-50 text-blue-700";
    case "reported_to_admin":
      return "border-rose-200 bg-rose-50 text-rose-700";
    default:
      return "border-amber-200 bg-amber-50 text-amber-700";
  }
};

const ARCHIVED_ORDER_STATUSES = new Set([
  "completed",
  "cancelled",
  "cancelled_by_seller",
  "rejected",
  "rejected_by_buyer",
]);

const isArchivedOrder = (order) =>
  ARCHIVED_ORDER_STATUSES.has(order?.getEffectiveStatus?.() ?? `${order?.status ?? ""}`.trim());

const renderOrderSection = ({
  title,
  description,
  orders,
  emptyLabel,
  actionLoadingKey,
  onSubmitShopOrderDecision,
}) => (
  <section className="space-y-3">
    <div className="flex flex-wrap items-end justify-between gap-2">
      <div>
        <div className="text-base font-semibold text-zinc-900">{title}</div>
        <div className="text-sm text-zinc-500">{description}</div>
      </div>
      <div className="text-xs font-medium text-zinc-400">{orders.length} รายการ</div>
    </div>

    {orders.length ? (
      <div className="space-y-4">
        {orders.map((order) => (
          <OrderCard
            key={order.id || order.createdAt}
            order={order}
            actionLoadingKey={actionLoadingKey}
            onSubmitShopOrderDecision={onSubmitShopOrderDecision}
          />
        ))}
      </div>
    ) : (
      <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-5 text-center text-sm text-zinc-500">
        {emptyLabel}
      </div>
    )}
  </section>
);

export class MyOrdersPage extends React.Component {
  state = {
    loading: true,
    backgroundRefreshing: false,
    error: "",
    done: "",
    orders: [],
    showProfilePopup: false,
    actionLoadingKey: "",
  };

  orderService = OrderService.instance();
  realtimeSync = new RealtimeSyncManager({
    onRefresh: () => this.refreshOrders(),
    databasePollIntervalMs: 5000,
    databasePollingEnabled: false,
  });
  realtimeRefreshInFlight = false;
  pendingRealtimeRefresh = false;

  async componentDidMount() {
    await this.loadOrders();
    this.realtimeSync.start();
  }

  componentWillUnmount() {
    this.realtimeSync.stop();
  }

  fetchOrders = async () => {
    const { orders } = await this.orderService.listMyOrders();
    return orders ?? [];
  };

  loadOrders = async () => {
    this.setState({ loading: true, error: "" });
    try {
      const orders = await this.fetchOrders();
      this.setState({ orders });
    } catch (e) {
      this.setState({ error: e?.message ?? "โหลดข้อมูลการสั่งซื้อไม่สำเร็จ" });
    } finally {
      this.setState({ loading: false });
    }
  };

  syncUpdatedOrderToState = (updatedOrder) => {
    if (!updatedOrder?.id) return false;

    const currentOrders = Array.isArray(this.state.orders) ? this.state.orders : [];
    const hasTargetOrder = currentOrders.some((order) => order?.id === updatedOrder.id);
    if (!hasTargetOrder) return false;

    this.setState({
      orders: currentOrders.map((order) => (order?.id === updatedOrder.id ? updatedOrder : order)),
    });
    return true;
  };

  refreshOrders = async () => {
    if (this.realtimeRefreshInFlight) {
      this.pendingRealtimeRefresh = true;
      return;
    }

    this.realtimeRefreshInFlight = true;
    this.setState({ backgroundRefreshing: true });
    try {
      const orders = await this.fetchOrders();
      this.setState({ orders });
    } catch (e) {
      this.setState({ error: e?.message ?? "à¸£à¸µà¹€à¸Ÿà¸£à¸Šà¸„à¸³à¸ªà¸±à¹ˆà¸‡à¸‹à¸·à¹‰à¸­à¹„à¸¡à¹ˆà¸ªà¸³à¹€à¸£à¹‡à¸ˆ" });
    } finally {
      this.realtimeRefreshInFlight = false;
      this.setState({ backgroundRefreshing: false });
    }

    if (this.pendingRealtimeRefresh) {
      this.pendingRealtimeRefresh = false;
      this.refreshOrders();
    }
  };

  submitShopOrderDecision = async ({ orderId, shopOrderKey, action } = {}) => {
    const normalizedOrderId = `${orderId ?? ""}`.trim();
    const normalizedShopOrderKey = `${shopOrderKey ?? ""}`.trim();
    const normalizedAction = `${action ?? ""}`.trim();
    if (!normalizedOrderId || !normalizedShopOrderKey || !normalizedAction) return;

    if (typeof window !== "undefined") {
      const confirmed = window.confirm(
        normalizedAction === "receive"
          ? "ยืนยันว่าคุณได้รับสินค้าแล้ว?"
          : "ยืนยันว่าต้องการปฏิเสธสินค้านี้?",
      );
      if (!confirmed) return;
    }

    const actionLoadingKey = `${normalizedOrderId}:${normalizedShopOrderKey}:${normalizedAction}`;
    this.setState({ actionLoadingKey, error: "", done: "" });
    try {
      const result = await this.orderService.updateShopOrderDecision({
        orderId: normalizedOrderId,
        shopOrderKey: normalizedShopOrderKey,
        action: normalizedAction,
      });
      const updatedFromResponse = this.syncUpdatedOrderToState(result?.order);
      if (!updatedFromResponse) {
        await this.loadOrders();
      } else {
        this.refreshOrders();
      }
      this.setState({
        done:
          result?.message ??
          (normalizedAction === "receive" ? "อัปเดตสถานะเป็นรับของแล้ว" : "อัปเดตสถานะเป็นปฏิเสธของแล้ว"),
      });
    } catch (e) {
      this.setState({ error: e?.message ?? "อัปเดตสถานะคำสั่งซื้อไม่สำเร็จ" });
    } finally {
      this.setState({ actionLoadingKey: "" });
    }
  };

  openProfilePopup = () => {
    this.setState({ showProfilePopup: true });
  };

  closeProfilePopup = () => {
    this.setState({ showProfilePopup: false });
  };

  goMyShop = () => {
    this.setState({ showProfilePopup: false });
    this.props.onGoMyShop?.();
  };

  render() {
    const { user } = this.props;
    const { loading, backgroundRefreshing, error, done, orders, showProfilePopup, actionLoadingKey } = this.state;
    const chatUnreadCount = Number(this.props.chatUnreadCount ?? 0) || 0;
    const notificationUnreadCount = Number(this.props.notificationUnreadCount ?? 0) || 0;
    const inProgressOrders = orders.filter((order) => !isArchivedOrder(order));
    const archivedOrders = orders.filter((order) => isArchivedOrder(order));

    return (
      <div className="min-h-dvh bg-zinc-50">
        <div className="app-topbar-shell sticky top-0 z-40 border-b border-zinc-200 bg-[#A4E3D8]">
          <div className="mx-auto flex max-w-350 items-center gap-4 px-4 py-5">
            <button
              type="button"
              onClick={this.props.onGoHome}
              title="กลับหน้าแรก"
              className="app-logo-button shrink-0 rounded-[1.2rem] p-0"
            >
              <img
                src="/App logo.jpg"
                alt="App logo"
                className="h-20 w-20 rounded-xl object-cover"
              />
            </button>

            <div className="min-w-0 flex-1">
              <div className="text-lg font-semibold text-zinc-900">การสั่งซื้อของฉัน</div>
              <div className="text-sm text-zinc-600">ติดตามคำสั่งซื้อและข้อมูลการจัดส่งของแต่ละร้าน</div>
            </div>

            <button
              type="button"
              className="app-soft-panel rounded-xl px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
              onClick={this.loadOrders}
            >
              รีเฟรช
            </button>

            <NotificationBellButton
              unreadCount={notificationUnreadCount}
              onClick={this.props.onGoNotifications}
              className="app-icon-button relative grid h-10 w-10 place-items-center rounded-xl"
            />

            <button
              type="button"
              className="app-icon-button relative grid h-10 w-10 place-items-center rounded-xl"
              onClick={() => this.props.onGoChat?.()}
              data-chat-unread={chatUnreadCount > 0 ? (chatUnreadCount > 99 ? "99+" : `${chatUnreadCount}`) : ""}
              title="แชท"
            >
              <img src="/chat.svg" alt="แชท" className="h-5 w-5 object-contain" />
            </button>

            <button
              type="button"
              className="app-icon-button grid h-10 w-10 place-items-center rounded-xl"
              onClick={this.openProfilePopup}
              title="บัญชี"
            >
              <img src="/account.svg" alt="บัญชี" className="h-5 w-5 object-contain" />
            </button>
          </div>
        </div>

        <div className="mx-auto max-w-375 px-4 py-6">
          <div className="app-page-section app-main-panel space-y-4 rounded-2xl p-4 md:p-6">
            {loading ? <div className="text-sm text-zinc-500">กำลังโหลดคำสั่งซื้อจากฐานข้อมูล...</div> : null}
            {error ? (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            ) : null}
            {done ? (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
                {done}
              </div>
            ) : null}
            {!loading && backgroundRefreshing ? (
              <div className="text-xs text-zinc-400">กำลังซิงก์ข้อมูลล่าสุด...</div>
            ) : null}

            {!loading && !error && !orders.length ? (
              <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-6 text-center text-sm text-zinc-500">
                ยังไม่มีคำสั่งซื้อ
              </div>
            ) : null}

            {!loading && !error && orders.length ? (
              <div className="space-y-8">
                {renderOrderSection({
                  title: "กำลังดำเนินการ",
                  description: "รายการที่ยังอยู่ระหว่างรอยืนยัน จัดส่ง นัดรับ หรือรอการตัดสินใจ",
                  orders: inProgressOrders,
                  emptyLabel: "ตอนนี้ไม่มีรายการที่กำลังดำเนินการ",
                  actionLoadingKey,
                  onSubmitShopOrderDecision: this.submitShopOrderDecision,
                })}

                {renderOrderSection({
                  title: "ประวัติการสั่งซื้อ",
                  description: "รายการที่เสร็จสิ้น ยกเลิก หรือปิดรายการไปแล้ว",
                  orders: archivedOrders,
                  emptyLabel: "ยังไม่มีประวัติการสั่งซื้อที่ผ่านมา",
                  actionLoadingKey,
                  onSubmitShopOrderDecision: this.submitShopOrderDecision,
                })}
              </div>
            ) : null}
          </div>
        </div>

        {showProfilePopup ? (
          <ProfilePopup
            user={user}
            onClose={this.closeProfilePopup}
            onGoMyShop={this.goMyShop}
            onLogout={this.props.onLogout}
          />
        ) : null}
      </div>
    );
  }
}

class OrderCard extends React.Component {
  render() {
    const { order, actionLoadingKey, onSubmitShopOrderDecision } = this.props;

    return (
      <article className="app-order-card space-y-4 rounded-2xl p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="text-base font-semibold text-zinc-900">คำสั่งซื้อ #{order?.id || "-"}</div>
            <div className="text-xs text-zinc-500">สั่งเมื่อ {order?.getCreatedAtLabel?.() ?? "-"}</div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge
              status={order?.getEffectiveStatus?.() ?? order?.status}
              label={order?.getStatusLabel?.() ?? "รอตรวจสอบ"}
            />
            <div className="text-sm font-semibold text-zinc-900">{order?.getTotalPriceLabel?.() ?? "฿0.00"}</div>
          </div>
        </div>

        {order?.notes ? (
          <div className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700">
            หมายเหตุ: {order.notes}
          </div>
        ) : null}

        <div className="space-y-3">
          {(order?.shopOrders ?? []).map((shopOrder, index) => (
            <OrderShopSection
              key={`${shopOrder.shopId || shopOrder.ownerId || "shop"}-${index}`}
              orderId={order?.id}
              shopOrder={shopOrder}
              actionLoadingKey={actionLoadingKey}
              onSubmitShopOrderDecision={onSubmitShopOrderDecision}
            />
          ))}
        </div>
      </article>
    );
  }
}

class OrderShopSection extends React.Component {
  render() {
    const { orderId, shopOrder, actionLoadingKey, onSubmitShopOrderDecision } = this.props;
    const shopOrderKey = shopOrder?.getIdentityKey?.() ?? `${shopOrder?.shopId || shopOrder?.ownerId || ""}`.trim();
    const receiveLoadingKey = `${orderId}:${shopOrderKey}:receive`;
    const rejectLoadingKey = `${orderId}:${shopOrderKey}:reject`;
    const canManageOrder = shopOrder?.canBuyerManageOrder?.() ?? false;

    return (
      <section className="space-y-3 rounded-2xl border border-zinc-200 bg-white p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="text-sm font-semibold text-zinc-900">{shopOrder?.shopName || "ร้านค้า"}</div>
            <div className="text-xs text-zinc-500">
              วิธีจัดส่ง: {shopOrder?.getShippingMethodLabel?.() ?? ShippingMethod.getLabel(shopOrder?.shippingMethod)}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge
              status={shopOrder?.getEffectiveStatus?.() ?? shopOrder?.status}
              label={shopOrder?.getStatusLabel?.() ?? "รอตรวจสอบ"}
            />
            <div className="text-sm font-semibold text-zinc-900">{shopOrder?.getSubtotalLabel?.() ?? "฿0.00"}</div>
          </div>
        </div>

        <div className="space-y-2">
          {(shopOrder?.items ?? []).map((item, index) => (
            <div
              key={`${item.productId || item.itemId || item.name}-${index}`}
              className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-zinc-50 p-3"
            >
              <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-xl bg-white">
                {item?.imageUrl ? (
                  <img src={item.imageUrl} alt={item?.name ?? "order-item"} className="h-full w-full object-cover" />
                ) : (
                  <span className="text-xs text-zinc-400">ไม่มีรูป</span>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="line-clamp-2 break-words text-sm font-semibold text-zinc-800">
                  {item?.name || "ไม่ระบุชื่อสินค้า"}
                </div>
                <div className="text-xs text-zinc-500">
                  {item?.getPriceLabel?.() ?? "฿0.00"} x {item?.quantity ?? 1}
                </div>
              </div>

              <div className="text-sm font-medium text-zinc-700">{item?.getLineTotalLabel?.() ?? "฿0.00"}</div>
            </div>
          ))}
        </div>

        {ShippingMethod.isParcel(shopOrder?.shippingMethod) ? (
          <div className="space-y-3 rounded-2xl bg-zinc-50 p-3">
            <div className="text-sm font-medium text-zinc-800">ข้อมูลจัดส่งพัสดุ</div>
            {shopOrder?.adminReport ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
                ร้านค้ารายงานคำสั่งซื้อนี้ให้ Admin ตรวจสอบแล้ว
                {shopOrder.adminReport.reason ? `: ${shopOrder.adminReport.reason}` : ""}
              </div>
            ) : null}
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_14rem]">
              <div className="space-y-2">
                <div className="rounded-xl border border-zinc-200 bg-white p-3">
                  <div className="text-xs text-zinc-500">ที่อยู่จัดส่ง</div>
                  {shopOrder?.buyerShippingAddress?.label ? (
                    <div className="mt-1 text-sm font-medium text-zinc-800">{shopOrder.buyerShippingAddress.label}</div>
                  ) : null}
                  {shopOrder?.buyerShippingAddress?.name || shopOrder?.buyerShippingAddress?.phone ? (
                    <div className="mt-1 text-sm text-zinc-600">
                      {[shopOrder?.buyerShippingAddress?.name, shopOrder?.buyerShippingAddress?.phone]
                        .filter(Boolean)
                        .join(" | ")}
                    </div>
                  ) : null}
                  {shopOrder?.getBuyerAddressFieldLine?.() ? (
                    <div className="mt-1 text-sm text-zinc-600">
                      {shopOrder.getBuyerAddressFieldLine()}
                    </div>
                  ) : null}
                  {shopOrder?.getBuyerAddressLocationLine?.() ? (
                    <div className="mt-1 text-sm text-zinc-600">
                      {shopOrder.getBuyerAddressLocationLine()}
                    </div>
                  ) : null}
                  {shopOrder?.getBuyerAddressNote?.() ? (
                    <div className="mt-1 whitespace-pre-line break-words text-sm text-zinc-500">
                      {shopOrder.getBuyerAddressNote()}
                    </div>
                  ) : null}
                  <div className="whitespace-pre-line break-words text-sm text-zinc-700">
                    {/*
                    {shopOrder?.buyerShippingAddress?.address || "ยังไม่ได้ระบุที่อยู่จัดส่ง"}
                    */}
                    {shopOrder?.buyerShippingAddress?.address ||
                      "\u0e22\u0e31\u0e07\u0e44\u0e21\u0e48\u0e44\u0e14\u0e49\u0e23\u0e30\u0e1a\u0e38\u0e17\u0e35\u0e48\u0e2d\u0e22\u0e39\u0e48\u0e08\u0e31\u0e14\u0e2a\u0e48\u0e07"}
                  </div>
                </div>
              </div>

              {shopOrder?.parcelPayment?.receiptImageUrl ? (
                <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
                  <img
                    src={shopOrder.parcelPayment.receiptImageUrl}
                    alt={`receipt-${shopOrder?.shopName ?? "shop"}`}
                    className="max-h-60 w-full object-contain"
                  />
                </div>
              ) : (
                <div className="grid place-items-center rounded-2xl border border-dashed border-zinc-300 bg-white p-4 text-center text-sm text-zinc-500">
                  {shopOrder?.parcelPayment?.requiresReceipt?.() === false
                    ? "รายการนี้เป็นเก็บเงินปลายทาง จึงไม่มีใบเสร็จแนบ"
                    : "ร้านค้ากำลังรอตรวจสอบใบเสร็จ"}
                </div>
              )}
            </div>
          </div>
        ) : null}

        {ShippingMethod.isMeetup(shopOrder?.shippingMethod) ? (
          <div className="space-y-1 rounded-2xl bg-zinc-50 p-3">
            <div className="text-sm font-medium text-zinc-800">รายละเอียดการนัดรับ</div>
            <div className="whitespace-pre-line break-words text-sm text-zinc-700">
              {shopOrder?.meetupProposal?.location || "ยังไม่มีข้อมูลสถานที่นัดรับ"}
            </div>
            {shopOrder?.meetupProposal?.responseLocation ? (
              <div className="whitespace-pre-line break-words text-sm text-sky-700">
                สถานที่ที่คนขายเสนอใหม่: {shopOrder.meetupProposal.responseLocation}
              </div>
            ) : null}
            <div className="text-xs text-zinc-500">สถานะ: {shopOrder?.getStatusLabel?.() ?? "รอดำเนินการ"}</div>
            {shopOrder?.getEffectiveStatus?.() === "awaiting_buyer_confirmation" ? (
              <div className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-700">
                คนขายแจ้งว่าส่งมอบสินค้าแล้ว ถ้าคุณได้รับของเรียบร้อยสามารถกดรับของด้านล่างเพื่อปิดธุรกรรมได้
              </div>
            ) : null}
          </div>
        ) : null}

        {canManageOrder ? (
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="rounded-xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60"
              onClick={() =>
                onSubmitShopOrderDecision?.({
                  orderId,
                  shopOrderKey,
                  action: "reject",
                })
              }
              disabled={Boolean(actionLoadingKey)}
            >
              {actionLoadingKey === rejectLoadingKey ? "กำลังอัปเดต..." : "ปฏิเสธของ"}
            </button>
            <button
              type="button"
              className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              onClick={() =>
                onSubmitShopOrderDecision?.({
                  orderId,
                  shopOrderKey,
                  action: "receive",
                })
              }
              disabled={Boolean(actionLoadingKey)}
            >
              {actionLoadingKey === receiveLoadingKey ? "กำลังอัปเดต..." : "รับของ"}
            </button>
          </div>
        ) : null}
      </section>
    );
  }
}

class StatusBadge extends React.Component {
  render() {
    const { label, status } = this.props;

    return (
      <div className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${getStatusBadgeClassName(status)}`}>
        {label}
      </div>
    );
  }
}
