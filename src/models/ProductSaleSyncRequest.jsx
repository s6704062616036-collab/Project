import { ProductSaleLifecycle } from "./ProductSaleLifecycle";

const safeText = (value) => `${value ?? ""}`.trim();

const ensureArray = (value) => {
  if (Array.isArray(value)) return value;
  if (value == null) return [];
  return [value];
};

export class ProductSaleSyncRequest {
  constructor({
    orderId,
    shopOrderKey,
    productIds,
    orderStatus,
    reason,
    changedBy,
    eventAt,
  } = {}) {
    this.orderId = safeText(orderId);
    this.shopOrderKey = safeText(shopOrderKey);
    this.productIds = [...new Set(ensureArray(productIds).map((productId) => safeText(productId)).filter(Boolean))];
    this.orderStatus = ProductSaleLifecycle.normalizeOrderStatus(orderStatus);
    this.reason = safeText(reason);
    this.changedBy = safeText(changedBy);
    this.eventAt = safeText(eventAt);
  }

  static fromJSON(json) {
    return new ProductSaleSyncRequest({
      orderId: json?.orderId,
      shopOrderKey: json?.shopOrderKey,
      productIds: json?.productIds,
      orderStatus: json?.orderStatus,
      reason: json?.reason,
      changedBy: json?.changedBy,
      eventAt: json?.eventAt,
    });
  }

  static fromOrderMutation({
    orderId,
    shopOrderKey,
    productIds,
    orderStatus,
    reason,
    changedBy,
    eventAt,
  } = {}) {
    return new ProductSaleSyncRequest({
      orderId,
      shopOrderKey,
      productIds,
      orderStatus,
      reason,
      changedBy,
      eventAt,
    });
  }

  validate() {
    if (!this.orderId) throw new Error("ไม่พบ orderId สำหรับ sync สถานะสินค้า");
    if (!this.productIds.length) throw new Error("ไม่พบ productIds สำหรับ sync สถานะสินค้า");
    if (!this.orderStatus) throw new Error("ไม่พบ orderStatus สำหรับ sync สถานะสินค้า");
    return "";
  }

  shouldReleaseProducts() {
    return !ProductSaleLifecycle.shouldKeepReserved(this.orderStatus);
  }

  toPayload() {
    return {
      orderId: this.orderId,
      shopOrderKey: this.shopOrderKey,
      productIds: [...this.productIds],
      orderStatus: this.orderStatus,
      reason: this.reason,
      changedBy: this.changedBy,
      eventAt: this.eventAt,
    };
  }
}
