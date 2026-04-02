const mongoose = require("mongoose");

const Chat = require("../models/Chat");
const Order = require("../models/Order");
const Product = require("../models/Product");
const Shop = require("../models/Shop");
const User = require("../models/User");
const { createNotification } = require("./notificationService");
const { mapChatMessage, mapChatRoom } = require("../utils/chatMapper");

const makeHttpError = (status, message) => {
  const error = new Error(message);
  error.status = status;
  return error;
};

const safeText = (value) => `${value ?? ""}`.trim();

const getApiBaseUrl = (req) => `${req.protocol}://${req.get("host")}`;

const deriveOrderStatus = (shopOrders = []) => {
  const statuses = (Array.isArray(shopOrders) ? shopOrders : [])
    .map((shopOrder) => `${shopOrder?.status ?? ""}`.trim().toLowerCase())
    .filter(Boolean);

  if (!statuses.length) return "pending";
  if (statuses.every((status) => status === "completed")) return "completed";
  if (statuses.some((status) => status === "reported_to_admin")) return "reported_to_admin";
  if (statuses.some((status) => status === "rejected_by_buyer")) return "rejected_by_buyer";
  if (statuses.every((status) => status === "cancelled")) return "cancelled";
  if (statuses.every((status) => status === "cancelled_by_seller")) return "cancelled_by_seller";
  if (statuses.some((status) => status === "awaiting_parcel_pickup")) return "awaiting_parcel_pickup";
  if (statuses.some((status) => status === "awaiting_buyer_confirmation")) return "awaiting_buyer_confirmation";
  if (statuses.some((status) => status === "awaiting_meetup")) return "awaiting_meetup";
  if (statuses.some((status) => status === "countered_by_seller")) return "countered_by_seller";
  if (statuses.some((status) => status === "pending_seller_response")) return "pending_seller_response";
  if (statuses.some((status) => status === "pending_payment_verification")) return "pending_payment_verification";
  return statuses[0];
};

const setProductsAvailability = async ({ productIds = [], sold = false, orderId = "" } = {}) => {
  const normalizedProductIds = [...new Set((Array.isArray(productIds) ? productIds : []).filter(Boolean))];
  if (!normalizedProductIds.length) return;

  if (sold) {
    await Product.updateMany(
      { _id: { $in: normalizedProductIds } },
      {
        $set: {
          status: "sold",
          soldAt: new Date(),
          soldOrderId: orderId || "",
        },
      }
    );
    return;
  }

  await Product.updateMany(
    { _id: { $in: normalizedProductIds } },
    {
      $set: {
        status: "available",
        soldAt: null,
        soldOrderId: "",
      },
    }
  );
};

const buildUsersById = async (userIds = []) => {
  const normalizedIds = [...new Set((Array.isArray(userIds) ? userIds : []).map((id) => `${id ?? ""}`).filter(Boolean))];
  if (!normalizedIds.length) return new Map();

  const users = await User.find({ _id: { $in: normalizedIds } }).lean();
  return new Map(users.map((user) => [user._id.toString(), user]));
};

const buildShopsByOwnerId = async (ownerIds = []) => {
  const normalizedOwnerIds = [...new Set((Array.isArray(ownerIds) ? ownerIds : []).map((id) => `${id ?? ""}`).filter(Boolean))];
  if (!normalizedOwnerIds.length) return new Map();

  const shops = await Shop.find({ owner: { $in: normalizedOwnerIds } }).lean();
  return new Map(shops.map((shop) => [shop.owner?.toString?.() ?? `${shop.owner ?? ""}`, shop]));
};

const assertChatAccess = (chat, userId) => {
  if (!chat) {
    throw makeHttpError(404, "Chat not found");
  }

  const normalizedUserId = safeText(userId);
  const isOwner = normalizedUserId && safeText(chat?.ownerId) === normalizedUserId;
  const isBuyer = normalizedUserId && safeText(chat?.buyerId) === normalizedUserId;
  if (!isOwner && !isBuyer) {
    throw makeHttpError(403, "You are not allowed to access this chat");
  }
};

