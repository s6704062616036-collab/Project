const safeText = (value) => `${value ?? ""}`.trim();

const toIsoString = (value) => {
  const date = new Date(value ?? "");
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString();
};

const toPlainObject = (value) => (value && typeof value === "object" ? value : {});

const TYPE_LABELS = {
  order_created: "คำสั่งซื้อใหม่",
  buyer_received_order: "ผู้ซื้อรับของแล้ว",
  buyer_rejected_order: "ผู้ซื้อปฏิเสธสินค้า",
  parcel_order_approved: "ร้านอนุมัติคำสั่งซื้อ",
  parcel_order_cancelled: "ร้านยกเลิกคำสั่งซื้อ",
  parcel_order_reported: "คำสั่งซื้อถูกรายงาน",
  parcel_preparing: "ร้านค้ากำลังเตรียมจัดส่ง",
  parcel_shipped: "ร้านค้าจัดส่งพัสดุแล้ว",
  kyc_submitted: "มีคำขอ KYC",
  kyc_approved: "KYC ผ่านแล้ว",
  kyc_rejected: "KYC ไม่ผ่าน",
  account_banned: "บัญชีถูกระงับ",
  account_unbanned: "บัญชีถูกปลดระงับ",
  report_submitted: "มีรายงานใหม่",
  report_taken_down: "เนื้อหาถูกนำออก",
  report_dismissed: "รายงานถูกปิด",
  meetup_updated: "นัดรับมีการอัปเดต",
  meetup_handover_confirmed: "ส่งมอบแล้ว",
};

const VALID_TARGET_ROUTES = new Set([
  "login",
  "register",
  "home",
  "myshop",
  "product",
  "seller",
  "profile",
  "search",
  "chat",
  "orders",
  "admin",
  "notifications",
]);

export class Notification {
  constructor({
    id,
    type,
    title,
    message,
    target,
    metadata,
    readAt,
    createdAt,
    updatedAt,
  } = {}) {
    this.id = safeText(id);
    this.type = safeText(type) || "system";
    this.title = safeText(title);
    this.message = safeText(message);
    this.target = {
      route: safeText(target?.route),
      params: toPlainObject(target?.params),
    };
    this.metadata = toPlainObject(metadata);
    this.readAt = toIsoString(readAt);
    this.createdAt = toIsoString(createdAt);
    this.updatedAt = toIsoString(updatedAt);
  }

  static fromJSON(json) {
    return new Notification({
      id: json?.id ?? json?._id ?? "",
      type: json?.type,
      title: json?.title,
      message: json?.message,
      target: json?.target,
      metadata: json?.metadata,
      readAt: json?.readAt,
      createdAt: json?.createdAt,
      updatedAt: json?.updatedAt,
    });
  }

  isRead() {
    return Boolean(this.readAt);
  }

  isUnread() {
    return !this.isRead();
  }

  hasTarget() {
    return Boolean(this.getTargetRoute());
  }

  getTargetRoute() {
    const route = safeText(this.target?.route);
    return VALID_TARGET_ROUTES.has(route) ? route : "";
  }

  getTypeLabel() {
    return TYPE_LABELS[this.type] ?? "การแจ้งเตือน";
  }

  getCreatedAtLabel(locale = "th-TH") {
    if (!this.createdAt) return "-";
    const date = new Date(this.createdAt);
    if (Number.isNaN(date.getTime())) return "-";

    return new Intl.DateTimeFormat(locale, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(date);
  }
}
