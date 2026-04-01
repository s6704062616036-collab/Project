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

const safeText = (value) => `${value ?? ""}`.trim();

const splitPersonName = (value) => {
  const parts = safeText(value).split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] ?? "",
    lastName: parts.slice(1).join(" "),
  };
};

const normalizeComparableName = (value) =>
  safeText(value)
    .toLowerCase()
    .replace(/[^a-z0-9ก-๙]/g, "");

const normalizeKycStatus = (shop) => {
  const status = `${shop?.kycStatus ?? ""}`.trim();
  if (["pending", "approved", "rejected"].includes(status)) {
    return status;
  }

  return shop?.citizenId || shop?.parcelQrCodeUrl ? "pending" : "unsubmitted";
};

const pickMemberDisplayName = (user = {}) => {
  const normalizedName = safeText(user?.name);
  if (normalizedName) return normalizedName;

  const normalizedUsername = safeText(user?.username);
  if (normalizedUsername) return normalizedUsername;

  const normalizedEmail = safeText(user?.email);
  if (normalizedEmail) return normalizedEmail;

  return "";
};

const mapAdminMember = (user, shop, baseUrl) => {
  const displayName = pickMemberDisplayName(user);
  const { firstName, lastName } = splitPersonName(displayName);
  const bankAccountName = safeText(shop?.bankAccountName);
  const bankAccountNameMatchesUserName =
    normalizeComparableName(displayName) && normalizeComparableName(bankAccountName)
      ? normalizeComparableName(displayName) === normalizeComparableName(bankAccountName)
      : null;

  return {
    id: user?._id?.toString?.() ?? "",
    name: displayName,
    firstName,
    lastName,
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
    bankName: shop?.bankName ?? "",
    bankAccountName,
    bankAccountNumber: shop?.bankAccountNumber ?? "",
    bankAccountNameMatchesUserName,
    shop: shop
      ? {
          id: shop._id?.toString?.() ?? "",
          shopName: shop.shopName ?? "",
          description: shop.description ?? "",
          citizenId: shop.citizenId ?? "",
          birthDate: shop.birthDate ?? "",
          bankName: shop.bankName ?? "",
          bankAccountName,
          bankAccountNumber: shop.bankAccountNumber ?? "",
          parcelQrCodeUrl: toAbsoluteUrl(shop.parcelQrCodeUrl, baseUrl),
          kycStatus: normalizeKycStatus(shop),
          kycSubmittedAt: shop.kycSubmittedAt ?? null,
          kycReviewedAt: shop.kycReviewedAt ?? null,
          kycApprovedAt: shop.kycApprovedAt ?? null,
          moderationNote: shop.moderationNote ?? "",
        }
      : null,
  };
};

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