const getChatContext = async (chatId) => {
  const chat = await Chat.findById(chatId);
  if (!chat) return null;

  const [product, usersById, shopsByOwnerId] = await Promise.all([
    Product.findById(chat.productId).lean(),
    buildUsersById([chat.ownerId, chat.buyerId, ...(chat.messages ?? []).map((message) => message.senderId)]),
    buildShopsByOwnerId([chat.ownerId]),
  ]);

  return { chat, product, usersById, shopsByOwnerId };
};

const findShopOrderForMeetupChat = (order, ownerId) =>
  (order?.shopOrders ?? []).find(
    (shopOrder) =>
      safeText(shopOrder?.ownerId?.toString?.() ?? shopOrder?.ownerId) === safeText(ownerId) &&
      safeText(shopOrder?.shippingMethod) === "meetup"
  );

const appendChatMessage = (
  chat,
  { senderId, type = "text", orderId = null, text = "", imageUrl = "", videoUrl = "", meetupProposal = null } = {}
) => {
  const normalizedText = safeText(text);
  const normalizedImageUrl = safeText(imageUrl);
  const normalizedVideoUrl = safeText(videoUrl);
  let normalizedType = safeText(type) || "text";

  if (!normalizedText && !normalizedImageUrl && !normalizedVideoUrl && !meetupProposal) {
    return null;
  }

  if (normalizedType !== "meetup_proposal" && normalizedVideoUrl) {
    normalizedType = "video";
  } else if (normalizedType !== "meetup_proposal" && normalizedImageUrl && !normalizedText) {
    normalizedType = "image";
  }

  chat.messages.push({
    senderId,
    type: normalizedType,
    orderId: orderId || null,
    text: normalizedText,
    imageUrl: normalizedImageUrl,
    videoUrl: normalizedVideoUrl,
    meetupProposal: meetupProposal || null,
    createdAt: new Date(),
  });
  chat.updatedAt = new Date();
  return chat.messages[chat.messages.length - 1];
};

const toDateOrNull = (value) => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const getLatestMessageTimestamp = (chat) => {
  const messages = Array.isArray(chat?.messages) ? chat.messages : [];
  if (!messages.length) return null;

  return messages.reduce((latest, message) => {
    const currentDate = toDateOrNull(message?.createdAt);
    if (!currentDate) return latest;
    if (!latest || currentDate > latest) return currentDate;
    return latest;
  }, null);
};

const getReadFieldNameForUser = (chat, userId) => {
  const normalizedUserId = safeText(userId);
  if (normalizedUserId && normalizedUserId === safeText(chat?.ownerId)) return "ownerLastReadAt";
  if (normalizedUserId && normalizedUserId === safeText(chat?.buyerId)) return "buyerLastReadAt";
  return "";
};

const updateReadMarkerOnChat = (chat, userId, readAt) => {
  const fieldName = getReadFieldNameForUser(chat, userId);
  const nextReadAt = toDateOrNull(readAt);
  if (!fieldName || !nextReadAt) return false;

  const currentReadAt = toDateOrNull(chat?.[fieldName]);
  if (currentReadAt && currentReadAt >= nextReadAt) return false;

  chat[fieldName] = nextReadAt;
  return true;
};

const persistReadMarkerWithoutTouchingUpdatedAt = async (chat, userId, readAt) => {
  const fieldName = getReadFieldNameForUser(chat, userId);
  const nextReadAt = toDateOrNull(readAt);
  if (!chat?._id || !fieldName || !nextReadAt) return false;

  const didUpdate = updateReadMarkerOnChat(chat, userId, nextReadAt);
  if (!didUpdate) return false;

  await Chat.collection.updateOne(
    { _id: chat._id },
    {
      $set: {
        [fieldName]: nextReadAt,
      },
    },
  );

  return true;
};

