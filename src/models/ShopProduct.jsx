import { ProductCategory } from "./ProductCategory";

export class ShopProduct {
  constructor({
    id,
    ownerId,
    name,
    category,
    imageUrl,
    imageUrls,
    price,
    description,
    createdAt,
  } = {}) {
    const normalizedImageUrls = ShopProduct.normalizeImageUrls({
      imageUrl,
      imageUrls,
    });

    this.id = id ?? "";
    this.ownerId = ownerId ?? "";
    this.name = name ?? "";
    this.category = ProductCategory.normalize(category);
    this.imageUrl = normalizedImageUrls[0] ?? "";
    this.imageUrls = normalizedImageUrls;
    this.price = price ?? "";
    this.description = description ?? "";
    this.createdAt = createdAt ?? "";
  }

  static normalizeImageUrls({ imageUrl, imageUrls } = {}) {
    const normalized = (Array.isArray(imageUrls) ? imageUrls : [])
      .map((item) => {
        if (typeof item === "string") return item;
        if (item && typeof item === "object") {
          return item.url ?? item.imageUrl ?? item.secure_url ?? item.path ?? "";
        }
        return "";
      })
      .filter(Boolean);

    if (typeof imageUrl === "string" && imageUrl && !normalized.includes(imageUrl)) {
      normalized.unshift(imageUrl);
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
      name: json?.name ?? json?.productName,
      category: json?.category ?? json?.productCategory ?? json?.categoryName,
      imageUrl,
      imageUrls,
      price: json?.price,
      description: json?.description,
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
    return "";
  }

  toPayload() {
    return {
      name: this.name.trim(),
      category: this.category,
      price: this.getPriceNumber(),
      description: this.description.trim(),
    };
  }
}
