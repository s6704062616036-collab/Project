const toAbsoluteUrl = (value, baseUrl = "") => {
  const normalizedValue = `${value ?? ""}`.trim().replace(/\\/g, "/");
  const normalizedBaseUrl = `${baseUrl ?? ""}`.trim().replace(/\/+$/, "");

  if (!normalizedValue) return "";
  if (/^(?:https?:)?\/\//i.test(normalizedValue)) return normalizedValue;
  if (normalizedValue.startsWith("blob:") || normalizedValue.startsWith("data:")) return normalizedValue;
  if (!normalizedValue.startsWith("/")) return normalizedValue;
  if (!normalizedBaseUrl) return normalizedValue;

  return `${normalizedBaseUrl}${normalizedValue}`;
};

const mapPublicUser = (user, baseUrl = "") => {
  if (!user) return null;

  return {
    id: user._id?.toString?.() ?? user.id ?? "",
    username: user.username ?? "",
    name: user.name || user.username || "",
    avatarUrl: toAbsoluteUrl(user.avatarUrl, baseUrl),
    email: user.email ?? "",
    phone: user.phone ?? "",
    role: user.role ?? "user",
    createdAt: user.createdAt ?? null,
  };
};

const mapPublicShopSummary = (shop, { baseUrl = "", availableProductsCount = 0, soldProductsCount = 0 } = {}) => {
  if (!shop) return null;

  return {
    id: shop._id?.toString?.() ?? shop.id ?? "",
    ownerId: shop.owner?.toString?.() ?? shop.ownerId ?? "",
    shopName: shop.shopName ?? "",
    description: shop.description ?? "",
    province: shop.province ?? "",
    avatarUrl: toAbsoluteUrl(shop.avatarUrl, baseUrl),
    availableProductsCount,
    soldProductsCount,
    kycStatus: shop.kycStatus ?? "unsubmitted",
  };
};

module.exports = {
  mapPublicUser,
  mapPublicShopSummary,
};
