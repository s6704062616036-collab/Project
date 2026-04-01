const formatDateTime = (value) => {
  const date = new Date(value ?? "");
  if (!safeText(value) || Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

const safeText = (value) => `${value ?? ""}`.trim();
const apiBaseUrl = `${import.meta.env.VITE_API_URL ?? ""}`.trim().replace(/\/+$/, "");

const toAbsoluteApiUrl = (value) => {
  const normalizedValue = safeText(value).replace(/\\/g, "/");
  if (!normalizedValue) return "";
  if (/^(?:https?:)?\/\//i.test(normalizedValue)) return normalizedValue;
  if (normalizedValue.startsWith("blob:") || normalizedValue.startsWith("data:")) return normalizedValue;
  if (normalizedValue.startsWith("/uploads/")) {
    return apiBaseUrl && apiBaseUrl !== "/api" ? `${apiBaseUrl}${normalizedValue}` : normalizedValue;
  }
  if (normalizedValue.startsWith("uploads/")) {
    return apiBaseUrl && apiBaseUrl !== "/api" ? `${apiBaseUrl}/${normalizedValue}` : `/${normalizedValue}`;
  }
  if (normalizedValue.startsWith("/")) return apiBaseUrl ? `${apiBaseUrl}${normalizedValue}` : normalizedValue;
  return normalizedValue;
};

export class AdminProductReport {
  constructor({
    id,
    reportType,
    productId,
    productOwnerId,
    productName,
    productCategory,
    productImageUrl,
    shopId,
    shopOwnerId,
    shopName,
    shopAvatarUrl,
    reporterId,
    reporterName,
    reason,
    status,
    createdAt,
    resolvedAt,
    resolutionNote,
  } = {}) {
    this.id = id ?? "";
    this.reportType = `${reportType ?? ""}`.trim() || "product";
    this.productId = productId ?? "";
    this.productOwnerId = productOwnerId ?? "";
    this.productName = productName ?? "";
    this.productCategory = productCategory ?? "";
    this.productImageUrl = toAbsoluteApiUrl(productImageUrl);
    this.shopId = shopId ?? "";
    this.shopOwnerId = shopOwnerId ?? "";
    this.shopName = shopName ?? "";
    this.shopAvatarUrl = toAbsoluteApiUrl(shopAvatarUrl);
    this.reporterId = reporterId ?? "";
    this.reporterName = reporterName ?? "";
    this.reason = reason ?? "";
    this.status = status ?? "open";
    this.createdAt = createdAt ?? "";
    this.resolvedAt = resolvedAt ?? "";
    this.resolutionNote = resolutionNote ?? "";
  }

  static fromJSON(json) {
    return new AdminProductReport({
      id: json?.id ?? json?._id,
      reportType: json?.reportType ?? json?.type ?? json?.targetType,
      productId: json?.productId,
      productOwnerId: json?.productOwnerId ?? json?.ownerId,
      productName: json?.productName,
      productCategory: json?.productCategory,
      productImageUrl: json?.productImageUrl,
      shopId: json?.shopId,
      shopOwnerId: json?.shopOwnerId ?? json?.ownerId,
      shopName: json?.shopName ?? json?.merchantName,
      shopAvatarUrl: json?.shopAvatarUrl ?? json?.avatarUrl,
      reporterId: json?.reporterId,
      reporterName: json?.reporterName,
      reason: json?.reason,
      status: json?.status,
      createdAt: json?.createdAt,
      resolvedAt: json?.resolvedAt,
      resolutionNote: json?.resolutionNote,
    });
  }

  isProductReport() {
    return safeText(this.reportType) !== "shop";
  }

  isShopReport() {
    return safeText(this.reportType) === "shop";
  }

  isOpen() {
    return safeText(this.status) === "open";
  }

  isTakenDown() {
    return safeText(this.status) === "taken_down";
  }

  getStatusLabel() {
    switch (safeText(this.status)) {
      case "dismissed":
        return this.isShopReport() ? "ลบรายงานแล้ว" : "ปฏิเสธรายงาน";
      case "taken_down":
        return this.isShopReport() ? "ดำเนินการแล้ว" : "ลบสินค้าแล้ว";
      default:
        return "รอตรวจสอบ";
    }
  }

  getTargetName() {
    return this.isShopReport()
      ? this.shopName || "ไม่ระบุร้านค้า"
      : this.productName || "ไม่ระบุสินค้า";
  }

  getPreviewImageUrl() {
    return this.isShopReport() ? this.shopAvatarUrl : this.productImageUrl;
  }

  getMetadataLabel() {
    return this.isShopReport()
      ? `ร้านค้า | ผู้รายงาน: ${this.reporterName || "-"}`
      : `หมวดหมู่: ${this.productCategory || "-"} | ผู้รายงาน: ${this.reporterName || "-"}`;
  }

  getCreatedAtLabel() {
    return formatDateTime(this.createdAt);
  }

  getResolvedAtLabel() {
    return formatDateTime(this.resolvedAt);
  }
}
