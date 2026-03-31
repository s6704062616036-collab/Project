const formatDateTime = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

export class AdminManagedProduct {
  constructor({
    id = "",
    title = "",
    description = "",
    category = "",
    price = 0,
    exchangeItem = "",
    status = "available",
    imageUrl = "",
    imageCount = 0,
    sellerId = "",
    sellerName = "",
    sellerAvatarUrl = "",
    shopId = "",
    shopName = "",
    kycStatus = "unsubmitted",
    createdAt = "",
    updatedAt = "",
  } = {}) {
    this.id = id;
    this.title = title;
    this.description = description;
    this.category = category;
    this.price = Number(price) || 0;
    this.exchangeItem = exchangeItem;
    this.status = status;
    this.imageUrl = imageUrl;
    this.imageCount = Number(imageCount) || 0;
    this.sellerId = sellerId;
    this.sellerName = sellerName;
    this.sellerAvatarUrl = sellerAvatarUrl;
    this.shopId = shopId;
    this.shopName = shopName;
    this.kycStatus = kycStatus;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  static fromJSON(payload = {}) {
    return new AdminManagedProduct({
      id: payload?.id ?? payload?._id ?? "",
      title: payload?.title ?? payload?.name ?? "",
      description: payload?.description ?? "",
      category: payload?.category ?? "",
      price: payload?.price ?? 0,
      exchangeItem: payload?.exchangeItem ?? "",
      status: payload?.status ?? payload?.saleStatus ?? "available",
      imageUrl: payload?.imageUrl ?? payload?.primaryImageUrl ?? "",
      imageCount: payload?.imageCount ?? payload?.imagesCount ?? 0,
      sellerId: payload?.sellerId ?? payload?.ownerId ?? "",
      sellerName: payload?.sellerName ?? payload?.ownerName ?? "",
      sellerAvatarUrl: payload?.sellerAvatarUrl ?? "",
      shopId: payload?.shopId ?? "",
      shopName: payload?.shopName ?? "",
      kycStatus: payload?.kycStatus ?? "unsubmitted",
      createdAt: payload?.createdAt ?? "",
      updatedAt: payload?.updatedAt ?? "",
    });
  }

  getPriceLabel() {
    return `฿${this.price.toLocaleString("th-TH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }

  getStatusLabel() {
    switch (`${this.status ?? ""}`.trim()) {
      case "sold":
        return "ขายแล้ว";
      case "hidden":
        return "ซ่อนอยู่";
      case "draft":
        return "ฉบับร่าง";
      default:
        return "พร้อมขาย";
    }
  }

  getKycStatusLabel() {
    switch (`${this.kycStatus ?? ""}`.trim()) {
      case "approved":
        return "KYC อนุมัติแล้ว";
      case "rejected":
        return "KYC ไม่ผ่าน";
      case "pending":
        return "KYC รอตรวจ";
      default:
        return "ยังไม่ส่ง KYC";
    }
  }

  getCreatedAtLabel() {
    return formatDateTime(this.createdAt);
  }
}
