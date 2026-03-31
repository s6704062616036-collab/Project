import { ProductCategory } from "./ProductCategory";
import { ProductSaleLifecycle } from "./ProductSaleLifecycle";

const apiBaseUrl = `${import.meta.env.VITE_API_URL ?? ""}`.trim().replace(/\/+$/, "");

const toAbsoluteApiUrl = (value) => {
  const normalizedValue = `${value ?? ""}`.trim();
  if (!normalizedValue) return "";
  if (/^(?:https?:)?\/\//i.test(normalizedValue)) return normalizedValue;
  if (normalizedValue.startsWith("blob:") || normalizedValue.startsWith("data:")) return normalizedValue;
  if (normalizedValue.startsWith("/")) return apiBaseUrl ? `${apiBaseUrl}${normalizedValue}` : normalizedValue;
  return normalizedValue;
};

export class ShopProduct {
  static AVAILABLE = ProductSaleLifecycle.AVAILABLE;
  static SOLD = ProductSaleLifecycle.SOLD;

  constructor({
    id,
    ownerId,
    shopId,
    shopName,
    shopAvatarUrl,
    name,
    category,
    imageUrl,
    imageUrls,
    price,
    exchangeItem,
    description,
    saleStatus,
    soldAt,
    soldOrderId,
    createdAt,
  } = {}) {
    const normalizedImageUrls = ShopProduct.normalizeImageUrls({
      imageUrl,
      imageUrls,
    });

    this.id = id ?? "";
    this.ownerId = ownerId ?? "";
    this.shopId = shopId ?? "";
    this.shopName = shopName ?? "";
    this.shopAvatarUrl = toAbsoluteApiUrl(shopAvatarUrl);
    this.name = name ?? "";
    this.category = ProductCategory.normalize(category);
    this.imageUrl = normalizedImageUrls[0] ?? "";
    this.imageUrls = normalizedImageUrls;
    this.price = price ?? "";
    this.exchangeItem = exchangeItem ?? "";
    this.description = description ?? "";
    this.saleStatus = ShopProduct.normalizeSaleStatus(saleStatus);
    this.soldAt = soldAt ?? "";
    this.soldOrderId = soldOrderId ?? "";
    this.createdAt = createdAt ?? "";
  }

  static normalizeSaleStatus(value) {
    return ProductSaleLifecycle.normalizeSaleStatus(value);
  }

  static normalizeImageUrls({ imageUrl, imageUrls } = {}) {
    const normalized = (Array.isArray(imageUrls) ? imageUrls : [])
      .map((item) => {
        if (typeof item === "string") return toAbsoluteApiUrl(item);
        if (item && typeof item === "object") {
          return toAbsoluteApiUrl(item.url ?? item.imageUrl ?? item.secure_url ?? item.path ?? "");
        }
        return "";
      })
      .filter(Boolean);

    const normalizedImageUrl = toAbsoluteApiUrl(imageUrl);
    if (normalizedImageUrl && !normalized.includes(normalizedImageUrl)) {
      normalized.unshift(normalizedImageUrl);
    }

    return normalized;
  }

  static empty() {
    return new ShopProduct({
      name: "",
      category: "",
      imageUrl: "",
      imageUrls: [],
      price: "",
      exchangeItem: "",
      description: "",
    });
  }

  static fromJSON(json) {
    const imageUrls =
      json?.imageUrls ??
      json?.images ??
      json?.productImages ??
      (Array.isArray(json?.image) ? json.image : []);
    const imageUrl =
      typeof json?.imageUrl === "string"
        ? json.imageUrl
        : typeof json?.image === "string"
          ? json.image
          : "";

    return new ShopProduct({
      id: json?.id ?? json?._id,
      ownerId: json?.ownerId,
      shopId:
        json?.shopId ??
        json?.shop?.id ??
        json?.shopProfile?.id ??
        json?.seller?.shopId,
      shopName:
        json?.shopName ??
        json?.shop?.shopName ??
        json?.shopProfile?.shopName ??
        json?.shop?.name ??
        json?.seller?.shopName,
      shopAvatarUrl:
        json?.shopAvatarUrl ??
        json?.shop?.avatarUrl ??
        json?.shopProfile?.avatarUrl ??
        json?.seller?.avatarUrl,
      name: json?.name ?? json?.productName ?? json?.title,
      category: json?.category ?? json?.productCategory ?? json?.categoryName,
      imageUrl,
      imageUrls,
      price: json?.price,
      exchangeItem:
        json?.exchangeItem ??
        json?.exchangeWanted ??
        json?.wantedExchangeItem ??
        json?.swapFor,
      description: json?.description,
      saleStatus:
        json?.saleStatus ??
        json?.status ??
        json?.availabilityStatus ??
        json?.inventoryStatus ??
        (json?.isSold ? ShopProduct.SOLD : ShopProduct.AVAILABLE),
      soldAt: json?.soldAt,
      soldOrderId: json?.soldOrderId ?? json?.orderId,
      createdAt: json?.createdAt,
    });
  }

  withPatch(patch = {}) {
    return new ShopProduct({
      ...this,
      ...patch,
    });
  }

  getPriceNumber() {
    const value = Number(this.price);
    if (!Number.isFinite(value) || value < 0) return 0;
    return value;
  }

  getPriceLabel() {
    return new Intl.NumberFormat("th-TH", {
      style: "currency",
      currency: "THB",
      maximumFractionDigits: 2,
    }).format(this.getPriceNumber());
  }

  getImageUrls() {
    if (Array.isArray(this.imageUrls) && this.imageUrls.length) return this.imageUrls;
    return this.imageUrl ? [this.imageUrl] : [];
  }

  getShopDisplayName() {
    return `${this.shopName ?? ""}`.trim() || "ร้านค้าผู้ขาย";
  }

  isSold() {
    return ProductSaleLifecycle.isSoldStatus(this.saleStatus);
  }

  isAvailable() {
    return !this.isSold();
  }

  getSaleStatusLabel() {
    return this.isSold() ? "ขายออกแล้ว" : "พร้อมขาย";
  }

  validate({ imageFiles } = {}) {
    const selectedFiles = Array.isArray(imageFiles)
      ? imageFiles.filter(Boolean)
      : imageFiles
        ? [imageFiles]
        : [];

    if (!this.name.trim()) return "กรุณากรอกชื่อสินค้า";
    if (!ProductCategory.isValid(this.category)) return "กรุณาเลือกหมวดหมู่สินค้า";
    if (this.getPriceNumber() <= 0) return "กรุณากรอกราคาสินค้าให้มากกว่า 0";
    if (!selectedFiles.length && !this.getImageUrls().length) return "กรุณาอัปโหลดรูปภาพสินค้า";
    if (selectedFiles.length > 5) return "อัปโหลดรูปสินค้าได้สูงสุด 5 รูป";
    return "";
  }

  toPayload() {
    return {
      name: this.name.trim(),
      category: this.category,
      price: this.getPriceNumber(),
      exchangeItem: this.exchangeItem.trim(),
      description: this.description.trim(),
      saleStatus: this.saleStatus,
    };
  }
}
