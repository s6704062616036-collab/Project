const safeText = (value) => `${value ?? ""}`.trim();
const apiBaseUrl = `${import.meta.env.VITE_API_URL ?? ""}`.trim().replace(/\/+$/, "");

const toAbsoluteApiUrl = (value) => {
  const normalizedValue = safeText(value).replace(/\\/g, "/");
  if (!normalizedValue) return "";
  if (/^(?:https?:)?\/\//i.test(normalizedValue)) return normalizedValue;
  if (normalizedValue.startsWith("blob:") || normalizedValue.startsWith("data:")) return normalizedValue;
  if (normalizedValue.startsWith("/uploads/")) {
    return apiBaseUrl && apiBaseUrl !== "/api" ? `${apiBaseUrl}${normalizedValue}` : normalizedValue;
  }
  if (normalizedValue.startsWith("uploads/")) {
    return apiBaseUrl && apiBaseUrl !== "/api" ? `${apiBaseUrl}/${normalizedValue}` : `/${normalizedValue}`;
  }
  if (normalizedValue.startsWith("/")) return apiBaseUrl ? `${apiBaseUrl}${normalizedValue}` : normalizedValue;
  return normalizedValue;
};

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
    type,
    orderId,
    text,
    imageUrl,
    videoUrl,
    meetupProposal,
    createdAt,
  } = {}) {
    this.id = id ?? "";
    this.chatId = chatId ?? "";
    this.senderId = senderId ?? "";
    this.senderName = senderName ?? "";
    this.senderAvatarUrl = toAbsoluteApiUrl(senderAvatarUrl);
    this.type = type ?? "text";
    this.orderId = orderId ?? "";
    this.text = text ?? "";
    this.imageUrl = toAbsoluteApiUrl(imageUrl);
    this.videoUrl = toAbsoluteApiUrl(videoUrl);
    this.meetupProposal = meetupProposal
      ? {
          location: safeText(meetupProposal.location),
          status: safeText(meetupProposal.status),
          proposedBy: safeText(meetupProposal.proposedBy),
          proposedAt: toIsoString(meetupProposal.proposedAt),
          responseLocation: safeText(meetupProposal.responseLocation),
          respondedBy: safeText(meetupProposal.respondedBy),
          respondedAt: toIsoString(meetupProposal.respondedAt),
        }
      : null;
    this.createdAt = toIsoString(createdAt);
  }

  static fromJSON(json) {
    return new ChatMessage({
      id: json?.id ?? json?._id ?? "",
      chatId: json?.chatId ?? "",
      senderId: json?.senderId ?? json?.fromUserId ?? "",
      senderName: json?.senderName ?? json?.fromName ?? "",
      senderAvatarUrl: json?.senderAvatarUrl ?? json?.fromAvatarUrl ?? "",
      type: json?.type ?? json?.messageType ?? "text",
      orderId: json?.orderId ?? "",
      text: json?.text ?? json?.message ?? "",
      imageUrl: json?.imageUrl ?? "",
      videoUrl: json?.videoUrl ?? "",
      meetupProposal: json?.meetupProposal ?? null,
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

  hasVideo() {
    return Boolean(safeText(this.videoUrl));
  }

  isMeetupProposal() {
    return safeText(this.type) === "meetup_proposal" && Boolean(this.meetupProposal);
  }

  getPreviewText() {
    if (this.isMeetupProposal()) {
      return `ข้อเสนอนัดรับ: ${this.getMeetupProposalLocation()}`;
    }
    if (this.hasText()) return safeText(this.text);
    if (this.hasVideo()) return "ส่งวิดีโอ";
    if (this.hasImage()) return "ส่งรูปภาพ";
    return "ข้อความ";
  }

  getMeetupProposalLocation() {
    if (!this.isMeetupProposal()) return "";
    return safeText(this.meetupProposal?.responseLocation || this.meetupProposal?.location);
  }

  getMeetupProposalStatus() {
    if (!this.isMeetupProposal()) return "";
    return safeText(this.meetupProposal?.status);
  }

  getMeetupProposalStatusLabel() {
    switch (this.getMeetupProposalStatus()) {
      case "pending_seller_response":
        return "รอคนขายตอบกลับ";
      case "awaiting_meetup":
        return "รอนัดพบ";
      case "awaiting_buyer_confirmation":
        return "รอผู้ซื้อยืนยันรับของ";
      case "countered_by_seller":
        return "คนขายเสนอเปลี่ยนสถานที่";
      case "cancelled_by_seller":
        return "ยกเลิกการนัดรับ";
      case "rejected_by_buyer":
        return "ผู้ซื้อยกเลิกคำสั่งซื้อ";
      default:
        return this.getMeetupProposalStatus() || "ข้อเสนอนัดรับ";
    }
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
