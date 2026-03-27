const safeText = (value) => `${value ?? ""}`.trim();

const toCreatedAtTime = (value) => {
  const unixMs = new Date(value ?? 0).getTime();
  if (!Number.isFinite(unixMs)) return 0;
  return unixMs;
};

export class ProductSaleLifecycle {
  static AVAILABLE = "available";
  static SOLD = "sold";

  static RELEASED_ORDER_STATUSES = new Set([
    "cancelled",
    "cancelled_by_seller",
    "rejected",
    "rejected_by_buyer",
  ]);

  static normalizeSaleStatus(value) {
    const normalized = safeText(value).toLowerCase();
    return normalized === ProductSaleLifecycle.SOLD
      ? ProductSaleLifecycle.SOLD
      : ProductSaleLifecycle.AVAILABLE;
  }

  static normalizeOrderStatus(value) {
    return safeText(value).toLowerCase();
  }

  static isSoldStatus(value) {
    return ProductSaleLifecycle.normalizeSaleStatus(value) === ProductSaleLifecycle.SOLD;
  }

  static isAvailableStatus(value) {
    return !ProductSaleLifecycle.isSoldStatus(value);
  }

  static shouldKeepReserved(orderStatus) {
    const normalizedStatus = ProductSaleLifecycle.normalizeOrderStatus(orderStatus);
    if (!normalizedStatus) return false;
    return !ProductSaleLifecycle.RELEASED_ORDER_STATUSES.has(normalizedStatus);
  }

  static createAvailableState() {
    return {
      saleStatus: ProductSaleLifecycle.AVAILABLE,
      soldAt: "",
      soldOrderId: "",
    };
  }

  static createSoldState({ orderId = "", soldAt = "" } = {}) {
    return {
      saleStatus: ProductSaleLifecycle.SOLD,
      soldAt: safeText(soldAt),
      soldOrderId: safeText(orderId),
    };
  }

  static deriveState({ orderReferences = [], fallbackSoldAt = "" } = {}) {
    const normalizedReferences = Array.isArray(orderReferences)
      ? orderReferences
          .map((reference) => ({
            orderId: safeText(reference?.orderId),
            orderStatus: ProductSaleLifecycle.normalizeOrderStatus(reference?.orderStatus),
            createdAt: safeText(reference?.createdAt),
          }))
          .filter((reference) => ProductSaleLifecycle.shouldKeepReserved(reference.orderStatus))
      : [];

    if (!normalizedReferences.length) {
      return ProductSaleLifecycle.createAvailableState();
    }

    const latestReference = normalizedReferences.reduce((latest, current) => {
      if (!latest) return current;
      return toCreatedAtTime(current.createdAt) >= toCreatedAtTime(latest.createdAt)
        ? current
        : latest;
    }, null);

    return ProductSaleLifecycle.createSoldState({
      orderId: latestReference?.orderId,
      soldAt: latestReference?.createdAt || fallbackSoldAt,
    });
  }
}
