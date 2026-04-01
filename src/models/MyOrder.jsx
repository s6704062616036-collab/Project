import { ParcelPaymentRecord } from "./ParcelPaymentRecord";
import { ShippingMethod } from "./ShippingMethod";
import { composeStructuredAddress, getAddressFieldLine, getAddressLocationLine } from "../utils/addressFormatter";

const safeText = (value) => `${value ?? ""}`.trim();
const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};
const ensureArray = (value) => (Array.isArray(value) ? value : value == null ? [] : [value]);

const getByPath = (source, path = []) =>
  ensureArray(path).reduce(
    (current, key) => (current && typeof current === "object" ? current[key] : undefined),
    source,
  );

const pickFirstDefined = (source, paths = []) => {
  for (const path of paths) {
    const value = getByPath(source, path);
    if (value !== undefined && value !== null) return value;
  }
  return undefined;
};

const pickArray = (source, paths = []) => {
  const value = pickFirstDefined(source, paths);
  return Array.isArray(value) ? value : [];
};

const normalizeParcelWorkflowStatus = (value) => ParcelPaymentRecord.normalizeStatus(value);

const normalizeMeetupWorkflowStatus = (value) => {
  const normalized = safeText(value).toLowerCase();

  if (["pending_seller_response", "pending_meetup_response", "pending"].includes(normalized)) {
    return "pending_meetup_response";
  }
  if (["accepted", "confirmed", "awaiting_meetup"].includes(normalized)) {
    return "awaiting_meetup";
  }
  if (["awaiting_buyer_confirmation", "buyer_confirmation_pending"].includes(normalized)) {
    return "awaiting_buyer_confirmation";
  }
  if (["countered", "countered_by_seller"].includes(normalized)) {
    return "countered_by_seller";
  }
  if (["cancelled_by_seller", "seller_cancelled"].includes(normalized)) {
    return "cancelled_by_seller";
  }
  if (["completed", "done"].includes(normalized)) {
    return "completed";
  }
  if (["rejected_by_buyer", "buyer_rejected"].includes(normalized)) {
    return "rejected_by_buyer";
  }

  return normalized;
};

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

export class MyOrderItem {
  constructor({ itemId, productId, name, imageUrl, price, quantity } = {}) {
    this.itemId = itemId ?? "";
    this.productId = productId ?? "";
    this.name = name ?? "";
    this.imageUrl = imageUrl ?? "";
    this.price = toNumber(price, 0);
    this.quantity = Math.max(1, toNumber(quantity, 1));
  }

