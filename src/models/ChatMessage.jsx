const safeText = (value) => `${value ?? ""}`.trim();

const toIsoString = (value) => {
  const date = new Date(value ?? "");
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString();
};

export class ChatMessage {
  constructor({
    id,
    chatId,
    senderId,
    senderName,
    senderAvatarUrl,
    text,
    imageUrl,
    createdAt,
  } = {}) {
    this.id = id ?? "";
    this.chatId = chatId ?? "";
    this.senderId = senderId ?? "";
    this.senderName = senderName ?? "";
    this.senderAvatarUrl = senderAvatarUrl ?? "";
    this.text = text ?? "";
    this.imageUrl = imageUrl ?? "";
    this.createdAt = toIsoString(createdAt);
  }

  static fromJSON(json) {
    return new ChatMessage({
      id: json?.id ?? json?._id ?? "",
      chatId: json?.chatId ?? "",
      senderId: json?.senderId ?? json?.fromUserId ?? "",
      senderName: json?.senderName ?? json?.fromName ?? "",
      senderAvatarUrl: json?.senderAvatarUrl ?? json?.fromAvatarUrl ?? "",
      text: json?.text ?? json?.message ?? "",
      imageUrl: json?.imageUrl ?? "",
      createdAt: json?.createdAt,
    });
  }

  isMine(currentUserId) {
    return safeText(this.senderId) && safeText(this.senderId) === safeText(currentUserId);
  }

  hasText() {
    return Boolean(safeText(this.text));
  }

  hasImage() {
    return Boolean(safeText(this.imageUrl));
  }

  getPreviewText() {
    if (this.hasText()) return safeText(this.text);
    if (this.hasImage()) return "ส่งรูปภาพ";
    return "ข้อความ";
  }

  getTimeLabel(locale = "th-TH") {
    if (!this.createdAt) return "";
    const date = new Date(this.createdAt);
    if (Number.isNaN(date.getTime())) return "";
    return new Intl.DateTimeFormat(locale, {
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  }
}
