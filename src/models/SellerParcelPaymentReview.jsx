import { ParcelPaymentRecord } from "./ParcelPaymentRecord";

const safeText = (value) => `${value ?? ""}`.trim();
const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};
const ensureArray = (value) => (Array.isArray(value) ? value : value == null ? [] : [value]);

const normalizeParcelReviewStatus = (value) => ParcelPaymentRecord.normalizeStatus(value);

const formatCurrency = (value) =>
  new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    maximumFractionDigits: 2,
  }).format(toNumber(value, 0));

const formatDateTime = (value) => {
  const date = new Date(value ?? "");
  if (!safeText(value) || Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

export class SellerParcelPaymentReviewItem {
  constructor({ itemId, productId, name, imageUrl, price, quantity } = {}) {
    this.itemId = safeText(itemId);
    this.productId = safeText(productId);
    this.name = safeText(name);
    this.imageUrl = safeText(imageUrl);
    this.price = toNumber(price, 0);
    this.quantity = Math.max(1, toNumber(quantity, 1));
  }

  static fromJSON(json) {
    return new SellerParcelPaymentReviewItem({
      itemId: json?.itemId ?? json?.id ?? json?._id,
      productId: json?.productId,
      name: json?.name ?? json?.productName,
      imageUrl: json?.imageUrl ?? json?.image,
      price: json?.price,
      quantity: json?.quantity ?? json?.qty,
    });
  }

  getLineTotalNumber() {
    return this.price * this.quantity;
  }

  getLineTotalLabel() {
    return formatCurrency(this.getLineTotalNumber());
  }

  getPriceLabel() {
    return formatCurrency(this.price);
  }
}

export class SellerParcelPaymentReview {
  constructor({
    orderId,
    shopOrderKey,
    ownerId,
    shopId,
    shopName,
    buyerId,
    buyerName,
    buyerAvatarUrl,
    status,
    subtotal,
    items,
    createdAt,
    submittedAt,
    receiptImageUrl,
    buyerShippingAddress,
    adminReport,
  } = {}) {
    this.orderId = safeText(orderId);
    this.shopOrderKey = safeText(shopOrderKey);
    this.ownerId = safeText(ownerId);
    this.shopId = safeText(shopId);
    this.shopName = safeText(shopName) || "ร้านค้า";
    this.buyerId = safeText(buyerId);
    this.buyerName = safeText(buyerName) || "ผู้ซื้อ";
    this.buyerAvatarUrl = safeText(buyerAvatarUrl);
    this.status = safeText(status);
    this.items = ensureArray(items).map((item) =>
      item instanceof SellerParcelPaymentReviewItem
        ? item
        : SellerParcelPaymentReviewItem.fromJSON(item),
    );
    this.subtotal = toNumber(
      subtotal,
      this.items.reduce((sum, item) => sum + item.getLineTotalNumber(), 0),
    );
    this.createdAt = safeText(createdAt);
    this.submittedAt = safeText(submittedAt) || this.createdAt;
    this.receiptImageUrl = safeText(receiptImageUrl);
    this.buyerShippingAddress = buyerShippingAddress
      ? {
          name: safeText(buyerShippingAddress.name),
          phone: safeText(buyerShippingAddress.phone),
          address: safeText(buyerShippingAddress.address),
        }
      : null;
    this.adminReport = adminReport
      ? {
          reportId: safeText(adminReport.reportId ?? adminReport.id),
          status: safeText(adminReport.status),
          reason: safeText(adminReport.reason),
          createdAt: safeText(adminReport.createdAt),
        }
      : null;
  }

  static fromJSON(json) {
    const parcelPayment = ParcelPaymentRecord.fromJSON(json);
    const buyerShippingAddress =
      json?.buyerShippingAddress && typeof json.buyerShippingAddress === "object"
        ? json.buyerShippingAddress
        : json?.shippingAddress && typeof json.shippingAddress === "object"
          ? json.shippingAddress
          : null;
    const rawStatus = ParcelPaymentRecord.resolveWorkflowStatus([
      json?.status,
      json?.paymentStatus,
      json?.reviewStatus,
      json?.verificationStatus,
      json?.parcelPaymentStatus,
      parcelPayment?.status,
    ]);

    return new SellerParcelPaymentReview({
      orderId: json?.orderId ?? json?.order?.id ?? json?.order?._id,
      shopOrderKey: json?.shopOrderKey ?? json?.shopId ?? json?.ownerId,
      ownerId: json?.ownerId ?? json?.sellerId ?? json?.shopOwnerId,
      shopId: json?.shopId ?? json?.shop?._id ?? json?.shop?.id,
      shopName: json?.shopName ?? json?.shop?.shopName ?? json?.shop?.name,
      buyerId: json?.buyerId ?? json?.userId ?? json?.buyer?.id,
      buyerName: json?.buyerName ?? json?.buyer?.name ?? json?.user?.name,
      buyerAvatarUrl: json?.buyerAvatarUrl ?? json?.buyer?.avatarUrl ?? json?.user?.avatarUrl,
      status: normalizeParcelReviewStatus(rawStatus),
      subtotal: json?.subtotal ?? json?.totalPrice ?? json?.amount,
      items: json?.items ?? json?.orderItems ?? json?.products,
      createdAt: json?.createdAt ?? json?.order?.createdAt,
      submittedAt: json?.submittedAt ?? parcelPayment?.submittedAt ?? json?.updatedAt,
      receiptImageUrl: parcelPayment?.receiptImageUrl,
      buyerShippingAddress,
      adminReport: json?.adminReport ?? json?.report,
    });
  }

  static fromOrderPayload(orderPayload, shopOrderKey = "") {
    const order = orderPayload && typeof orderPayload === "object" ? orderPayload : {};
    const shopOrders = ensureArray(order?.shopOrders);
    const normalizedKey = safeText(shopOrderKey);
    const matchedShopOrder =
      shopOrders.find((item) => {
        const identityKey = safeText(item?.shopOrderKey ?? item?.shopId ?? item?.ownerId);
        return normalizedKey ? identityKey === normalizedKey : true;
      }) ??
      shopOrders.find((item) => {
        const shippingMethod = safeText(item?.shippingMethod).toLowerCase();
        return shippingMethod === "parcel" || ParcelPaymentRecord.looksLikeParcelPayload(item);
      }) ??
      null;

    if (!matchedShopOrder) return null;

    return SellerParcelPaymentReview.fromJSON({
      ...matchedShopOrder,
      orderId: order?.id ?? order?._id,
      createdAt: matchedShopOrder?.createdAt ?? order?.createdAt,
      buyerId: matchedShopOrder?.buyerId ?? order?.buyerId ?? order?.userId,
      buyerName: matchedShopOrder?.buyerName ?? order?.buyer?.name ?? order?.user?.name,
      buyerAvatarUrl: matchedShopOrder?.buyerAvatarUrl ?? order?.buyer?.avatarUrl ?? order?.user?.avatarUrl,
    });
  }

  static listFromOrderPayload(orderPayload) {
    const order = orderPayload && typeof orderPayload === "object" ? orderPayload : {};
    return ensureArray(order?.shopOrders)
      .filter((shopOrder) => {
        const shippingMethod = safeText(shopOrder?.shippingMethod).toLowerCase();
        return shippingMethod === "parcel" || ParcelPaymentRecord.looksLikeParcelPayload(shopOrder);
      })
      .map((shopOrder) =>
        SellerParcelPaymentReview.fromOrderPayload(order, shopOrder?.shopOrderKey ?? shopOrder?.shopId ?? shopOrder?.ownerId),
      )
      .filter(Boolean);
  }

  getIdentityKey() {
    return this.shopOrderKey || safeText(this.shopId || this.ownerId);
  }

  getSubtotalLabel() {
    return formatCurrency(this.subtotal);
  }

  getSubmittedAtLabel() {
    return formatDateTime(this.submittedAt);
  }

  getBuyerLine() {
    if (!this.buyerShippingAddress) return this.buyerName;

    return [this.buyerShippingAddress.name || this.buyerName, this.buyerShippingAddress.phone]
      .filter(Boolean)
      .join(" | ");
  }

  hasReceipt() {
    return Boolean(this.receiptImageUrl);
  }

  canReview() {
    return this.getEffectiveStatus() === "pending_payment_verification";
  }

  hasAdminReport() {
    return Boolean(this.adminReport?.reportId) || this.getEffectiveStatus() === "reported_to_admin";
  }

  getEffectiveStatus() {
    return normalizeParcelReviewStatus(this.status);
  }

  getStatusLabel() {
    switch (this.getEffectiveStatus()) {
      case "pending_payment_verification":
      case "pending_seller_confirmation":
        return "รอตรวจสอบการชำระ";
      case "awaiting_parcel_pickup":
        return "รอรับพัสดุ";
      case "reported_to_admin":
        return "ส่งให้ Admin ตรวจสอบ";
      case "completed":
        return "เสร็จสิ้น";
      case "rejected_by_buyer":
        return "ผู้ซื้อปฏิเสธสินค้า";
      default:
        return this.getEffectiveStatus() || "รอดำเนินการ";
    }
  }
}