  static fromJSON(json) {
    return new MyOrderItem({
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

export class MyOrderShopOrder {
  constructor({
    ownerId,
    shopId,
    shopName,
    shippingMethod,
    status,
    items,
    subtotal,
    meetupProposal,
    parcelPayment,
    parcelShipment,
    adminReport,
    buyerShippingAddress,
  } = {}) {
    this.ownerId = ownerId ?? "";
    this.shopId = shopId ?? "";
    this.shopName = shopName ?? "ร้านค้า";
    this.shippingMethod = ShippingMethod.normalize(shippingMethod);
    this.status = status ?? "";
    this.items = ensureArray(items).map((item) =>
      item instanceof MyOrderItem ? item : MyOrderItem.fromJSON(item),
    );
    this.subtotal = toNumber(
      subtotal,
      this.items.reduce((sum, item) => sum + item.getLineTotalNumber(), 0),
    );
    this.meetupProposal = meetupProposal
      ? {
          location: safeText(meetupProposal.location),
          status: safeText(meetupProposal.status),
          proposedBy: safeText(meetupProposal.proposedBy),
          proposedAt: safeText(meetupProposal.proposedAt),
          responseLocation: safeText(meetupProposal.responseLocation),
          respondedBy: safeText(meetupProposal.respondedBy),
          respondedAt: safeText(meetupProposal.respondedAt),
        }
      : null;
    this.parcelPayment =
      parcelPayment instanceof ParcelPaymentRecord
        ? parcelPayment
        : ParcelPaymentRecord.fromJSON(parcelPayment);
    this.parcelShipment = parcelShipment
      ? {
          trackingNumber: safeText(parcelShipment.trackingNumber),
          carrier: safeText(parcelShipment.carrier),
          status: safeText(parcelShipment.status),
          note: safeText(parcelShipment.note),
          preparedAt: safeText(parcelShipment.preparedAt),
          shippedAt: safeText(parcelShipment.shippedAt),
          updatedAt: safeText(parcelShipment.updatedAt),
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
    this.buyerShippingAddress = buyerShippingAddress
      ? {
          addressId: safeText(buyerShippingAddress.addressId),
          label: safeText(buyerShippingAddress.label),
          name: safeText(buyerShippingAddress.name),
          phone: safeText(buyerShippingAddress.phone),
          houseNo: safeText(buyerShippingAddress.houseNo),
          village: safeText(buyerShippingAddress.village),
          district: safeText(buyerShippingAddress.district),
          province: safeText(buyerShippingAddress.province),
          postalCode: safeText(buyerShippingAddress.postalCode),
          note: safeText(buyerShippingAddress.note),
          address:
            composeStructuredAddress(buyerShippingAddress) || safeText(buyerShippingAddress.address),
        }
      : null;
  }

  static fromJSON(json) {
    const parcelPayment = ParcelPaymentRecord.fromJSON(json);
    const meetupProposal =
      json?.meetupProposal && typeof json.meetupProposal === "object"
        ? json.meetupProposal
        : json?.meetup && typeof json.meetup === "object"
          ? json.meetup
          : null;
    const items = ensureArray(json?.items ?? json?.orderItems ?? json?.products).map((item) =>
      MyOrderItem.fromJSON(item),
    );
    const buyerShippingAddress =
      json?.buyerShippingAddress && typeof json.buyerShippingAddress === "object"
        ? json.buyerShippingAddress
        : json?.shippingAddress && typeof json.shippingAddress === "object"
          ? json.shippingAddress
          : null;
    const parcelShipment =
      json?.parcelShipment && typeof json.parcelShipment === "object"
        ? json.parcelShipment
        : json?.shipment && typeof json.shipment === "object"
          ? json.shipment
          : null;
    const inferredShippingMethod =
      json?.shippingMethod ??
      json?.deliveryMethod ??
      json?.shippingType ??
      (ParcelPaymentRecord.looksLikeParcelPayload(json) ? ShippingMethod.PARCEL : null) ??
      (meetupProposal ? ShippingMethod.MEETUP : null);
    const normalizedShippingMethod = ShippingMethod.normalize(inferredShippingMethod);
    const normalizedStatus = ShippingMethod.isParcel(normalizedShippingMethod)
      ? ParcelPaymentRecord.resolveWorkflowStatus([
          parcelShipment?.status,
          json?.status,
          json?.orderStatus,
          json?.paymentStatus,
          json?.reviewStatus,
          json?.verificationStatus,
          json?.parcelPaymentStatus,
          json?.receiptStatus,
          parcelPayment?.status,
        ])
      : normalizeMeetupWorkflowStatus(
          json?.status ?? json?.meetupStatus ?? meetupProposal?.status,
        );

    return new MyOrderShopOrder({
      ownerId: json?.ownerId ?? json?.sellerId ?? json?.shopOwnerId,
      shopId: json?.shopId ?? json?.shop?._id ?? json?.shop?.id,
      shopName: json?.shopName ?? json?.sellerShopName ?? json?.shop?.shopName ?? json?.shop?.name,
      shippingMethod: normalizedShippingMethod,
      status: normalizedStatus,
      items,
      subtotal: json?.subtotal ?? json?.totalPrice ?? json?.total ?? json?.amount,
      meetupProposal,
      parcelPayment,
      parcelShipment,
      adminReport: json?.adminReport ?? json?.report,
      buyerShippingAddress,
    });
  }

  getShippingMethodLabel() {
    return ShippingMethod.getLabel(this.shippingMethod);
  }

  getSubtotalLabel() {
    return formatCurrency(this.subtotal);
  }

  getIdentityKey() {
    return safeText(this.shopId || this.ownerId);
  }

  getEffectiveStatus() {
    const currentStatus = safeText(this.status);
    const shipmentStatus = ParcelPaymentRecord.normalizeStatus(this.parcelShipment?.status);

    if (ShippingMethod.isParcel(this.shippingMethod)) {
      return ParcelPaymentRecord.resolveWorkflowStatus([
        shipmentStatus,
        this.parcelPayment?.status,
        currentStatus,
      ]);
    }

    if (ShippingMethod.isMeetup(this.shippingMethod)) {
      const meetupStatus = normalizeMeetupWorkflowStatus(this.meetupProposal?.status);
      if (meetupStatus) return meetupStatus;
    }

    return ShippingMethod.isParcel(this.shippingMethod)
      ? normalizeParcelWorkflowStatus(currentStatus)
      : normalizeMeetupWorkflowStatus(currentStatus);
  }

  canBuyerManageOrder() {
    return ![
      "completed",
      "rejected",
      "rejected_by_buyer",
      "cancelled",
      "cancelled_by_seller",
      "pending_payment_verification",
      "preparing_parcel",
      "awaiting_parcel_pickup",
      "pending_seller_confirmation",
      "pending_meetup_response",
      "reported_to_admin",
    ].includes(this.getEffectiveStatus());
  }

  getRecipientLine() {
    if (!this.buyerShippingAddress) return "";
    return [this.buyerShippingAddress.name, this.buyerShippingAddress.phone]
      .filter(Boolean)
      .join(" | ");
  }
  getBuyerAddressFieldLine() {
    return this.buyerShippingAddress ? getAddressFieldLine(this.buyerShippingAddress) : "";
  }
  getBuyerAddressLocationLine() {
    return this.buyerShippingAddress ? getAddressLocationLine(this.buyerShippingAddress) : "";
  }
  getBuyerAddressNote() {
    return safeText(this.buyerShippingAddress?.note);
  }
  getTrackingLine() {
    if (!this.parcelShipment?.trackingNumber) return "";
    return [this.parcelShipment.carrier, this.parcelShipment.trackingNumber]
      .filter(Boolean)
      .join(" | ");
  }

  getShipmentUpdatedAtLabel() {
    return formatDateTime(
      this.parcelShipment?.shippedAt ||
      this.parcelShipment?.preparedAt ||
      this.parcelShipment?.updatedAt,
    );
  }

  getStatusLabel() {
    switch (this.getEffectiveStatus()) {
      case "pending_payment_verification":
        return this.parcelPayment?.getPendingReviewLabel?.() ?? "รอตรวจสอบสลิป";
      case "pending_seller_confirmation":
        return "รอยืนยันคำสั่งซื้อ";
      case "preparing_parcel":
        return "กำลังเตรียมพัสดุ";
      case "awaiting_parcel_pickup":
        return "รอรับพัสดุ";
      case "parcel_in_transit":
        return "จัดส่งพัสดุแล้ว";
      case "pending_meetup_response":
      case "pending_seller_response":
        return "รอตอบกลับจุดนัดรับ";
      case "awaiting_meetup":
        return "รอนัดพบ";
      case "awaiting_buyer_confirmation":
        return "รอผู้ซื้อยืนยันรับของ";
      case "countered_by_seller":
        return "คนขายเสนอจุดใหม่";
      case "cancelled_by_seller":
        return "ยกเลิกการนัดรับ";
      case "rejected_by_buyer":
        return "ผู้ซื้อปฏิเสธสินค้า";
      case "reported_to_admin":
        return "ส่งให้ Admin ตรวจสอบ";
      case "approved":
      case "accepted":
      case "confirmed":
      case "completed":
        return "ยืนยันแล้ว";
      case "cancelled":
        return "ยกเลิกคำสั่งซื้อ";
      case "rejected":
        return "ถูกปฏิเสธ";
      default:
        return this.getEffectiveStatus() || "รอดำเนินการ";
    }
  }
}

export class MyOrder {
  constructor({ id, userId, status, notes, items, totalPrice, createdAt, shopOrders } = {}) {
    this.id = id ?? "";
    this.userId = userId ?? "";
    this.status = status ?? "";
    this.notes = notes ?? "";
    this.items = ensureArray(items).map((item) =>
      item instanceof MyOrderItem ? item : MyOrderItem.fromJSON(item),
    );
    this.totalPrice = toNumber(
      totalPrice,
      this.items.reduce((sum, item) => sum + item.getLineTotalNumber(), 0),
    );
    this.createdAt = createdAt ?? "";
    this.shopOrders = ensureArray(shopOrders).map((shopOrder) =>
      shopOrder instanceof MyOrderShopOrder ? shopOrder : MyOrderShopOrder.fromJSON(shopOrder),
    );
  }

  static fromJSON(json) {
    const fallbackItems = ensureArray(json?.items).map((item) => MyOrderItem.fromJSON(item));
    const fallbackShippingMethod = ShippingMethod.normalize(
      json?.shippingMethod ??
        json?.deliveryMethod ??
        json?.shippingType ??
        (ParcelPaymentRecord.looksLikeParcelPayload(json) ? ShippingMethod.PARCEL : ShippingMethod.MEETUP),
    );
    const rawShopOrders = pickArray(json, [
      ["shopOrders"],
      ["sellerOrders"],
      ["subOrders"],
      ["orderShops"],
      ["shops"],
    ]);
    const normalizedShopOrders = rawShopOrders.length
      ? rawShopOrders
        : [
            {
              ownerId: json?.ownerId ?? json?.sellerId ?? json?.shopOwnerId,
              shopId: json?.shopId ?? json?.shop?._id ?? json?.shop?.id,
              shopName: json?.shopName ?? json?.shop?.shopName ?? json?.shop?.name ?? "คำสั่งซื้อ",
              shippingMethod: fallbackShippingMethod,
              status: json?.status ?? json?.orderStatus,
              items: fallbackItems,
              subtotal: json?.subtotal ?? json?.totalPrice ?? json?.total ?? json?.amount,
              meetupProposal: json?.meetupProposal ?? json?.meetup,
              parcelPayment: ParcelPaymentRecord.fromJSON(json),
              parcelShipment: json?.parcelShipment ?? json?.shipment,
              adminReport: json?.adminReport ?? json?.report,
              buyerShippingAddress: json?.buyerShippingAddress ?? json?.shippingAddress,
            },
          ];

    return new MyOrder({
      id: json?.id ?? json?._id,
      userId: json?.userId ?? json?.buyerId ?? json?.user?.id ?? json?.buyer?.id,
      status: json?.status ?? json?.orderStatus ?? json?.paymentStatus,
      notes: json?.notes,
      items: fallbackItems,
      totalPrice: json?.totalPrice ?? json?.total ?? json?.amount,
      createdAt: json?.createdAt ?? json?.orderedAt ?? json?.orderDate,
      shopOrders: normalizedShopOrders,
    });
  }

  getTotalPriceLabel() {
    return formatCurrency(this.totalPrice);
  }

  getCreatedAtLabel() {
    return formatDateTime(this.createdAt);
  }

  getEffectiveStatus() {
    const shopOrderStatuses = ensureArray(this.shopOrders)
      .map((shopOrder) =>
        typeof shopOrder?.getEffectiveStatus === "function"
          ? shopOrder.getEffectiveStatus()
          : safeText(shopOrder?.status),
      )
      .filter(Boolean);

    if (!shopOrderStatuses.length) {
      const rawStatus = safeText(this.status);
      const normalizedParcelStatus = normalizeParcelWorkflowStatus(rawStatus);
      if (normalizedParcelStatus && normalizedParcelStatus !== rawStatus) {
        return normalizedParcelStatus;
      }
      return normalizeMeetupWorkflowStatus(rawStatus);
    }

    if (shopOrderStatuses.every((status) => status === "completed")) {
      return "completed";
    }

    if (shopOrderStatuses.some((status) => status === "reported_to_admin")) {
      return "reported_to_admin";
    }

    if (shopOrderStatuses.some((status) => status === "rejected_by_buyer")) {
      return "rejected_by_buyer";
    }

    if (shopOrderStatuses.every((status) => status === "cancelled")) {
      return "cancelled";
    }

    if (shopOrderStatuses.every((status) => status === "cancelled_by_seller")) {
      return "cancelled_by_seller";
    }

    if (shopOrderStatuses.some((status) => status === "parcel_in_transit")) {
      return "parcel_in_transit";
    }

    if (shopOrderStatuses.some((status) => status === "preparing_parcel")) {
      return "preparing_parcel";
    }

    if (shopOrderStatuses.some((status) => status === "awaiting_parcel_pickup")) {
      return "awaiting_parcel_pickup";
    }

    if (shopOrderStatuses.some((status) => status === "awaiting_buyer_confirmation")) {
      return "awaiting_buyer_confirmation";
    }

    if (shopOrderStatuses.some((status) => status === "awaiting_meetup")) {
      return "awaiting_meetup";
    }

    if (shopOrderStatuses.some((status) => status === "countered_by_seller")) {
      return "countered_by_seller";
    }

    if (shopOrderStatuses.some((status) => status === "pending_payment_verification")) {
      return "pending_payment_verification";
    }

    if (shopOrderStatuses.some((status) => status === "pending_meetup_response")) {
      return "pending_meetup_response";
    }

    const rawStatus = safeText(this.status);
    const normalizedParcelStatus = normalizeParcelWorkflowStatus(rawStatus);
    if (normalizedParcelStatus && normalizedParcelStatus !== rawStatus) {
      return normalizedParcelStatus;
    }
    return normalizeMeetupWorkflowStatus(rawStatus);
  }

  getStatusLabel() {
    switch (this.getEffectiveStatus()) {
      case "pending_seller_action":
        return "รอร้านค้าดำเนินการ";
      case "pending_payment_verification":
      case "pending_seller_confirmation":
        return "รอตรวจสอบการชำระ";
      case "preparing_parcel":
        return "ร้านกำลังเตรียมพัสดุ";
      case "parcel_in_transit":
        return "จัดส่งพัสดุแล้ว";
      case "pending_meetup_response":
      case "pending_seller_response":
        return "รอตอบกลับจุดนัดรับ";
      case "awaiting_parcel_pickup":
        return "รอรับพัสดุ";
      case "awaiting_meetup":
        return "รอนัดพบ";
      case "awaiting_buyer_confirmation":
        return "รอผู้ซื้อยืนยันรับของ";
      case "countered_by_seller":
        return "คนขายเสนอจุดใหม่";
      case "cancelled_by_seller":
        return "ยกเลิกการนัดรับ";
      case "rejected_by_buyer":
        return "ผู้ซื้อปฏิเสธสินค้า";
      case "reported_to_admin":
        return "ส่งให้ Admin ตรวจสอบ";
      case "approved":
      case "accepted":
      case "confirmed":
      case "completed":
        return "เสร็จสิ้น";
      case "rejected":
      case "cancelled":
        return "ยกเลิก";
      default:
        return this.getEffectiveStatus() || "รอตรวจสอบ";
    }
  }
}
