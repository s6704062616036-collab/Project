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

const getShopNameByOwnerId = (shopsByOwnerId, ownerId) => {
  if (!(shopsByOwnerId instanceof Map)) return "";
  const normalizedOwnerId = safeText(ownerId);
  if (!normalizedOwnerId) return "";

  const shop = shopsByOwnerId.get(normalizedOwnerId) ?? null;
  return safeText(shop?.shopName);
};

const getPublicUserName = (user, { ownerId = "", shopsByOwnerId } = {}) => {
  const shopName = getShopNameByOwnerId(
    shopsByOwnerId,
    ownerId || user?._id?.toString?.() || user?.id || "",
  );
  if (shopName) return shopName;
  return safeText(user?.name) || safeText(user?.username) || "User";
};

const mapChatMessage = (chat, message, { usersById = new Map(), shopsByOwnerId = new Map(), baseUrl } = {}) => {
  if (!chat || !message) return null;

  const senderId = message?.senderId?.toString?.() ?? `${message?.senderId ?? ""}`;
  const sender = usersById.get(senderId) ?? null;
  const ownerId = chat?.ownerId?.toString?.() ?? `${chat?.ownerId ?? ""}`;
  const senderName =
    senderId && senderId === ownerId
      ? getPublicUserName(sender, { ownerId, shopsByOwnerId })
      : getPublicUserName(sender);

  return {
    id: message?._id?.toString?.() ?? "",
    chatId: chat?._id?.toString?.() ?? "",
    senderId,
    senderName,
    senderAvatarUrl: toAbsoluteUrl(sender?.avatarUrl, baseUrl),
    type: message?.type ?? "text",
    orderId: message?.orderId?.toString?.() ?? `${message?.orderId ?? ""}`,
    text: message?.text ?? "",
    imageUrl: toAbsoluteUrl(message?.imageUrl, baseUrl),
    videoUrl: toAbsoluteUrl(message?.videoUrl, baseUrl),
    meetupProposal: message?.meetupProposal
      ? {
          location: message.meetupProposal.location ?? "",
          status: message.meetupProposal.status ?? "",
          proposedBy: message.meetupProposal.proposedBy ?? "",
          proposedAt: message.meetupProposal.proposedAt ?? "",
          responseLocation: message.meetupProposal.responseLocation ?? "",
          respondedBy: message.meetupProposal.respondedBy ?? "",
          respondedAt: message.meetupProposal.respondedAt ?? "",
        }
      : null,
    createdAt: message?.createdAt ?? null,
  };
};

const mapChatRoom = (
  chat,
  { currentUserId = "", usersById = new Map(), shopsByOwnerId = new Map(), product = null, baseUrl } = {},
) => {
  if (!chat) return null;

  const ownerId = chat?.ownerId?.toString?.() ?? `${chat?.ownerId ?? ""}`;
  const buyerId = chat?.buyerId?.toString?.() ?? `${chat?.buyerId ?? ""}`;
  const owner = usersById.get(ownerId) ?? null;
  const buyer = usersById.get(buyerId) ?? null;
  const counterpart =
    currentUserId && ownerId === `${currentUserId}`
      ? buyer ?? owner
      : owner ?? buyer;

  const messages = Array.isArray(chat?.messages) ? chat.messages : [];
  const lastMessage = messages.length
    ? mapChatMessage(chat, messages[messages.length - 1], { usersById, shopsByOwnerId, baseUrl })
    : null;
  const ownerDisplayName = getPublicUserName(owner, { ownerId, shopsByOwnerId }) || "Seller";
  const buyerDisplayName = getPublicUserName(buyer) || "Buyer";
  const counterpartDisplayName =
    counterpart && safeText(counterpart?._id?.toString?.() ?? counterpart?.id) === ownerId
      ? ownerDisplayName
      : buyerDisplayName;

  return {
    id: chat?._id?.toString?.() ?? "",
    productId: chat?.productId?.toString?.() ?? `${chat?.productId ?? ""}`,
    productName: product?.title ?? "",
    ownerId,
    buyerId,
    sellerId: ownerId,
    sellerName: ownerDisplayName,
    sellerAvatarUrl: toAbsoluteUrl(owner?.avatarUrl, baseUrl),
    counterpartId: counterpart?._id?.toString?.() ?? counterpart?.id ?? "",
    counterpartName: counterpartDisplayName,
    counterpartAvatarUrl: toAbsoluteUrl(counterpart?.avatarUrl, baseUrl),
    ownerName: ownerDisplayName,
    buyerName: buyerDisplayName,
    unreadCount: Number.isFinite(Number(chat?.unreadCount)) ? Number(chat.unreadCount) : 0,
    createdAt: chat?.createdAt ?? null,
    updatedAt: chat?.updatedAt ?? chat?.createdAt ?? null,
    lastMessage,
  };
};

module.exports = {
  mapChatMessage,
  mapChatRoom,
  toAbsoluteUrl,
};
