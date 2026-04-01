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

const normalizeKycStatus = (shop) => {
  const status = `${shop?.kycStatus ?? ""}`.trim();
  if (["pending", "approved", "rejected"].includes(status)) {
    return status;
  }

  return shop?.citizenId || shop?.parcelQrCodeUrl ? "pending" : "unsubmitted";
};

const pickMemberDisplayName = (user = {}) => {
  const normalizedName = `${user?.name ?? ""}`.trim();
  if (normalizedName) return normalizedName;

  const normalizedUsername = `${user?.username ?? ""}`.trim();
  if (normalizedUsername) return normalizedUsername;

  const normalizedEmail = `${user?.email ?? ""}`.trim();
  if (normalizedEmail) return normalizedEmail;

  return "";
};

const mapAdminMember = (user, shop, baseUrl) => ({
  id: user?._id?.toString?.() ?? "",
  name: pickMemberDisplayName(user),
  email: user?.email ?? "",
  phone: user?.phone ?? "",
  avatarUrl: toAbsoluteUrl(user?.avatarUrl, baseUrl),
  username: user?.username ?? "",
  role: user?.role ?? "user",
  banStatus: user?.banStatus ?? "active",
  createdAt: user?.createdAt ?? null,
  reviewedAt: user?.reviewedAt ?? shop?.kycReviewedAt ?? null,
  citizenId: shop?.citizenId ?? "",
  birthDate: shop?.birthDate ?? "",
  kycCitizenId: shop?.citizenId ?? "",
  kycQrCodeUrl: toAbsoluteUrl(shop?.parcelQrCodeUrl, baseUrl),
  kycDocumentUrl: toAbsoluteUrl(shop?.parcelQrCodeUrl, baseUrl),
  kycStatus: normalizeKycStatus(shop),
  kycSubmittedAt: shop?.kycSubmittedAt ?? null,
  kycApprovedAt: shop?.kycApprovedAt ?? null,
  hasPendingKycSubmission: normalizeKycStatus(shop) === "pending",
  moderationNote: user?.moderationNote ?? shop?.moderationNote ?? "",
  shopId: shop?._id?.toString?.() ?? "",
  shopName: shop?.shopName ?? "",
  shopDescription: shop?.description ?? "",
  shop: shop
    ? {
        id: shop._id?.toString?.() ?? "",
        shopName: shop.shopName ?? "",
        description: shop.description ?? "",
        citizenId: shop.citizenId ?? "",
        birthDate: shop.birthDate ?? "",
        parcelQrCodeUrl: toAbsoluteUrl(shop.parcelQrCodeUrl, baseUrl),
        kycStatus: normalizeKycStatus(shop),
        kycSubmittedAt: shop.kycSubmittedAt ?? null,
        kycReviewedAt: shop.kycReviewedAt ?? null,
        kycApprovedAt: shop.kycApprovedAt ?? null,
        moderationNote: shop.moderationNote ?? "",
      }
    : null,
});

const mapDashboardSummary = (summary = {}) => ({
  newMembersCount: Number(summary.newMembersCount) || 0,
  productAnnouncementsCount: Number(summary.productAnnouncementsCount) || 0,
  successfulExchangesCount: Number(summary.successfulExchangesCount) || 0,
  pendingKycCount: Number(summary.pendingKycCount) || 0,
  openReportsCount: Number(summary.openReportsCount) || 0,
});

const mapAdminCategory = (category, productCount = 0) => ({
  id: category?._id?.toString?.() ?? "",
  name: category?.name ?? "",
  description: category?.description ?? "",
  productCount: Number(productCount) || 0,
  createdAt: category?.createdAt ?? null,
  updatedAt: category?.updatedAt ?? null,
});

const mapAdminProduct = (product, { seller = null, shop = null, baseUrl } = {}) => ({
  id: product?._id?.toString?.() ?? "",
  title: product?.title ?? "",
  description: product?.description ?? "",
  category: product?.category ?? "",
  price: Number(product?.price) || 0,
  exchangeItem: product?.exchangeItem ?? "",
  status: product?.status ?? "available",
  imageUrl: toAbsoluteUrl(Array.isArray(product?.images) && product.images.length ? product.images[0] : "", baseUrl),
  imageCount: Array.isArray(product?.images) ? product.images.length : 0,
  sellerId: seller?._id?.toString?.() ?? product?.seller?.toString?.() ?? `${product?.seller ?? ""}`,
  sellerName: seller?.name ?? seller?.username ?? "",
  sellerAvatarUrl: toAbsoluteUrl(seller?.avatarUrl, baseUrl),
  shopId: shop?._id?.toString?.() ?? "",
  shopName: shop?.shopName ?? "",
  kycStatus: normalizeKycStatus(shop),
  createdAt: product?.createdAt ?? null,
  updatedAt: product?.updatedAt ?? null,
});

module.exports = {
  mapAdminMember,
  mapDashboardSummary,
  mapAdminCategory,
  mapAdminProduct,
  toAbsoluteUrl,
};
