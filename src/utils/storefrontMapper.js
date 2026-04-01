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

const pickFirstNonEmpty = (...values) => {
  for (const value of values) {
    const normalizedValue = `${value ?? ""}`.trim();
    if (normalizedValue) return normalizedValue;
  }

  return "";
};

const mapStorefrontShop = (shop, owner, baseUrl) => {
  if (!shop && !owner) return null;

  return {
    id: shop?._id?.toString?.() ?? "",
    ownerId: owner?._id?.toString?.() ?? shop?.owner?.toString?.() ?? `${shop?.owner ?? ""}`,
    shopName: shop?.shopName ?? owner?.name ?? owner?.username ?? "",
    description: shop?.description ?? "",
    province: shop?.province ?? "",
    email: owner?.email ?? "",
    phone: owner?.phone ?? "",
    citizenId: shop?.citizenId ?? "",
    avatarUrl: toAbsoluteUrl(
      pickFirstNonEmpty(shop?.avatarUrl, owner?.avatarUrl),
      baseUrl,
    ),
    parcelQrCodeUrl: toAbsoluteUrl(shop?.parcelQrCodeUrl ?? "", baseUrl),
    kycStatus: shop?.kycStatus ?? "unsubmitted",
    kycSubmittedAt: shop?.kycSubmittedAt ?? null,
    kycReviewedAt: shop?.kycReviewedAt ?? null,
    kycApprovedAt: shop?.kycApprovedAt ?? null,
    moderationNote: shop?.moderationNote ?? "",
    availableProductsCount: 0,
    soldProductsCount: 0,
  };
};

const mapStorefrontProduct = (product, shop, owner, baseUrl) => ({
  id: product?._id?.toString?.() ?? "",
  ownerId: product?.seller?.toString?.() ?? `${product?.seller ?? ""}`,
  shopId: shop?._id?.toString?.() ?? "",
  shopName: shop?.shopName ?? "",
  province: shop?.province ?? "",
  shopAvatarUrl: toAbsoluteUrl(
    pickFirstNonEmpty(shop?.avatarUrl, owner?.avatarUrl),
    baseUrl,
  ),
  name: product?.title ?? "",
  category: product?.category ?? "",
  imageUrl: toAbsoluteUrl(Array.isArray(product?.images) && product.images.length ? product.images[0] : "", baseUrl),
  imageUrls: Array.isArray(product?.images)
    ? product.images.map((imageUrl) => toAbsoluteUrl(imageUrl, baseUrl)).filter(Boolean)
    : [],
  price: product?.price ?? 0,
  exchangeItem: product?.exchangeItem ?? "",
  description: product?.description ?? "",
  saleStatus: product?.status ?? "available",
  soldAt: product?.soldAt ?? null,
  soldOrderId: product?.soldOrderId ?? "",
  createdAt: product?.createdAt ?? null,
});

module.exports = {
  mapStorefrontShop,
  mapStorefrontProduct,
};
