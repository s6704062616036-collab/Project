import React from "react";
import { ProfilePopup } from "../components/HeaderActionPopups";
import { OrderService } from "../services/OrderService";
import { ShippingMethod } from "../models/ShippingMethod";
import { RealtimeSyncManager } from "../utils/RealtimeSyncManager";

const getStatusBadgeClassName = (status) => {
  switch (`${status ?? ""}`.trim()) {
    case "approved":
    case "accepted":
    case "confirmed":
    case "completed":
    case "awaiting_meetup":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "rejected":
    case "cancelled":
    case "cancelled_by_seller":
    case "rejected_by_buyer":
      return "border-red-200 bg-red-50 text-red-700";
    case "pending_meetup_response":
    case "countered_by_seller":
    case "awaiting_parcel_pickup":
      return "border-sky-200 bg-sky-50 text-sky-700";
    case "reported_to_admin":
      return "border-rose-200 bg-rose-50 text-rose-700";
    default:
      return "border-amber-200 bg-amber-50 text-amber-700";
  }
};

export class MyOrdersPage extends React.Component {
  state = {
    loading: true,
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

  loadOrders = async () => {
    this.setState({ loading: true, error: "" });
    try {
      const { orders } = await this.orderService.listMyOrders();
      this.setState({ orders: orders ?? [] });
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
    try {
      await this.loadOrders();
    } finally {
      this.realtimeRefreshInFlight = false;
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
    const { loading, error, done, orders, showProfilePopup, actionLoadingKey } = this.state;

    return (
      <div className="min-h-dvh bg-zinc-50">
        <div className="sticky top-0 z-40 border-b border-zinc-200 bg-[#A4E3D8]">
          <div className="mx-auto flex max-w-350 items-center gap-4 px-4 py-5">
            <button
              type="button"
              onClick={this.props.onGoHome}
              title="กลับหน้าแรก"
              className="shrink-0 rounded-xl border border-zinc-200 bg-white p-0"
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
              className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
              onClick={this.loadOrders}
            >
              รีเฟรช
            </button>

            <button
              type="button"
              className="grid h-10 w-10 place-items-center rounded-xl border border-zinc-200 bg-[#F4D03E]"
              onClick={() => this.props.onGoChat?.()}
              title="แชท"
            >
              💬
            </button>

            <button
              type="button"
              className="grid h-10 w-10 place-items-center rounded-xl bg-[#F4D03E] text-white"
              onClick={this.openProfilePopup}
              title="บัญชี"
            >
              👤
            </button>
          </div>
        </div>

        <div className="mx-auto max-w-375 px-4 py-6">
          <div className="space-y-4 rounded-2xl bg-white p-4 shadow md:p-6">
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

            {!loading && !error && !orders.length ? (
              <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-6 text-center text-sm text-zinc-500">
                ยังไม่มีคำสั่งซื้อ
              </div>
            ) : null}

            {!loading && !error && orders.length ? (
              <div className="space-y-4">
                {orders.map((order) => (
                  <OrderCard
                    key={order.id || order.createdAt}
                    order={order}
                    actionLoadingKey={actionLoadingKey}
                    onSubmitShopOrderDecision={this.submitShopOrderDecision}
                  />
                ))}
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
      <article className="space-y-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
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
                  <div className="text-xs text-zinc-500">ผู้รับ</div>
                  <div className="text-sm text-zinc-700">
                    {shopOrder?.getRecipientLine?.() || "ยังไม่ได้ระบุชื่อหรือเบอร์โทร"}
                  </div>
                </div>

                <div className="rounded-xl border border-zinc-200 bg-white p-3">
                  <div className="text-xs text-zinc-500">ที่อยู่จัดส่ง</div>
                  <div className="whitespace-pre-line break-words text-sm text-zinc-700">
                    {shopOrder?.buyerShippingAddress?.address || "ยังไม่ได้ระบุที่อยู่จัดส่ง"}
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
              ) : null}
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