const countUnreadMessages = (chat, userId) => {
  const fieldName = getReadFieldNameForUser(chat, userId);
  if (!fieldName) return 0;

  const normalizedUserId = safeText(userId);
  const lastReadAt = toDateOrNull(chat?.[fieldName]);
  const messages = Array.isArray(chat?.messages) ? chat.messages : [];

  return messages.reduce((count, message) => {
    const senderId = safeText(message?.senderId?.toString?.() ?? message?.senderId);
    if (!senderId || senderId === normalizedUserId) return count;

    const createdAt = toDateOrNull(message?.createdAt);
    if (!createdAt) return count;
    if (!lastReadAt || createdAt > lastReadAt) return count + 1;
    return count;
  }, 0);
};

const ensureChat = async ({ productId, ownerId, buyerId }) => {
  let chat = await Chat.findOne({
    productId,
    ownerId,
    buyerId,
  });

  if (!chat) {
    chat = await Chat.create({
      productId,
      ownerId,
      buyerId,
      messages: [],
    });
  }

  return chat;
};

const listMyChats = async ({ req, userId }) => {
  const chats = await Chat.find({
    $or: [{ ownerId: userId }, { buyerId: userId }],
  })
    .sort({ updatedAt: -1, createdAt: -1 })
    .lean();

  const productIds = chats.map((chat) => chat.productId).filter(Boolean);
  const products = productIds.length
    ? await Product.find({ _id: { $in: productIds } }).lean()
    : [];
  const productsById = new Map(products.map((product) => [product._id.toString(), product]));

  const userIds = chats.flatMap((chat) => [
    chat.ownerId,
    chat.buyerId,
    ...(Array.isArray(chat.messages) ? chat.messages.map((message) => message.senderId) : []),
  ]);
  const [usersById, shopsByOwnerId] = await Promise.all([
    buildUsersById(userIds),
    buildShopsByOwnerId(chats.map((chat) => chat.ownerId)),
  ]);
  const baseUrl = getApiBaseUrl(req);

  return chats.map((chat) =>
    mapChatRoom(
      {
        ...chat,
        unreadCount: countUnreadMessages(chat, userId),
      },
      {
        currentUserId: userId,
        usersById,
        shopsByOwnerId,
        product: productsById.get(chat.productId?.toString?.() ?? `${chat.productId ?? ""}`) ?? null,
        baseUrl,
      },
    )
  );
};

const listMessages = async ({ req, userId, chatId }) => {
  if (!mongoose.isValidObjectId(chatId)) {
    throw makeHttpError(400, "Invalid chat id");
  }

  const context = await getChatContext(chatId);
  if (!context) {
    throw makeHttpError(404, "Chat not found");
  }

  assertChatAccess(context.chat, userId);

  const latestMessageTimestamp = getLatestMessageTimestamp(context.chat);
  await persistReadMarkerWithoutTouchingUpdatedAt(context.chat, userId, latestMessageTimestamp);

  const baseUrl = getApiBaseUrl(req);
  const chat = mapChatRoom(
    {
      ...context.chat.toObject(),
      unreadCount: countUnreadMessages(context.chat, userId),
    },
    {
      currentUserId: userId,
      usersById: context.usersById,
      shopsByOwnerId: context.shopsByOwnerId,
      product: context.product,
      baseUrl,
    },
  );
  const messages = (context.chat.messages ?? []).map((message) =>
    mapChatMessage(context.chat, message, {
      usersById: context.usersById,
      shopsByOwnerId: context.shopsByOwnerId,
      baseUrl,
    })
  );

  return { chat, messages };
};

