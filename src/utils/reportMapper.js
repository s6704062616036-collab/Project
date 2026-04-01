const toAbsoluteUrl = (value, baseUrl) => {
  const normalizedValue = `${value ?? ""}`.trim();
  const normalizedBaseUrl = `${baseUrl ?? ""}`.trim().replace(/\/+$/, "");

  if (!normalizedValue) return "";
  if (/^(?:https?:)?\/\//i.test(normalizedValue)) return normalizedValue;
  if (normalizedValue.startsWith("blob:") || normalizedValue.startsWith("data:")) return normalizedValue;
  if (normalizedValue.startsWith("/uploads/")) return normalizedValue;
  if (normalizedValue.startsWith("uploads/")) return `/${normalizedValue}`;
  if (normalizedValue.startsWith("/")) {
    return normalizedBaseUrl ? `${normalizedBaseUrl}${normalizedValue}` : normalizedValue;
  }
  return normalizedValue;
};

const mapReport = (report, baseUrl) => ({
  id: report?._id?.toString?.() ?? "",
  reportType: report?.reportType ?? "product",
  productId: report?.productId?.toString?.() ?? `${report?.productId ?? ""}`,
  productOwnerId: report?.productOwnerId?.toString?.() ?? `${report?.productOwnerId ?? ""}`,
  productName: report?.productName ?? "",
  productCategory: report?.productCategory ?? "",
  productImageUrl: toAbsoluteUrl(report?.productImageUrl, baseUrl),
  shopId: report?.shopId?.toString?.() ?? `${report?.shopId ?? ""}`,
  shopOwnerId: report?.shopOwnerId?.toString?.() ?? `${report?.shopOwnerId ?? ""}`,
  shopName: report?.shopName ?? "",
  shopAvatarUrl: toAbsoluteUrl(report?.shopAvatarUrl, baseUrl),
  reporterId: report?.reporterId?.toString?.() ?? `${report?.reporterId ?? ""}`,
  reporterName: report?.reporterName ?? "",
  reason: report?.reason ?? "",
  status: report?.status ?? "open",
  createdAt: report?.createdAt ?? "",
  resolvedAt: report?.resolvedAt ?? "",
  resolutionNote: report?.resolutionNote ?? "",
});

module.exports = {
  mapReport,
};
