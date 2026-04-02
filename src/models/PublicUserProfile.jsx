import { User } from "./User";

const safeText = (value) => `${value ?? ""}`.trim();

const ensureObject = (value) => (value && typeof value === "object" ? value : {});

const pickFirstDefined = (source, keys = []) => {
  for (const key of keys) {
    const value = source?.[key];
    if (value !== undefined && value !== null) return value;
  }
  return undefined;
};

const toIsoString = (value) => {
  const date = new Date(value ?? "");
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString();
};

export class PublicUserProfile {
  constructor({ user, shop } = {}) {
    this.user = user instanceof User ? user : User.fromJSON(user ?? {});
    this.shop = ensureObject(shop);
    this.createdAt = toIsoString(this.user?.createdAt);
  }

  static fromJSON(json) {
    const source = ensureObject(json);
    return new PublicUserProfile({
      user: pickFirstDefined(source, ["user", "profileUser", "member"]) ?? {},
      shop: pickFirstDefined(source, ["shop", "shopSummary", "sellerShop"]) ?? null,
    });
  }

  static empty(userId = "") {
    return new PublicUserProfile({
      user: { id: userId },
      shop: null,
    });
  }

  hasUser() {
    return Boolean(safeText(this.user?.id) || safeText(this.user?.name) || safeText(this.user?.username));
  }

  hasShop() {
    return Boolean(safeText(this.shop?.ownerId) || safeText(this.shop?.shopName));
  }

  getDisplayName() {
    return safeText(this.user?.name) || safeText(this.user?.username) || "ผู้ใช้งาน";
  }

  getUsernameLabel() {
    return "";
  }

  getJoinedAtLabel(locale = "th-TH") {
    if (!this.createdAt) return "-";
    const date = new Date(this.createdAt);
    if (Number.isNaN(date.getTime())) return "-";

    return new Intl.DateTimeFormat(locale, {
      dateStyle: "medium",
    }).format(date);
  }

  getRoleLabel() {
    if (this.hasShop()) return "ผู้ขาย";
    return "ลูกค้า";
  }

  getShopName() {
    return safeText(this.shop?.shopName) || "ร้านค้าผู้ขาย";
  }

  getShopDescription() {
    return safeText(this.shop?.description);
  }

  getShopAvatarUrl() {
    return safeText(this.shop?.avatarUrl);
  }

  getAvailableProductsCount() {
    const count = Number(this.shop?.availableProductsCount);
    return Number.isFinite(count) && count >= 0 ? count : 0;
  }
}