const startChat = async ({ req, userId, productId, ownerId, message }) => {
  const normalizedProductId = safeText(productId);
  const normalizedOwnerId = safeText(ownerId);
  const initialMessageText = safeText(message);

  if (!mongoose.isValidObjectId(normalizedProductId)) {
    throw makeHttpError(400, "Invalid product id");
  }

  const product = await Product.findById(normalizedProductId).lean();
  if (!product) {
    throw makeHttpError(404, "Product not found");
  }

  const resolvedOwnerId = normalizedOwnerId || product.seller?.toString?.() || `${product.seller ?? ""}`;
  if (!resolvedOwnerId || !mongoose.isValidObjectId(resolvedOwnerId)) {
    throw makeHttpError(400, "Product owner not found");
  }

  if (resolvedOwnerId === safeText(userId)) {
    throw makeHttpError(400, "You cannot start a chat with your own product");
  }

  const chat = await ensureChat({
    productId: normalizedProductId,
    ownerId: resolvedOwnerId,
    buyerId: userId,
  });

  if (initialMessageText) {
    const createdMessage = appendChatMessage(chat, {
      senderId: userId,
      text: initialMessageText,
    });
    updateReadMarkerOnChat(chat, userId, createdMessage?.createdAt);
    await chat.save();
  }

  const [usersById, shopsByOwnerId] = await Promise.all([
    buildUsersById([chat.ownerId, chat.buyerId, ...(chat.messages ?? []).map((item) => item.senderId)]),
    buildShopsByOwnerId([chat.ownerId]),
  ]);
  const baseUrl = getApiBaseUrl(req);

  return {
    chatId: chat._id.toString(),
    chat: mapChatRoom(chat, {
      currentUserId: userId,
      usersById,
      shopsByOwnerId,
      product,
      baseUrl,
    }),
    message: "Chat created successfully",
  };
};

const sendMessage = async ({ req, userId, chatId, text, imageUrl, videoUrl }) => {
  if (!mongoose.isValidObjectId(chatId)) {
    throw makeHttpError(400, "Invalid chat id");
  }

  const normalizedText = safeText(text);
  const normalizedImageUrl = safeText(imageUrl);
  const normalizedVideoUrl = safeText(videoUrl);
  if (normalizedImageUrl && normalizedVideoUrl) {
    throw makeHttpError(400, "Please attach only one media file per message");
  }
  if (!normalizedText && !normalizedImageUrl && !normalizedVideoUrl) {
    throw makeHttpError(400, "Please provide text, an image, or a video");
  }

  const context = await getChatContext(chatId);
  if (!context) {
    throw makeHttpError(404, "Chat not found");
  }

  assertChatAccess(context.chat, userId);

  const createdMessage = appendChatMessage(context.chat, {
    senderId: userId,
    text: normalizedText,
    imageUrl: normalizedImageUrl,
    videoUrl: normalizedVideoUrl,
    type: normalizedVideoUrl ? "video" : normalizedImageUrl && !normalizedText ? "image" : "text",
  });
  updateReadMarkerOnChat(context.chat, userId, createdMessage?.createdAt);
  await context.chat.save();

  const [usersById, shopsByOwnerId] = await Promise.all([
    buildUsersById([context.chat.ownerId, context.chat.buyerId, ...(context.chat.messages ?? []).map((item) => item.senderId)]),
    buildShopsByOwnerId([context.chat.ownerId]),
  ]);
  const baseUrl = getApiBaseUrl(req);

  return {
    chat: mapChatRoom(context.chat, {
      currentUserId: userId,
      usersById,
      shopsByOwnerId,
      product: context.product,
      baseUrl,
    }),
    message: mapChatMessage(context.chat, createdMessage, {
      usersById,
      shopsByOwnerId,
      baseUrl,
    }),
  };
};

