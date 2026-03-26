import { ChatMessage } from "./ChatMessage";

const safeText = (value) => `${value ?? ""}`.trim();

const toIsoString = (value) => {
  const date = new Date(value ?? "");
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString();
};

export class ChatRoom {
  constructor({
    id,
    productId,
    productName,
    ownerId,
    buyerId,
    sellerId,
    sellerName,
    sellerAvatarUrl,
    counterpartId,
    counterpartName,
    counterpartAvatarUrl,
    lastMessage,
    createdAt,
    updatedAt,
  } = {}) {
    this.id = id ?? "";
    this.productId = productId ?? "";
    this.productName = productName ?? "";
    this.ownerId = ownerId ?? "";
    this.buyerId = buyerId ?? "";
    this.sellerId = sellerId ?? "";
    this.sellerName = sellerName ?? "";
    this.sellerAvatarUrl = sellerAvatarUrl ?? "";
    this.counterpartId = counterpartId ?? "";
    this.counterpartName = counterpartName ?? "";
    this.counterpartAvatarUrl = counterpartAvatarUrl ?? "";
    this.lastMessage = lastMessage instanceof ChatMessage ? lastMessage : ChatMessage.fromJSON(lastMessage);
    this.createdAt = toIsoString(createdAt);
    this.updatedAt = toIsoString(updatedAt);
  }

  static fromJSON(json) {
    return new ChatRoom({
      id: json?.id ?? json?._id ?? "",
      productId: json?.productId ?? "",
      productName: json?.productName ?? "",
      ownerId: json?.ownerId ?? "",
      buyerId: json?.buyerId ?? "",
      sellerId: json?.sellerId ?? json?.ownerId ?? "",
      sellerName: json?.sellerName ?? "",
      sellerAvatarUrl: json?.sellerAvatarUrl ?? "",
      counterpartId: json?.counterpartId ?? "",
      counterpartName: json?.counterpartName ?? json?.partnerName ?? "",
      counterpartAvatarUrl: json?.counterpartAvatarUrl ?? "",
      lastMessage: json?.lastMessage ?? null,
      createdAt: json?.createdAt,
      updatedAt: json?.updatedAt ?? json?.lastMessage?.createdAt ?? json?.createdAt,
    });
  }

  getDisplayName() {
    if (safeText(this.counterpartName)) return safeText(this.counterpartName);
    if (safeText(this.sellerName)) return safeText(this.sellerName);
    return "ร้านค้า";
  }

  getDisplayAvatarUrl() {
    if (safeText(this.counterpartAvatarUrl)) return safeText(this.counterpartAvatarUrl);
    if (safeText(this.sellerAvatarUrl)) return safeText(this.sellerAvatarUrl);
    return "";
  }

  getProductLabel() {
    if (safeText(this.productName)) return safeText(this.productName);
    return "สินค้า";
  }

  getLastMessagePreview() {
    return this.lastMessage?.getPreviewText?.() ?? "ยังไม่มีข้อความ";
  }

  getUpdatedAtLabel(locale = "th-TH") {
    const raw = this.updatedAt || this.createdAt;
    if (!raw) return "";
    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) return "";
    return new Intl.DateTimeFormat(locale, {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  }
}