const respondMeetupProposal = async ({ req, userId, chatId, messageId, action, location }) => {
  if (!mongoose.isValidObjectId(chatId)) {
    throw makeHttpError(400, "Invalid chat id");
  }
  if (!mongoose.isValidObjectId(messageId)) {
    throw makeHttpError(400, "Invalid message id");
  }

  const normalizedAction = safeText(action).toLowerCase();
  const normalizedLocation = safeText(location);
  if (!["accept", "counter", "cancel"].includes(normalizedAction)) {
    throw makeHttpError(400, "Invalid meetup proposal action");
  }
  if (normalizedAction === "counter" && !normalizedLocation) {
    throw makeHttpError(400, "Please provide a new meetup location");
  }

  const context = await getChatContext(chatId);
  if (!context) {
    throw makeHttpError(404, "Chat not found");
  }

  assertChatAccess(context.chat, userId);

  const chat = context.chat;
  const proposalMessage = chat.messages.id(messageId);
  if (!proposalMessage || safeText(proposalMessage.type) !== "meetup_proposal" || !proposalMessage.meetupProposal) {
    throw makeHttpError(404, "Meetup proposal not found");
  }

  const isSeller = safeText(chat.ownerId) === safeText(userId);
  const isBuyer = safeText(chat.buyerId) === safeText(userId);
  if (!isSeller && !isBuyer) {
    throw makeHttpError(403, "You are not allowed to respond to this meetup proposal");
  }

  const proposalStatus = safeText(proposalMessage.meetupProposal.status);
  const canSellerRespond = isSeller && proposalStatus === "pending_seller_response";
  const canBuyerRespond = isBuyer && proposalStatus === "countered_by_seller";
  if (!canSellerRespond && !canBuyerRespond) {
    throw makeHttpError(400, "This meetup proposal is not in a state that can be responded to");
  }

  const orderId = proposalMessage.orderId?.toString?.() ?? `${proposalMessage.orderId ?? ""}`;
  if (!mongoose.isValidObjectId(orderId)) {
    throw makeHttpError(400, "Associated order not found");
  }

  const order = await Order.findById(orderId);
  if (!order) {
    throw makeHttpError(404, "Associated order not found");
  }

  const shopOrder = findShopOrderForMeetupChat(order, chat.ownerId);
  if (!shopOrder?.meetupProposal) {
    throw makeHttpError(404, "Meetup order details not found");
  }

  const respondedAt = new Date();
  const respondedAtIso = respondedAt.toISOString();
  const currentUser = await User.findById(userId).lean();
  const currentUserName = currentUser?.name ?? currentUser?.username ?? (isSeller ? "Seller" : "Buyer");

  if (canSellerRespond) {
    if (normalizedAction === "accept") {
      proposalMessage.meetupProposal.status = "awaiting_meetup";
      proposalMessage.meetupProposal.respondedBy = safeText(userId);
      proposalMessage.meetupProposal.respondedAt = respondedAtIso;

      shopOrder.status = "awaiting_meetup";
      shopOrder.meetupProposal.status = "awaiting_meetup";
      shopOrder.meetupProposal.respondedBy = safeText(userId);
      shopOrder.meetupProposal.respondedAt = respondedAtIso;

      appendChatMessage(chat, {
        senderId: userId,
        orderId,
        text: `${currentUserName} accepted the meetup location proposal`,
      });
    } else if (normalizedAction === "counter") {
      proposalMessage.meetupProposal.status = "countered_by_seller";
      proposalMessage.meetupProposal.responseLocation = normalizedLocation;
      proposalMessage.meetupProposal.respondedBy = safeText(userId);
      proposalMessage.meetupProposal.respondedAt = respondedAtIso;

      shopOrder.status = "countered_by_seller";
      shopOrder.meetupProposal.status = "countered_by_seller";
      shopOrder.meetupProposal.responseLocation = normalizedLocation;
      shopOrder.meetupProposal.respondedBy = safeText(userId);
      shopOrder.meetupProposal.respondedAt = respondedAtIso;

      appendChatMessage(chat, {
        senderId: userId,
        orderId,
        text: `${currentUserName} proposed a new meetup location: ${normalizedLocation}`,
      });
    } else {
      proposalMessage.meetupProposal.status = "cancelled_by_seller";
      proposalMessage.meetupProposal.respondedBy = safeText(userId);
      proposalMessage.meetupProposal.respondedAt = respondedAtIso;

      shopOrder.status = "cancelled_by_seller";
      shopOrder.meetupProposal.status = "cancelled_by_seller";
      shopOrder.meetupProposal.respondedBy = safeText(userId);
      shopOrder.meetupProposal.respondedAt = respondedAtIso;

      await setProductsAvailability({
        productIds: (shopOrder.items ?? []).map((item) => item.productId).filter(Boolean),
        sold: false,
      });

      appendChatMessage(chat, {
        senderId: userId,
        orderId,
        text: `${currentUserName} cancelled the meetup order`,
      });
    }
  } else if (normalizedAction === "accept") {
    proposalMessage.meetupProposal.status = "awaiting_meetup";
    proposalMessage.meetupProposal.respondedBy = safeText(userId);
    proposalMessage.meetupProposal.respondedAt = respondedAtIso;

    shopOrder.status = "awaiting_meetup";
    shopOrder.meetupProposal.status = "awaiting_meetup";
    shopOrder.meetupProposal.respondedBy = safeText(userId);
    shopOrder.meetupProposal.respondedAt = respondedAtIso;

    appendChatMessage(chat, {
      senderId: userId,
      orderId,
      text: `${currentUserName} confirmed the seller's meetup location`,
    });
  } else if (normalizedAction === "counter") {
    proposalMessage.meetupProposal.location = normalizedLocation;
    proposalMessage.meetupProposal.status = "pending_seller_response";
    proposalMessage.meetupProposal.proposedBy = safeText(userId);
    proposalMessage.meetupProposal.proposedAt = respondedAtIso;
    proposalMessage.meetupProposal.responseLocation = "";
    proposalMessage.meetupProposal.respondedBy = "";
    proposalMessage.meetupProposal.respondedAt = "";

    shopOrder.status = "pending_seller_response";
    shopOrder.meetupProposal.location = normalizedLocation;
    shopOrder.meetupProposal.status = "pending_seller_response";
    shopOrder.meetupProposal.proposedBy = safeText(userId);
    shopOrder.meetupProposal.proposedAt = respondedAtIso;
    shopOrder.meetupProposal.responseLocation = "";
    shopOrder.meetupProposal.respondedBy = "";
    shopOrder.meetupProposal.respondedAt = "";

    appendChatMessage(chat, {
      senderId: userId,
      orderId,
      text: `${currentUserName} proposed a new meetup location: ${normalizedLocation}`,
    });
  } else {
    proposalMessage.meetupProposal.status = "rejected_by_buyer";
    proposalMessage.meetupProposal.respondedBy = safeText(userId);
    proposalMessage.meetupProposal.respondedAt = respondedAtIso;

    shopOrder.status = "rejected_by_buyer";
    shopOrder.meetupProposal.status = "rejected_by_buyer";
    shopOrder.meetupProposal.respondedBy = safeText(userId);
    shopOrder.meetupProposal.respondedAt = respondedAtIso;

    await setProductsAvailability({
      productIds: (shopOrder.items ?? []).map((item) => item.productId).filter(Boolean),
      sold: false,
    });

    appendChatMessage(chat, {
      senderId: userId,
      orderId,
      text: `${currentUserName} cancelled the meetup order`,
    });
  }

  updateReadMarkerOnChat(chat, userId, getLatestMessageTimestamp(chat));

  order.status = deriveOrderStatus(order.shopOrders);
  await Promise.all([order.save(), chat.save()]);
  const counterpartUserId = isSeller ? safeText(chat.buyerId) : safeText(chat.ownerId);
  await createNotification({
    userId: counterpartUserId,
    type: "meetup_updated",
    title:
      normalizedAction === "accept"
        ? "มีการอัปเดตการนัดรับ"
        : normalizedAction === "counter"
          ? "มีข้อเสนอจุดนัดรับใหม่"
          : "คำสั่งซื้อนัดรับถูกยกเลิก",
    message:
      normalizedAction === "accept"
        ? `${currentUserName} ยืนยันรายละเอียดการนัดรับแล้ว`
        : normalizedAction === "counter"
          ? `${currentUserName} เสนอจุดนัดรับใหม่แล้ว`
          : `${currentUserName} ยกเลิกคำสั่งซื้อนัดรับแล้ว`,
    target: {
      route: "chat",
      params: {
        chatId: chat._id.toString(),
      },
    },
    metadata: {
      orderId,
      chatId: chat._id.toString(),
      action: normalizedAction,
    },
  });

  const [usersById, shopsByOwnerId] = await Promise.all([
    buildUsersById([chat.ownerId, chat.buyerId, ...(chat.messages ?? []).map((item) => item.senderId)]),
    buildShopsByOwnerId([chat.ownerId]),
  ]);
  const baseUrl = getApiBaseUrl(req);

  return {
    chat: mapChatRoom(chat, {
      currentUserId: userId,
      usersById,
      shopsByOwnerId,
      product: context.product,
      baseUrl,
    }),
    message: mapChatMessage(chat, proposalMessage, {
      usersById,
      shopsByOwnerId,
      baseUrl,
    }),
  };
};

const confirmMeetupHandover = async ({ req, userId, chatId, messageId }) => {
  if (!mongoose.isValidObjectId(chatId)) {
    throw makeHttpError(400, "Invalid chat id");
  }
  if (!mongoose.isValidObjectId(messageId)) {
    throw makeHttpError(400, "Invalid message id");
  }

  const context = await getChatContext(chatId);
  if (!context) {
    throw makeHttpError(404, "Chat not found");
  }

  assertChatAccess(context.chat, userId);

  const chat = context.chat;
  if (safeText(chat.ownerId) !== safeText(userId)) {
    throw makeHttpError(403, "Only the seller can confirm meetup handover");
  }

  const proposalMessage = chat.messages.id(messageId);
  if (!proposalMessage || safeText(proposalMessage.type) !== "meetup_proposal" || !proposalMessage.meetupProposal) {
    throw makeHttpError(404, "Meetup proposal not found");
  }

  const proposalStatus = safeText(proposalMessage.meetupProposal.status);
  if (proposalStatus !== "awaiting_meetup") {
    throw makeHttpError(400, "This meetup is not ready for handover confirmation");
  }

  const orderId = proposalMessage.orderId?.toString?.() ?? `${proposalMessage.orderId ?? ""}`;
  if (!mongoose.isValidObjectId(orderId)) {
    throw makeHttpError(400, "Associated order not found");
  }

  const order = await Order.findById(orderId);
  if (!order) {
    throw makeHttpError(404, "Associated order not found");
  }

  const shopOrder = findShopOrderForMeetupChat(order, chat.ownerId);
  if (!shopOrder?.meetupProposal) {
    throw makeHttpError(404, "Meetup order details not found");
  }

  const respondedAtIso = new Date().toISOString();
  const currentUser = await User.findById(userId).lean();
  const currentUserName = currentUser?.name ?? currentUser?.username ?? "Seller";

  proposalMessage.meetupProposal.status = "awaiting_buyer_confirmation";
  proposalMessage.meetupProposal.respondedBy = safeText(userId);
  proposalMessage.meetupProposal.respondedAt = respondedAtIso;

  shopOrder.status = "awaiting_buyer_confirmation";
  shopOrder.meetupProposal.status = "awaiting_buyer_confirmation";
  shopOrder.meetupProposal.respondedBy = safeText(userId);
  shopOrder.meetupProposal.respondedAt = respondedAtIso;

  appendChatMessage(chat, {
    senderId: userId,
    orderId,
    text: `${currentUserName} marked the meetup handover as completed. Please confirm receipt in My Orders.`,
  });

  updateReadMarkerOnChat(chat, userId, getLatestMessageTimestamp(chat));

  order.status = deriveOrderStatus(order.shopOrders);
  await Promise.all([order.save(), chat.save()]);
  await createNotification({
    userId: safeText(chat.buyerId),
    type: "meetup_handover_confirmed",
    title: "ผู้ขายแจ้งว่าส่งมอบสินค้าแล้ว",
    message: `${currentUserName} แจ้งว่าส่งมอบสินค้าแล้ว กรุณาไปยืนยันรับของในรายการสั่งซื้อ`,
    target: {
      route: "orders",
      params: {
        orderId,
      },
    },
    metadata: {
      orderId,
      chatId: chat._id.toString(),
    },
  });

  const [usersById, shopsByOwnerId] = await Promise.all([
    buildUsersById([chat.ownerId, chat.buyerId, ...(chat.messages ?? []).map((item) => item.senderId)]),
    buildShopsByOwnerId([chat.ownerId]),
  ]);
  const baseUrl = getApiBaseUrl(req);

  return {
    chat: mapChatRoom(chat, {
      currentUserId: userId,
      usersById,
      shopsByOwnerId,
      product: context.product,
      baseUrl,
    }),
    message: mapChatMessage(chat, proposalMessage, {
      usersById,
      shopsByOwnerId,
      baseUrl,
    }),
  };
};

const createCheckoutChatsForOrder = async ({ buyerId, order }) => {
  if (!order?.shopOrders?.length) return;

  for (const shopOrder of order.shopOrders) {
    const firstItem = shopOrder?.items?.[0];
    if (!firstItem?.productId) continue;

    const chat = await ensureChat({
      buyerId,
      ownerId: shopOrder.ownerId,
      productId: firstItem.productId,
    });

    const itemSummary = (shopOrder.items ?? [])
      .map((item) => `- ${item.name} x ${item.quantity}`)
      .join("\n");

    if (safeText(shopOrder.shippingMethod) === "meetup" && shopOrder.meetupProposal) {
      appendChatMessage(chat, {
        senderId: buyerId,
        type: "meetup_proposal",
        orderId: order._id,
        meetupProposal: {
          location: shopOrder.meetupProposal.location ?? "",
          status: "pending_seller_response",
          proposedBy: safeText(buyerId),
          proposedAt: shopOrder.meetupProposal.proposedAt ?? new Date().toISOString(),
          responseLocation: "",
          respondedBy: "",
          respondedAt: "",
        },
      });
      appendChatMessage(chat, {
        senderId: buyerId,
        orderId: order._id,
        text: [
          `Order #${order._id.toString()}`,
          "Shipping method: meetup",
          "Items:",
          itemSummary,
          "Please respond to the meetup proposal above.",
        ].join("\n"),
      });

      updateReadMarkerOnChat(chat, buyerId, getLatestMessageTimestamp(chat));

      shopOrder.status = "pending_seller_response";
      shopOrder.meetupProposal.status = "pending_seller_response";
      await Promise.all([order.save(), chat.save()]);
      continue;
    }

    appendChatMessage(chat, {
      senderId: buyerId,
      orderId: order._id,
      text: [
        `Order #${order._id.toString()}`,
        "Shipping method: parcel",
        `Recipient name: ${shopOrder?.buyerShippingAddress?.name ?? "-"}`,
        `Recipient phone: ${shopOrder?.buyerShippingAddress?.phone ?? "-"}`,
        `Shipping address: ${shopOrder?.buyerShippingAddress?.address ?? "-"}`,
        "Items:",
        itemSummary,
      ].join("\n"),
    });

    if (safeText(shopOrder?.parcelPayment?.receiptImageUrl)) {
      appendChatMessage(chat, {
        senderId: buyerId,
        type: "image",
        orderId: order._id,
        text: `Payment receipt for order #${order._id.toString()}`,
        imageUrl: shopOrder.parcelPayment.receiptImageUrl,
      });
    }

    updateReadMarkerOnChat(chat, buyerId, getLatestMessageTimestamp(chat));

    await chat.save();
  }
};

module.exports = {
  listMyChats,
  listMessages,
  startChat,
  sendMessage,
  respondMeetupProposal,
  confirmMeetupHandover,
  createCheckoutChatsForOrder,
};
