import { ProductSaleLifecycle } from "../../models/ProductSaleLifecycle";
import { ProductSaleSyncRequest } from "../../models/ProductSaleSyncRequest";
import { ShippingMethod } from "../../models/ShippingMethod";

const MOCK_DB_STORAGE_KEY = "myweb:mock-db:v1";
const MOCK_DB_UPDATED_EVENT = "myweb:mock-db:updated";
const DEFAULT_AVATAR_URL = "/App logo.jpg";
const DEFAULT_PRODUCT_IMAGE_URL = "/vite.svg";

const nowIso = () => new Date().toISOString();

const createId = (prefix = "id") => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
};

const safeText = (value) => `${value ?? ""}`.trim();
const toLower = (value) => safeText(value).toLowerCase();
const toDigits = (value) => `${value ?? ""}`.replace(/\D+/g, "");

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return parsed;
};

const ensureArray = (value) => {
  if (Array.isArray(value)) return value;
  if (value == null) return [];
  return [value];
};

const toCreatedAtTime = (value) => {
  const unixMs = new Date(value ?? 0).getTime();
  if (!Number.isFinite(unixMs)) return 0;
  return unixMs;
};

const sortByCreatedAtDesc = (items = []) =>
  [...items].sort((a, b) => toCreatedAtTime(b?.createdAt) - toCreatedAtTime(a?.createdAt));

const buildFallbackImageUrl = (fileName, kind = "product") => {
  const base = kind === "avatar" ? DEFAULT_AVATAR_URL : DEFAULT_PRODUCT_IMAGE_URL;
  const suffix = safeText(fileName) || "file";
  return `${base}?mock=${encodeURIComponent(suffix)}`;
};

const normalizeImageUrl = (value, kind = "product") => {
  if (typeof value === "string" && safeText(value)) return safeText(value);

  if (value && typeof value === "object") {
    if (typeof value.url === "string" && safeText(value.url)) return safeText(value.url);
    if (typeof value.imageUrl === "string" && safeText(value.imageUrl)) return safeText(value.imageUrl);
    if (typeof value.secure_url === "string" && safeText(value.secure_url)) return safeText(value.secure_url);
    if (typeof value.path === "string" && safeText(value.path)) return safeText(value.path);
    if (typeof value.name === "string" && safeText(value.name)) {
      return buildFallbackImageUrl(value.name, kind);
    }
  }

  return "";
};

const toPayloadObject = (payload) => {
  if (typeof FormData !== "undefined" && payload instanceof FormData) {
    const result = {};
    payload.forEach((value, key) => {
      if (Object.prototype.hasOwnProperty.call(result, key)) {
        const current = result[key];
        result[key] = Array.isArray(current) ? [...current, value] : [current, value];
      } else {
        result[key] = value;
      }
    });
    return result;
  }

  if (payload && typeof payload === "object") return { ...payload };
  return {};
};

const tryParseJson = (value, fallback = null) => {
  if (typeof value !== "string") return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

const normalizeShopProfileRecord = (shopInput = {}) => {
  const shop = shopInput && typeof shopInput === "object" ? shopInput : {};
  return {
    id: safeText(shop.id ?? shop._id) || createId("shop"),
    ownerId: safeText(shop.ownerId),
    shopName: safeText(shop.shopName),
    description: safeText(shop.description),
    contact: safeText(shop.contact),
    avatarUrl: normalizeImageUrl(shop.avatarUrl, "avatar"),
    parcelQrCodeUrl: normalizeImageUrl(
      shop.parcelQrCodeUrl ?? shop.paymentQrCodeUrl ?? shop.parcelPaymentQrCodeUrl ?? shop.qrCodeUrl,
      "product",
    ),
  };
};

const normalizeProductRecord = (productInput = {}) => {
  const product = productInput && typeof productInput === "object" ? productInput : {};
  const imageUrls = ensureArray(
    product.imageUrls ?? product.images ?? product.productImages ?? (Array.isArray(product.image) ? product.image : []),
  )
    .map((item) => normalizeImageUrl(item, "product"))
    .filter(Boolean);
  const imageUrl = normalizeImageUrl(product.imageUrl ?? product.image, "product");
  const normalizedImageUrls = [...new Set([imageUrl, ...imageUrls].filter(Boolean))];
  const saleStatusInput =
    product.saleStatus ??
    product.availabilityStatus ??
    product.inventoryStatus ??
    (product.isSold ? "sold" : "available");
  const saleStatus = ProductSaleLifecycle.normalizeSaleStatus(saleStatusInput);

  return {
    id: safeText(product.id ?? product._id) || createId("product"),
    ownerId: safeText(product.ownerId),
    name: safeText(product.name ?? product.productName),
    category: safeText(product.category ?? product.productCategory ?? product.categoryName),
    imageUrl: normalizedImageUrls[0] ?? buildFallbackImageUrl("product", "product"),
    imageUrls: normalizedImageUrls.length ? normalizedImageUrls : [buildFallbackImageUrl("product", "product")],
    price: toNumber(product.price, 0),
    exchangeItem: safeText(
      product.exchangeItem ??
      product.exchangeWanted ??
      product.wantedExchangeItem ??
      product.swapFor,
    ),
    description: safeText(product.description),
    saleStatus,
    soldAt: safeText(product.soldAt),
    soldOrderId: safeText(product.soldOrderId ?? product.orderId),
    createdAt: safeText(product.createdAt) || nowIso(),
  };
};

const normalizeUserRecord = (userInput = {}) => {
  const user = userInput && typeof userInput === "object" ? userInput : {};
  return {
    id: safeText(user.id ?? user._id) || createId("user"),
    name: safeText(user.name),
    email: toLower(user.email),
    password: `${user.password ?? ""}`,
    avatarUrl: normalizeImageUrl(user.avatarUrl, "avatar") || DEFAULT_AVATAR_URL,
    phone: safeText(user.phone),
    address: safeText(user.address),
  };
};

const normalizeAdminReportRecord = (reportInput = {}) => {
  const report = reportInput && typeof reportInput === "object" ? reportInput : {};
  return {
    id: safeText(report.id ?? report._id) || createId("admin_report"),
    type: safeText(report.type) || "parcel_payment_receipt",
    status: safeText(report.status) || "open",
    reason: safeText(report.reason),
    orderId: safeText(report.orderId),
    shopOrderKey: safeText(report.shopOrderKey),
    buyerId: safeText(report.buyerId),
    reporterId: safeText(report.reporterId),
    receiptImageUrl: normalizeImageUrl(report.receiptImageUrl, "product"),
    createdAt: safeText(report.createdAt) || nowIso(),
    resolvedAt: safeText(report.resolvedAt),
  };
};

const normalizeMeetupProposalRecord = (proposalInput = {}) => {
  const proposal = proposalInput && typeof proposalInput === "object" ? proposalInput : {};
  return {
    location: safeText(proposal.location),
    status: safeText(proposal.status),
    proposedBy: safeText(proposal.proposedBy),
    proposedAt: safeText(proposal.proposedAt),
    responseLocation: safeText(proposal.responseLocation ?? proposal.counterLocation),
    respondedBy: safeText(proposal.respondedBy),
    respondedAt: safeText(proposal.respondedAt),
  };
};

const normalizeChatMessageRecord = (messageInput = {}, defaultSenderId = "", fallbackCreatedAt = nowIso()) => {
  const message = messageInput && typeof messageInput === "object" ? messageInput : {};
  const createdAt = safeText(message.createdAt) || fallbackCreatedAt;
  const text = safeText(message.text ?? message.message);
  const imageUrl = normalizeImageUrl(message.imageUrl ?? message.image, "product");
  const messageType = safeText(message.type ?? message.messageType) || (message.meetupProposal ? "meetup_proposal" : "text");
  const meetupProposal = messageType === "meetup_proposal"
    ? normalizeMeetupProposalRecord(message.meetupProposal)
    : null;

  return {
    id: safeText(message.id ?? message._id) || createId("chat_msg"),
    senderId: safeText(message.senderId ?? message.fromUserId ?? defaultSenderId),
    type: messageType,
    orderId: safeText(message.orderId),
    text,
    imageUrl,
    meetupProposal,
    createdAt,
  };
};

const normalizeChatRecord = (chatInput = {}) => {
  const chat = chatInput && typeof chatInput === "object" ? chatInput : {};
  const createdAt = safeText(chat.createdAt) || nowIso();
  const fallbackSenderId = safeText(chat.buyerId);
  const messages = Array.isArray(chat.messages)
    ? chat.messages.map((message, index) =>
        normalizeChatMessageRecord(
          message,
          fallbackSenderId,
          safeText(message?.createdAt) || new Date(toCreatedAtTime(createdAt) + index).toISOString(),
        ),
      )
    : [];

  const legacyMessageText = safeText(chat.message);
  if (!messages.length && legacyMessageText) {
    messages.push(
      normalizeChatMessageRecord(
        {
          text: legacyMessageText,
          createdAt,
          senderId: fallbackSenderId,
        },
        fallbackSenderId,
        createdAt,
      ),
    );
  }

  const sortedMessages = [...messages].sort(
    (a, b) => toCreatedAtTime(a?.createdAt) - toCreatedAtTime(b?.createdAt),
  );
  const lastMessage = sortedMessages[sortedMessages.length - 1];
  const updatedAt = safeText(chat.updatedAt) || lastMessage?.createdAt || createdAt;

  return {
    id: safeText(chat.id ?? chat._id) || createId("chat"),
    productId: safeText(chat.productId),
    ownerId: safeText(chat.ownerId),
    buyerId: safeText(chat.buyerId),
    createdAt,
    updatedAt,
    messages: sortedMessages,
  };
};

const createSeedState = () => {
  const demoUserId = "user_demo";
  const ownerUserId = "user_owner";
  const now = Date.now();
  const seededChatCreatedAt = new Date(now - 1000 * 60 * 70).toISOString();
  const seededMessageBuyerAt = new Date(now - 1000 * 60 * 35).toISOString();
  const seededMessageSellerAt = new Date(now - 1000 * 60 * 20).toISOString();
  const seededMessageImageAt = new Date(now - 1000 * 60 * 10).toISOString();

  return {
    users: [
      {
        id: demoUserId,
        name: "ผู้ใช้ทดสอบ",
        email: "demo@myweb.local",
        password: "123456",
        avatarUrl: DEFAULT_AVATAR_URL,
        phone: "0812345678",
        address: "กรุงเทพมหานคร",
      },
      {
        id: ownerUserId,
        name: "ร้านตัวอย่าง",
        email: "seller@myweb.local",
        password: "123456",
        avatarUrl: `${DEFAULT_AVATAR_URL}?owner=1`,
        phone: "0899999999",
        address: "เชียงใหม่",
      },
    ],
    session: {
      userId: demoUserId,
    },
    shopProfiles: [
      {
        id: "shop_demo",
        ownerId: demoUserId,
        shopName: "ร้านผู้ใช้ทดสอบ",
        description: "ร้านทดลองสำหรับทดสอบระบบแบบไม่ใช้ฐานข้อมูล",
        contact: "Line: demo-shop",
        avatarUrl: DEFAULT_AVATAR_URL,
        parcelQrCodeUrl: "",
      },
      {
        id: "shop_owner",
        ownerId: ownerUserId,
        shopName: "ร้านตัวอย่าง",
        description: "สินค้าเดโม่สำหรับทดสอบหน้า home และ search",
        contact: "Line: seller-shop",
        avatarUrl: `${DEFAULT_AVATAR_URL}?shop=owner`,
        parcelQrCodeUrl: `${DEFAULT_PRODUCT_IMAGE_URL}?seed=shop-owner-qr`,
      },
    ],
    products: [
      {
        id: "product_01",
        ownerId: ownerUserId,
        name: "รถบังคับเด็ก",
        category: "ของเล่น",
        imageUrl: `${DEFAULT_PRODUCT_IMAGE_URL}?seed=toycar`,
        imageUrls: [`${DEFAULT_PRODUCT_IMAGE_URL}?seed=toycar`],
        price: 890,
        description: "รถบังคับพร้อมรีโมต ใช้งานได้ปกติ",
        createdAt: new Date(now - 1000 * 60 * 5).toISOString(),
      },
      {
        id: "product_02",
        ownerId: ownerUserId,
        name: "พัดลมตั้งโต๊ะ",
        category: "เครื่องใช้ไฟฟ้า",
        imageUrl: `${DEFAULT_AVATAR_URL}?seed=fan`,
        imageUrls: [`${DEFAULT_AVATAR_URL}?seed=fan`],
        price: 590,
        description: "พัดลมสภาพดี ใช้งานเงียบ",
        createdAt: new Date(now - 1000 * 60 * 20).toISOString(),
      },
      {
        id: "product_03",
        ownerId: demoUserId,
        name: "โต๊ะทำงานไม้",
        category: "เฟอร์นิเจอร์",
        imageUrl: `${DEFAULT_PRODUCT_IMAGE_URL}?seed=desk`,
        imageUrls: [
          `${DEFAULT_PRODUCT_IMAGE_URL}?seed=desk`,
          `${DEFAULT_PRODUCT_IMAGE_URL}?seed=desk2`,
        ],
        price: 2200,
        description: "โต๊ะทำงานขนาด 120 ซม. แข็งแรง",
        createdAt: new Date(now - 1000 * 60 * 45).toISOString(),
      },
      {
        id: "product_04",
        ownerId: ownerUserId,
        name: "สร้อยคอเงิน",
        category: "เครื่องประดับ",
        imageUrl: `${DEFAULT_AVATAR_URL}?seed=necklace`,
        imageUrls: [`${DEFAULT_AVATAR_URL}?seed=necklace`],
        price: 1290,
        description: "งานแฮนด์เมด น้ำหนักเบา",
        createdAt: new Date(now - 1000 * 60 * 90).toISOString(),
      },
      {
        id: "product_05",
        ownerId: demoUserId,
        name: "คีย์บอร์ดเกมมิ่ง",
        category: "คอมพิวเตอร์",
        imageUrl: `${DEFAULT_PRODUCT_IMAGE_URL}?seed=keyboard`,
        imageUrls: [`${DEFAULT_PRODUCT_IMAGE_URL}?seed=keyboard`],
        price: 1490,
        description: "คีย์บอร์ดแมคคานิคอล RGB",
        createdAt: new Date(now - 1000 * 60 * 130).toISOString(),
      },
      {
        id: "product_06",
        ownerId: ownerUserId,
        name: "ไฟหน้าแต่งรถยนต์",
        category: "อะไหล่รถยนต์",
        imageUrl: `${DEFAULT_AVATAR_URL}?seed=headlight`,
        imageUrls: [`${DEFAULT_AVATAR_URL}?seed=headlight`],
        price: 3200,
        description: "ไฟหน้า LED สำหรับรถเก๋ง",
        createdAt: new Date(now - 1000 * 60 * 180).toISOString(),
      },
    ],
    carts: [
      {
        id: `cart_${demoUserId}`,
        userId: demoUserId,
        items: [
          {
            id: "cart_item_seed_1",
            productId: "product_01",
            quantity: 1,
            snapshotName: "รถบังคับเด็ก",
            snapshotImageUrl: `${DEFAULT_PRODUCT_IMAGE_URL}?seed=toycar`,
            snapshotPrice: 890,
          },
        ],
      },
    ],
    orders: [],
    adminReports: [],
    chats: [
      {
        id: "chat_seed_01",
        productId: "product_01",
        ownerId: ownerUserId,
        buyerId: demoUserId,
        createdAt: seededChatCreatedAt,
        updatedAt: seededMessageImageAt,
        messages: [
          {
            id: "chat_msg_seed_1",
            senderId: demoUserId,
            text: "สวัสดีครับ สินค้าชิ้นนี้ยังอยู่ไหม",
            imageUrl: "",
            createdAt: seededMessageBuyerAt,
          },
          {
            id: "chat_msg_seed_2",
            senderId: ownerUserId,
            text: "ยังอยู่ครับ พร้อมส่งวันนี้",
            imageUrl: "",
            createdAt: seededMessageSellerAt,
          },
          {
            id: "chat_msg_seed_3",
            senderId: demoUserId,
            text: "",
            imageUrl: `${DEFAULT_PRODUCT_IMAGE_URL}?seed=toycar-chat`,
            createdAt: seededMessageImageAt,
          },
        ],
      },
    ],
  };
};

export class MockDatabaseStore {
  static #instance = null;

  static instance() {
    if (!MockDatabaseStore.#instance) {
      MockDatabaseStore.#instance = new MockDatabaseStore();
    }
    return MockDatabaseStore.#instance;
  }

  constructor() {
    this.storageKey = MOCK_DB_STORAGE_KEY;
    this.state = this.#loadState();
  }

  #getStorage() {
    if (typeof window === "undefined") return null;
    return window.localStorage ?? null;
  }

  #normalizeState(inputState) {
    const seed = createSeedState();
    const state = inputState && typeof inputState === "object" ? inputState : {};

    return {
      users: (Array.isArray(state.users) ? state.users : seed.users).map((user) => normalizeUserRecord(user)),
      session: state.session && typeof state.session === "object" ? state.session : seed.session,
      shopProfiles: (Array.isArray(state.shopProfiles) ? state.shopProfiles : seed.shopProfiles).map((shop) =>
        normalizeShopProfileRecord(shop),
      ),
      products: (Array.isArray(state.products) ? state.products : seed.products).map((product) =>
        normalizeProductRecord(product),
      ),
      carts: Array.isArray(state.carts) ? state.carts : seed.carts,
      orders: Array.isArray(state.orders) ? state.orders : seed.orders,
      adminReports: (Array.isArray(state.adminReports) ? state.adminReports : seed.adminReports).map((report) =>
        normalizeAdminReportRecord(report),
      ),
      chats: (Array.isArray(state.chats) ? state.chats : seed.chats).map((chat) =>
        normalizeChatRecord(chat),
      ),
    };
  }

  #loadState() {
    const storage = this.#getStorage();
    if (!storage) return createSeedState();

    try {
      const rawState = storage.getItem(this.storageKey);
      if (rawState) {
        const parsed = JSON.parse(rawState);
        return this.#normalizeState(parsed);
      }
    } catch {
      // ignore corrupted state and reset
    }

    const seed = createSeedState();
    try {
      storage.setItem(this.storageKey, JSON.stringify(seed));
    } catch {
      // ignore storage failures
    }
    return seed;
  }

  #persist() {
    const storage = this.#getStorage();
    if (!storage) return;
    try {
      storage.setItem(this.storageKey, JSON.stringify(this.state));
      if (typeof window !== "undefined" && typeof window.dispatchEvent === "function") {
        window.dispatchEvent(
          new CustomEvent(MOCK_DB_UPDATED_EVENT, {
            detail: {
              storageKey: this.storageKey,
              updatedAt: nowIso(),
            },
          }),
        );
      }
    } catch {
      // ignore storage quota issues in mock mode
    }
  }

  #toPublicUser(userRecord) {
    if (!userRecord) return null;
    return {
      id: userRecord.id ?? "",
      name: userRecord.name ?? "",
      email: userRecord.email ?? "",
      avatarUrl: userRecord.avatarUrl ?? "",
      phone: userRecord.phone ?? "",
      address: userRecord.address ?? "",
    };
  }

  #findUserById(userId) {
    return this.state.users.find((user) => user.id === userId) ?? null;
  }

  #findUserByIdentifier(identifierInput) {
    const normalizedIdentifier = toLower(identifierInput);
    const digitIdentifier = toDigits(identifierInput);

    return (
      this.state.users.find((user) => {
        const emailMatch = toLower(user.email) === normalizedIdentifier;
        const phoneMatch = toDigits(user.phone) === digitIdentifier && digitIdentifier.length >= 8;
        return emailMatch || phoneMatch;
      }) ?? null
    );
  }

  #getCurrentUserRecord() {
    const currentUserId = safeText(this.state?.session?.userId);
    if (!currentUserId) return null;
    return this.#findUserById(currentUserId);
  }

  #requireCurrentUser() {
    const user = this.#getCurrentUserRecord();
    if (!user) {
      throw new Error("กรุณาเข้าสู่ระบบก่อนใช้งาน");
    }
    return user;
  }

  #getOrCreateShopProfile(ownerId) {
    const found = this.state.shopProfiles.find((shop) => shop.ownerId === ownerId);
    if (found) return found;

    const created = {
      id: createId("shop"),
      ownerId,
      shopName: "",
      description: "",
      contact: "",
      avatarUrl: "",
      parcelQrCodeUrl: "",
    };
    this.state.shopProfiles.push(created);
    this.#persist();
    return created;
  }

  #findShopProfileByOwnerId(ownerId) {
    const normalizedOwnerId = safeText(ownerId);
    if (!normalizedOwnerId) return null;
    return this.state.shopProfiles.find((shop) => safeText(shop?.ownerId) === normalizedOwnerId) ?? null;
  }

  #toShopResponse(shopRecord) {
    if (!shopRecord) return null;
    return normalizeShopProfileRecord(shopRecord);
  }

  #normalizeProductImageUrls(payload = {}) {
    const rawInputs = [
      payload.imageUrl,
      ...ensureArray(payload.imageUrls),
      ...ensureArray(payload.images),
      ...ensureArray(payload.image),
    ];

    const normalized = rawInputs
      .map((input) => normalizeImageUrl(input, "product"))
      .filter(Boolean);

    const unique = [...new Set(normalized)];
    if (!unique.length) return [buildFallbackImageUrl("product", "product")];
    return unique;
  }

  #toProductResponse(productRecord) {
    if (!productRecord) return null;
    return {
      id: productRecord.id ?? "",
      ownerId: productRecord.ownerId ?? "",
      name: productRecord.name ?? "",
      category: productRecord.category ?? "",
      imageUrl: productRecord.imageUrl ?? "",
      imageUrls: Array.isArray(productRecord.imageUrls) ? [...productRecord.imageUrls] : [],
      price: toNumber(productRecord.price, 0),
      exchangeItem: productRecord.exchangeItem ?? "",
      description: productRecord.description ?? "",
      saleStatus: ProductSaleLifecycle.normalizeSaleStatus(productRecord.saleStatus),
      soldAt: safeText(productRecord.soldAt),
      soldOrderId: safeText(productRecord.soldOrderId),
      isSold: ProductSaleLifecycle.isSoldStatus(productRecord.saleStatus),
      createdAt: productRecord.createdAt ?? "",
    };
  }

  #isProductSold(productRecord) {
    return ProductSaleLifecycle.isSoldStatus(productRecord?.saleStatus);
  }

  #shouldKeepProductReserved(status) {
    return ProductSaleLifecycle.shouldKeepReserved(status);
  }

  #refreshProductSaleStatuses(productIds = []) {
    const normalizedProductIds = [...new Set(
      ensureArray(productIds).map((productId) => safeText(productId)).filter(Boolean),
    )];

    if (!normalizedProductIds.length) return;

    this.state.products = ensureArray(this.state.products).map((product) => {
      const productId = safeText(product?.id);
      if (!normalizedProductIds.includes(productId)) return product;

      let activeOrderReference = null;

      ensureArray(this.state.orders).forEach((order) => {
        const normalizedShopOrders =
          Array.isArray(order?.shopOrders) && order.shopOrders.length
            ? order.shopOrders
            : [
                {
                  status: safeText(order?.status) || "completed",
                  items: ensureArray(order?.items),
                },
              ];

        normalizedShopOrders.forEach((shopOrder) => {
          const containsProduct = ensureArray(shopOrder?.items).some(
            (item) => safeText(item?.productId) === productId,
          );
          if (!containsProduct) return;

          const orderStatus = safeText(shopOrder?.status) || safeText(order?.status);
          if (!this.#shouldKeepProductReserved(orderStatus)) return;

          const referenceCreatedAt = safeText(order?.createdAt);
          if (
            !activeOrderReference ||
            toCreatedAtTime(referenceCreatedAt) >= toCreatedAtTime(activeOrderReference.createdAt)
          ) {
            activeOrderReference = {
              orderId: safeText(order?.id),
              orderStatus,
              createdAt: referenceCreatedAt,
            };
          }
        });
      });

      const nextSaleState = ProductSaleLifecycle.deriveState({
        orderReferences: activeOrderReference ? [activeOrderReference] : [],
        fallbackSoldAt: safeText(product?.soldAt),
      });

      return {
        ...product,
        ...nextSaleState,
      };
    });
  }

  syncProductSaleStatuses(payloadInput = {}) {
    const request = payloadInput instanceof ProductSaleSyncRequest
      ? payloadInput
      : ProductSaleSyncRequest.fromJSON(toPayloadObject(payloadInput));

    request.validate();
    this.#refreshProductSaleStatuses(request.productIds);
    this.#persist();

    const products = request.productIds
      .map((productId) => this.#findProductById(productId))
      .map((product) => this.#toProductResponse(product))
      .filter(Boolean);

    return {
      products,
      message: request.shouldReleaseProducts()
        ? "คืนสถานะสินค้าสำหรับคำสั่งซื้อที่ถูกยกเลิกแล้ว"
        : "sync สถานะขายออกของสินค้าแล้ว",
    };
  }

  #getOrCreateCart(userId) {
    const found = this.state.carts.find((cart) => cart.userId === userId);
    if (found) return found;

    const created = {
      id: `cart_${userId}`,
      userId,
      items: [],
    };
    this.state.carts.push(created);
    return created;
  }

  #findProductById(productId) {
    const normalizedId = safeText(productId);
    if (!normalizedId) return null;
    return this.state.products.find((product) => product.id === normalizedId) ?? null;
  }

  #findChatById(chatId) {
    const normalizedChatId = safeText(chatId);
    if (!normalizedChatId) return null;
    return this.state.chats.find((chat) => chat.id === normalizedChatId) ?? null;
  }

  #ensureChatMessages(chatRecord) {
    if (!chatRecord || typeof chatRecord !== "object") return [];
    if (!Array.isArray(chatRecord.messages)) chatRecord.messages = [];

    chatRecord.messages = chatRecord.messages
      .map((message, index) =>
        normalizeChatMessageRecord(
          message,
          safeText(chatRecord.buyerId),
          safeText(message?.createdAt) || new Date(Date.now() + index).toISOString(),
        ),
      )
      .sort((a, b) => toCreatedAtTime(a?.createdAt) - toCreatedAtTime(b?.createdAt));

    return chatRecord.messages;
  }

  #assertChatAccess(chatRecord, userId) {
    if (!chatRecord) throw new Error("ไม่พบห้องแชท");
    const normalizedUserId = safeText(userId);
    const isOwner = normalizedUserId && safeText(chatRecord.ownerId) === normalizedUserId;
    const isBuyer = normalizedUserId && safeText(chatRecord.buyerId) === normalizedUserId;
    if (!isOwner && !isBuyer) throw new Error("คุณไม่มีสิทธิ์เข้าถึงห้องแชทนี้");
  }

  #getChatCounterpart(chatRecord, currentUserId) {
    const normalizedCurrentUserId = safeText(currentUserId);
    const owner = this.#findUserById(chatRecord?.ownerId);
    const buyer = this.#findUserById(chatRecord?.buyerId);

    if (normalizedCurrentUserId && safeText(chatRecord?.ownerId) === normalizedCurrentUserId) {
      return buyer ?? owner;
    }

    return owner ?? buyer;
  }

  #toChatMessageResponse(chatRecord, messageRecord) {
    if (!chatRecord || !messageRecord) return null;
    const sender = this.#findUserById(messageRecord.senderId);
    return {
      id: messageRecord.id ?? "",
      chatId: chatRecord.id ?? "",
      senderId: messageRecord.senderId ?? "",
      senderName: sender?.name ?? "ผู้ใช้",
      senderAvatarUrl: sender?.avatarUrl ?? "",
      type: messageRecord.type ?? "text",
      orderId: messageRecord.orderId ?? "",
      text: messageRecord.text ?? "",
      imageUrl: messageRecord.imageUrl ?? "",
      meetupProposal: messageRecord.meetupProposal ?? null,
      createdAt: messageRecord.createdAt ?? "",
    };
  }

  #findOrCreateCheckoutChat({ buyerId, ownerId, productId }) {
    const normalizedBuyerId = safeText(buyerId);
    const normalizedOwnerId = safeText(ownerId);
    const normalizedProductId = safeText(productId);

    let chat = this.state.chats.find(
      (item) =>
        safeText(item?.buyerId) === normalizedBuyerId &&
        safeText(item?.ownerId) === normalizedOwnerId &&
        safeText(item?.productId) === normalizedProductId,
    );

    if (chat) {
      chat = normalizeChatRecord(chat);
      const index = this.state.chats.findIndex((item) => item?.id === chat.id);
      if (index >= 0) this.state.chats[index] = chat;
      return chat;
    }

    chat = normalizeChatRecord({
      id: createId("chat"),
      productId: normalizedProductId,
      ownerId: normalizedOwnerId,
      buyerId: normalizedBuyerId,
      createdAt: nowIso(),
      updatedAt: nowIso(),
      messages: [],
    });
    this.state.chats.push(chat);
    return chat;
  }

  #appendChatMessage(chatRecord, { senderId, type = "text", orderId = "", text = "", imageUrl = "", meetupProposal = null } = {}) {
    if (!chatRecord) return null;
    const createdAt = nowIso();
    const messageRecord = normalizeChatMessageRecord(
      {
        senderId,
        type,
        orderId,
        text,
        imageUrl,
        meetupProposal,
        createdAt,
      },
      senderId,
      createdAt,
    );

    const messages = this.#ensureChatMessages(chatRecord);
    messages.push(messageRecord);
    messages.sort((a, b) => toCreatedAtTime(a?.createdAt) - toCreatedAtTime(b?.createdAt));
    chatRecord.updatedAt = messageRecord.createdAt;

    return messageRecord;
  }

  #syncOrderStatusFromShopOrders(orderRecord) {
    if (!orderRecord || !Array.isArray(orderRecord.shopOrders)) return;

    const statuses = orderRecord.shopOrders
      .map((shopOrder) => safeText(shopOrder?.status))
      .filter(Boolean);

    if (!statuses.length) {
      orderRecord.status = "pending_seller_action";
      return;
    }

    if (statuses.every((status) => status === "completed")) {
      orderRecord.status = "completed";
      return;
    }

    if (statuses.some((status) => status === "reported_to_admin")) {
      orderRecord.status = "reported_to_admin";
      return;
    }

    if (statuses.some((status) => status === "rejected_by_buyer")) {
      orderRecord.status = "rejected_by_buyer";
      return;
    }

    if (statuses.every((status) => status === "cancelled_by_seller")) {
      orderRecord.status = "cancelled_by_seller";
      return;
    }

    if (statuses.some((status) => status === "awaiting_parcel_pickup")) {
      orderRecord.status = "awaiting_parcel_pickup";
      return;
    }

    if (statuses.some((status) => status === "awaiting_meetup")) {
      orderRecord.status = "awaiting_meetup";
      return;
    }

    if (statuses.some((status) => status === "countered_by_seller")) {
      orderRecord.status = "countered_by_seller";
      return;
    }

    if (statuses.some((status) => ["pending_payment_verification", "pending_seller_confirmation"].includes(status))) {
      orderRecord.status = "pending_payment_verification";
      return;
    }

    if (statuses.some((status) => ["pending_meetup_response", "pending_seller_response"].includes(status))) {
      orderRecord.status = "pending_meetup_response";
      return;
    }

    orderRecord.status = "pending_seller_action";
  }

  #toChatResponse(chatRecord, currentUserId) {
    if (!chatRecord) return null;

    const owner = this.#findUserById(chatRecord.ownerId);
    const buyer = this.#findUserById(chatRecord.buyerId);
    const counterpart = this.#getChatCounterpart(chatRecord, currentUserId);
    const product = this.#findProductById(chatRecord.productId);
    const messages = this.#ensureChatMessages(chatRecord);
    const lastMessageRecord = messages[messages.length - 1] ?? null;
    const lastMessage = this.#toChatMessageResponse(chatRecord, lastMessageRecord);

    return {
      id: chatRecord.id ?? "",
      productId: chatRecord.productId ?? "",
      productName: product?.name ?? "",
      ownerId: chatRecord.ownerId ?? "",
      buyerId: chatRecord.buyerId ?? "",
      sellerId: chatRecord.ownerId ?? "",
      sellerName: owner?.name ?? "ร้านค้า",
      sellerAvatarUrl: owner?.avatarUrl ?? "",
      counterpartId: counterpart?.id ?? "",
      counterpartName: counterpart?.name ?? "ร้านค้า",
      counterpartAvatarUrl: counterpart?.avatarUrl ?? "",
      ownerName: owner?.name ?? "",
      buyerName: buyer?.name ?? "",
      createdAt: chatRecord.createdAt ?? "",
      updatedAt: chatRecord.updatedAt ?? chatRecord.createdAt ?? "",
      lastMessage,
    };
  }

  #toCartItemResponse(cart, item) {
    const product = this.#findProductById(item.productId);
    const ownerId = safeText(product?.ownerId ?? item.ownerId);
    const shop = this.#findShopProfileByOwnerId(ownerId);
    const fallbackProduct = product
      ? this.#toProductResponse(product)
      : {
          id: item.productId,
          ownerId,
          name: item.snapshotName,
          imageUrl: item.snapshotImageUrl,
          imageUrls: [item.snapshotImageUrl].filter(Boolean),
          price: item.snapshotPrice,
        };

    return {
      id: item.id ?? "",
      cartId: cart.id ?? "",
      productId: item.productId ?? "",
      ownerId,
      name: product?.name ?? item.snapshotName ?? "",
      imageUrl: product?.imageUrl ?? item.snapshotImageUrl ?? "",
      price: toNumber(product?.price ?? item.snapshotPrice, 0),
      quantity: Math.max(1, toNumber(item.quantity, 1)),
      shopId: shop?.id ?? "",
      shopName: shop?.shopName ?? item.snapshotShopName ?? "",
      shopAvatarUrl: shop?.avatarUrl ?? item.snapshotShopAvatarUrl ?? "",
      shopParcelQrCodeUrl: shop?.parcelQrCodeUrl ?? item.snapshotShopParcelQrCodeUrl ?? "",
      shop: this.#toShopResponse(shop),
      product: fallbackProduct,
    };
  }

  #toOrderItemResponse(itemRecord) {
    if (!itemRecord) return null;
    return {
      itemId: safeText(itemRecord.itemId ?? itemRecord.id ?? itemRecord._id),
      productId: safeText(itemRecord.productId),
      name: safeText(itemRecord.name ?? itemRecord.productName),
      imageUrl: normalizeImageUrl(itemRecord.imageUrl ?? itemRecord.image, "product"),
      price: toNumber(itemRecord.price, 0),
      quantity: Math.max(1, toNumber(itemRecord.quantity ?? itemRecord.qty, 1)),
    };
  }

  #toOrderShopOrderResponse(shopOrderRecord) {
    if (!shopOrderRecord) return null;

    const items = ensureArray(shopOrderRecord.items)
      .map((item) => this.#toOrderItemResponse(item))
      .filter(Boolean);
    const buyerShippingAddressRecord =
      shopOrderRecord?.buyerShippingAddress && typeof shopOrderRecord.buyerShippingAddress === "object"
        ? shopOrderRecord.buyerShippingAddress
        : shopOrderRecord?.shippingAddress && typeof shopOrderRecord.shippingAddress === "object"
          ? shopOrderRecord.shippingAddress
          : null;

    return {
      ownerId: safeText(shopOrderRecord.ownerId),
      shopId: safeText(shopOrderRecord.shopId),
      shopName: safeText(shopOrderRecord.shopName) || "ร้านค้า",
      shippingMethod: ShippingMethod.normalize(shopOrderRecord.shippingMethod),
      status: safeText(shopOrderRecord.status),
      items,
      subtotal: toNumber(
        shopOrderRecord.subtotal,
        items.reduce((sum, item) => sum + (item.price ?? 0) * (item.quantity ?? 0), 0),
      ),
      meetupProposal: shopOrderRecord?.meetupProposal
        ? {
            location: safeText(shopOrderRecord.meetupProposal.location),
            status: safeText(shopOrderRecord.meetupProposal.status),
            proposedBy: safeText(shopOrderRecord.meetupProposal.proposedBy),
            proposedAt: safeText(shopOrderRecord.meetupProposal.proposedAt),
            responseLocation: safeText(shopOrderRecord.meetupProposal.responseLocation),
            respondedBy: safeText(shopOrderRecord.meetupProposal.respondedBy),
            respondedAt: safeText(shopOrderRecord.meetupProposal.respondedAt),
          }
        : null,
      parcelPayment: shopOrderRecord?.parcelPayment
        ? {
            qrCodeUrl: normalizeImageUrl(shopOrderRecord.parcelPayment.qrCodeUrl, "product"),
            receiptImageUrl: normalizeImageUrl(shopOrderRecord.parcelPayment.receiptImageUrl, "product"),
            status: safeText(shopOrderRecord.parcelPayment.status),
            submittedAt: safeText(shopOrderRecord.parcelPayment.submittedAt),
          }
        : null,
      adminReport: shopOrderRecord?.adminReport
        ? {
            reportId: safeText(shopOrderRecord.adminReport.reportId ?? shopOrderRecord.adminReport.id),
            status: safeText(shopOrderRecord.adminReport.status),
            reason: safeText(shopOrderRecord.adminReport.reason),
            createdAt: safeText(shopOrderRecord.adminReport.createdAt),
          }
        : null,
      buyerShippingAddress: buyerShippingAddressRecord
        ? {
            name: safeText(buyerShippingAddressRecord.name),
            phone: safeText(buyerShippingAddressRecord.phone),
            address: safeText(buyerShippingAddressRecord.address),
          }
        : null,
    };
  }

  #toOrderResponse(orderRecord) {
    if (!orderRecord) return null;

    const shopOrders = ensureArray(orderRecord.shopOrders)
      .map((shopOrder) => this.#toOrderShopOrderResponse(shopOrder))
      .filter(Boolean);
    const items = shopOrders.length
      ? shopOrders.flatMap((shopOrder) => ensureArray(shopOrder.items))
      : ensureArray(orderRecord.items)
          .map((item) => this.#toOrderItemResponse(item))
          .filter(Boolean);

    return {
      id: safeText(orderRecord.id ?? orderRecord._id),
      userId: safeText(orderRecord.userId),
      notes: safeText(orderRecord.notes),
      status: safeText(orderRecord.status),
      shopOrders,
      items,
      totalPrice: toNumber(
        orderRecord.totalPrice,
        items.reduce((sum, item) => sum + (item.price ?? 0) * (item.quantity ?? 0), 0),
      ),
      createdAt: safeText(orderRecord.createdAt),
    };
  }

  #toParcelPaymentReviewResponse(orderRecord, shopOrderRecord) {
    if (!orderRecord || !shopOrderRecord || !ShippingMethod.isParcel(shopOrderRecord.shippingMethod)) {
      return null;
    }

    const buyer = this.#findUserById(orderRecord.userId);
    const shopOrder = this.#toOrderShopOrderResponse(shopOrderRecord);
    if (!shopOrder) return null;

    return {
      orderId: safeText(orderRecord.id ?? orderRecord._id),
      shopOrderKey: safeText(shopOrderRecord.shopId || shopOrderRecord.ownerId),
      ownerId: safeText(shopOrderRecord.ownerId),
      shopId: safeText(shopOrderRecord.shopId),
      shopName: safeText(shopOrderRecord.shopName) || "ร้านค้า",
      buyerId: safeText(orderRecord.userId),
      buyerName: safeText(buyer?.name) || "ผู้ซื้อ",
      buyerAvatarUrl: normalizeImageUrl(buyer?.avatarUrl, "avatar"),
      status: safeText(shopOrderRecord.status),
      items: ensureArray(shopOrder.items),
      subtotal: toNumber(shopOrder.subtotal, 0),
      createdAt: safeText(orderRecord.createdAt),
      submittedAt: safeText(shopOrder.parcelPayment?.submittedAt) || safeText(orderRecord.createdAt),
      receiptImageUrl: normalizeImageUrl(shopOrder.parcelPayment?.receiptImageUrl, "product"),
      buyerShippingAddress: shopOrder.buyerShippingAddress,
      adminReport: shopOrder.adminReport,
    };
  }

  login(payloadInput = {}) {
    const payload = toPayloadObject(payloadInput);
    const identifier = payload.identifier ?? payload.email ?? payload.phone ?? "";
    const password = `${payload.password ?? ""}`;
    const user = this.#findUserByIdentifier(identifier);

    if (!user || user.password !== password) {
      throw new Error("อีเมล/เบอร์โทร หรือรหัสผ่านไม่ถูกต้อง");
    }

    this.state.session = { userId: user.id };
    this.#persist();

    return {
      user: this.#toPublicUser(user),
      token: `mock-token-${user.id}`,
    };
  }

  register(payloadInput = {}) {
    const payload = toPayloadObject(payloadInput);
    const email = toLower(payload.email);

    if (!email) throw new Error("กรุณากรอกอีเมล");
    if (this.state.users.some((user) => toLower(user.email) === email)) {
      throw new Error("อีเมลนี้ถูกใช้งานแล้ว");
    }

    const firstName = safeText(payload.firstName);
    const lastName = safeText(payload.lastName);
    const name = safeText(payload.name) || `${firstName} ${lastName}`.trim() || "ผู้ใช้ใหม่";

    const createdUser = {
      id: createId("user"),
      name,
      email,
      password: `${payload.password ?? ""}`,
      avatarUrl: normalizeImageUrl(payload.avatarUrl, "avatar") || DEFAULT_AVATAR_URL,
      phone: safeText(payload.phone),
      address: safeText(payload.address),
    };

    this.state.users.push(createdUser);
    this.#persist();

    return {
      user: this.#toPublicUser(createdUser),
      token: `mock-token-${createdUser.id}`,
    };
  }

  registerForm(payloadInput = {}) {
    return this.register(payloadInput);
  }

  authMe() {
    const user = this.#getCurrentUserRecord();
    if (!user) throw new Error("ยังไม่ได้เข้าสู่ระบบ");
    return {
      user: this.#toPublicUser(user),
    };
  }

  logout() {
    this.state.session = { userId: "" };
    this.#persist();
    return { ok: true };
  }

  userMe() {
    const user = this.#requireCurrentUser();
    return {
      user: this.#toPublicUser(user),
    };
  }

  updateUserMe(payloadInput = {}) {
    const user = this.#requireCurrentUser();
    const payload = toPayloadObject(payloadInput);
    const userRef = this.state.users.find((item) => item.id === user.id);

    if (!userRef) throw new Error("ไม่พบข้อมูลผู้ใช้");

    const hasName = Object.prototype.hasOwnProperty.call(payload, "name");
    const hasEmail = Object.prototype.hasOwnProperty.call(payload, "email");
    const hasPhone = Object.prototype.hasOwnProperty.call(payload, "phone");
    const hasAddress = Object.prototype.hasOwnProperty.call(payload, "address");
    const hasAvatarUrl = Object.prototype.hasOwnProperty.call(payload, "avatarUrl");
    const hasAvatarFile = Object.prototype.hasOwnProperty.call(payload, "avatar");

    const nextName = safeText(payload.name);
    const nextEmail = toLower(payload.email);
    const nextPhone = safeText(payload.phone);
    const nextAddress = safeText(payload.address);
    const avatarFromPayload = normalizeImageUrl(payload.avatarUrl, "avatar");
    const avatarFromFile = normalizeImageUrl(payload.avatar, "avatar");

    if (hasEmail && !nextEmail) {
      throw new Error("กรุณากรอกอีเมล");
    }
    if (nextEmail && this.state.users.some((item) => item.id !== user.id && toLower(item.email) === nextEmail)) {
      throw new Error("อีเมลนี้ถูกใช้งานแล้ว");
    }

    if (hasName) userRef.name = nextName;
    if (hasEmail) userRef.email = nextEmail;
    if (hasPhone) userRef.phone = nextPhone;
    if (hasAddress) userRef.address = nextAddress;
    if (hasAvatarUrl) userRef.avatarUrl = avatarFromPayload;
    if (hasAvatarFile && avatarFromFile) userRef.avatarUrl = avatarFromFile;

    this.#persist();

    return {
      user: this.#toPublicUser(userRef),
    };
  }

  deleteUserMe() {
    const user = this.#requireCurrentUser();
    const userId = safeText(user.id);
    const ownedProductIds = this.state.products
      .filter((product) => safeText(product?.ownerId) === userId)
      .map((product) => safeText(product?.id))
      .filter(Boolean);
    const ownedProductIdSet = new Set(ownedProductIds);

    this.state.users = this.state.users.filter((item) => safeText(item?.id) !== userId);
    this.state.shopProfiles = this.state.shopProfiles.filter((shop) => safeText(shop?.ownerId) !== userId);
    this.state.products = this.state.products.filter((product) => safeText(product?.ownerId) !== userId);
    this.state.carts = this.state.carts
      .filter((cart) => safeText(cart?.userId) !== userId)
      .map((cart) => ({
        ...cart,
        items: ensureArray(cart?.items).filter((item) => !ownedProductIdSet.has(safeText(item?.productId))),
      }));
    this.state.orders = this.state.orders.filter((order) => {
      const isBuyerOrder = safeText(order?.userId) === userId;
      const hasDeletedSeller = ensureArray(order?.shopOrders).some(
        (shopOrder) => safeText(shopOrder?.ownerId) === userId,
      );
      return !isBuyerOrder && !hasDeletedSeller;
    });
    this.state.chats = this.state.chats.filter((chat) => {
      const isParticipant =
        safeText(chat?.ownerId) === userId ||
        safeText(chat?.buyerId) === userId;
      const isOwnedProductChat = ownedProductIdSet.has(safeText(chat?.productId));
      return !isParticipant && !isOwnedProductChat;
    });
    this.state.session = { userId: "" };
    this.#persist();

    return { ok: true };
  }

  myShopMe() {
    const user = this.#requireCurrentUser();
    const shop = this.#getOrCreateShopProfile(user.id);
    return {
      shop: this.#toShopResponse(shop),
    };
  }

  upsertMyShop(payloadInput = {}) {
    const user = this.#requireCurrentUser();
    const payload = toPayloadObject(payloadInput);
    const shop = this.#getOrCreateShopProfile(user.id);

    shop.shopName = safeText(payload.shopName) || shop.shopName;
    shop.description = safeText(payload.description) || shop.description;
    shop.contact = safeText(payload.contact) || shop.contact;

    const nextAvatar = normalizeImageUrl(payload.avatar ?? payload.avatarUrl, "avatar");
    if (nextAvatar) shop.avatarUrl = nextAvatar;

    const nextParcelQrCode = normalizeImageUrl(
      payload.parcelQrCode ??
        payload.paymentQrCode ??
        payload.parcelQrCodeUrl ??
        payload.parcelPaymentQrCodeUrl ??
        payload.qrCodeUrl,
      "product",
    );
    if (nextParcelQrCode) shop.parcelQrCodeUrl = nextParcelQrCode;

    this.#persist();

    return {
      shop: this.#toShopResponse(shop),
    };
  }

  listMyProducts() {
    const user = this.#requireCurrentUser();
    const products = sortByCreatedAtDesc(
      this.state.products.filter((product) => product.ownerId === user.id),
    ).map((product) => this.#toProductResponse(product));

    return { products };
  }

  listMyParcelPaymentReviews() {
    const user = this.#requireCurrentUser();
    const reviews = this.state.orders
      .flatMap((order) =>
        ensureArray(order?.shopOrders).map((shopOrder) => ({
          order,
          shopOrder,
        })),
      )
      .filter(
        ({ shopOrder }) =>
          safeText(shopOrder?.ownerId) === safeText(user.id) &&
          ShippingMethod.isParcel(shopOrder?.shippingMethod),
      )
      .map(({ order, shopOrder }) => this.#toParcelPaymentReviewResponse(order, shopOrder))
      .filter(Boolean)
      .sort(
        (a, b) =>
          toCreatedAtTime(b?.submittedAt || b?.createdAt) -
          toCreatedAtTime(a?.submittedAt || a?.createdAt),
      );

    return { reviews };
  }

  listMarketplaceProducts() {
    const products = sortByCreatedAtDesc(this.state.products)
      .filter((product) => !this.#isProductSold(product))
      .map((product) => this.#toProductResponse(product));
    return { products };
  }

  getMarketplaceProductById(productId) {
    const product = this.#findProductById(productId);
    return {
      product: product ? this.#toProductResponse(product) : null,
    };
  }

  searchMarketplaceProducts(keywordInput = "") {
    const keyword = toLower(keywordInput);
    const products = sortByCreatedAtDesc(this.state.products)
      .filter((product) => {
        if (this.#isProductSold(product)) return false;
        if (!keyword) return true;
        const source = `${product?.name ?? ""} ${product?.description ?? ""}`.toLowerCase();
        return source.includes(keyword);
      })
      .map((product) => this.#toProductResponse(product));

    return { products };
  }

  createProduct(payloadInput = {}) {
    const user = this.#requireCurrentUser();
    const payload = toPayloadObject(payloadInput);
    const name = safeText(payload.name);
    const category = safeText(payload.category);
    const description = safeText(payload.description);
    const exchangeItem = safeText(payload.exchangeItem);
    const price = Math.max(0, toNumber(payload.price, 0));

    if (!name) throw new Error("กรุณากรอกชื่อสินค้า");
    if (!category) throw new Error("กรุณาเลือกหมวดหมู่สินค้า");
    if (price <= 0) throw new Error("กรุณากรอกราคาสินค้าให้มากกว่า 0");

    const imageUrls = this.#normalizeProductImageUrls(payload);
    const createdProduct = {
      id: createId("product"),
      ownerId: user.id,
      name,
      category,
      imageUrl: imageUrls[0] ?? buildFallbackImageUrl("product", "product"),
      imageUrls,
      price,
      exchangeItem,
      description,
      saleStatus: "available",
      soldAt: "",
      soldOrderId: "",
      createdAt: nowIso(),
    };

    this.state.products.unshift(createdProduct);
    this.#persist();

    return {
      product: this.#toProductResponse(createdProduct),
    };
  }

  updateMyProduct(productId, payloadInput = {}) {
    const user = this.#requireCurrentUser();
    const normalizedProductId = safeText(productId);
    if (!normalizedProductId) throw new Error("ไม่พบรหัสสินค้าที่ต้องการแก้ไข");

    const payload = toPayloadObject(payloadInput);
    const product = this.state.products.find((item) => item.id === normalizedProductId);
    if (!product) throw new Error("ไม่พบสินค้าที่ต้องการแก้ไข");
    if (safeText(product.ownerId) !== safeText(user.id)) {
      throw new Error("คุณไม่มีสิทธิ์แก้ไขสินค้านี้");
    }

    const hasName = Object.prototype.hasOwnProperty.call(payload, "name");
    const hasCategory = Object.prototype.hasOwnProperty.call(payload, "category");
    const hasPrice = Object.prototype.hasOwnProperty.call(payload, "price");
    const hasExchangeItem = Object.prototype.hasOwnProperty.call(payload, "exchangeItem");
    const hasDescription = Object.prototype.hasOwnProperty.call(payload, "description");
    const hasImageInput = ["image", "images", "imageUrl", "imageUrls"].some((key) =>
      Object.prototype.hasOwnProperty.call(payload, key),
    );

    if (hasName) {
      const nextName = safeText(payload.name);
      if (!nextName) throw new Error("กรุณากรอกชื่อสินค้า");
      product.name = nextName;
    }

    if (hasCategory) {
      const nextCategory = safeText(payload.category);
      if (!nextCategory) throw new Error("กรุณาเลือกหมวดหมู่สินค้า");
      product.category = nextCategory;
    }

    if (hasPrice) {
      const nextPrice = Math.max(0, toNumber(payload.price, 0));
      if (nextPrice <= 0) throw new Error("กรุณากรอกราคาสินค้าให้มากกว่า 0");
      product.price = nextPrice;
    }

    if (hasExchangeItem) {
      product.exchangeItem = safeText(payload.exchangeItem);
    }

    if (hasDescription) {
      product.description = safeText(payload.description);
    }

    if (hasImageInput) {
      const imageUrls = this.#normalizeProductImageUrls(payload);
      product.imageUrls = imageUrls;
      product.imageUrl = imageUrls[0] ?? buildFallbackImageUrl("product", "product");
    }

    this.#persist();

    return {
      product: this.#toProductResponse(product),
    };
  }

  deleteMyProduct(productId) {
    const user = this.#requireCurrentUser();
    const normalizedProductId = safeText(productId);
    if (!normalizedProductId) throw new Error("ไม่พบรหัสสินค้าที่ต้องการลบ");

    const productIndex = this.state.products.findIndex(
      (item) => item.id === normalizedProductId && safeText(item.ownerId) === safeText(user.id),
    );
    if (productIndex < 0) throw new Error("ไม่พบสินค้าที่ต้องการลบ");

    this.state.products.splice(productIndex, 1);

    this.state.carts = (Array.isArray(this.state.carts) ? this.state.carts : []).map((cart) => ({
      ...cart,
      items: (Array.isArray(cart?.items) ? cart.items : []).filter(
        (item) => safeText(item?.productId) !== normalizedProductId,
      ),
    }));

    this.state.chats = (Array.isArray(this.state.chats) ? this.state.chats : []).filter(
      (chat) => safeText(chat?.productId) !== normalizedProductId,
    );

    this.#persist();
    return { ok: true };
  }

  startProductChat(payloadInput = {}) {
    const requester = this.#requireCurrentUser();
    const payload = toPayloadObject(payloadInput);
    const productId = safeText(payload.productId);
    const product = this.#findProductById(productId);
    const ownerId = safeText(payload.ownerId) || product?.ownerId || "";
    const initialMessageText = safeText(payload.message);

    if (!productId) throw new Error("ไม่พบรหัสสินค้า");
    if (!ownerId) throw new Error("ไม่พบเจ้าของสินค้า");
    if (ownerId === requester.id) throw new Error("ไม่สามารถเริ่มแชทกับสินค้าของตัวเองได้");

    let chat = this.state.chats.find(
      (item) =>
        safeText(item?.productId) === productId &&
        safeText(item?.ownerId) === ownerId &&
        safeText(item?.buyerId) === safeText(requester.id),
    );

    if (!chat) {
      chat = normalizeChatRecord({
        id: createId("chat"),
        productId,
        ownerId,
        buyerId: requester.id,
        createdAt: nowIso(),
        updatedAt: nowIso(),
        messages: [],
      });
      this.state.chats.push(chat);
    } else {
      chat = normalizeChatRecord(chat);
      const index = this.state.chats.findIndex((item) => item?.id === chat.id);
      if (index >= 0) this.state.chats[index] = chat;
    }

    const messages = this.#ensureChatMessages(chat);
    if (initialMessageText) {
      const createdAt = nowIso();
      const createdMessage = normalizeChatMessageRecord(
        {
          senderId: requester.id,
          text: initialMessageText,
          imageUrl: "",
          createdAt,
        },
        requester.id,
        createdAt,
      );
      messages.push(createdMessage);
      messages.sort((a, b) => toCreatedAtTime(a?.createdAt) - toCreatedAtTime(b?.createdAt));
      chat.updatedAt = createdMessage.createdAt;
    } else if (!safeText(chat.updatedAt)) {
      chat.updatedAt = chat.createdAt || nowIso();
    }

    this.#persist();

    return {
      chatId: chat.id,
      chat: this.#toChatResponse(chat, requester.id),
      message: "สร้างห้องแชทแล้ว (mock)",
    };
  }

  listMyChats() {
    const currentUser = this.#requireCurrentUser();
    if (!Array.isArray(this.state.chats)) this.state.chats = [];
    this.state.chats = this.state.chats.map((chat) => normalizeChatRecord(chat));

    const chats = this.state.chats
      .filter((chat) => {
        const isOwner = safeText(chat?.ownerId) === safeText(currentUser.id);
        const isBuyer = safeText(chat?.buyerId) === safeText(currentUser.id);
        return isOwner || isBuyer;
      })
      .map((chat) => this.#toChatResponse(chat, currentUser.id))
      .filter(Boolean)
      .sort(
        (a, b) =>
          toCreatedAtTime(b?.updatedAt ?? b?.createdAt) - toCreatedAtTime(a?.updatedAt ?? a?.createdAt),
      );

    return { chats };
  }

  listChatMessages(chatId) {
    const currentUser = this.#requireCurrentUser();
    const chat = this.#findChatById(chatId);
    this.#assertChatAccess(chat, currentUser.id);
    const messages = this.#ensureChatMessages(chat).map((message) =>
      this.#toChatMessageResponse(chat, message),
    );

    return {
      chat: this.#toChatResponse(chat, currentUser.id),
      messages,
    };
  }

  sendChatMessage(chatId, payloadInput = {}) {
    const currentUser = this.#requireCurrentUser();
    const payload = toPayloadObject(payloadInput);
    const chat = this.#findChatById(chatId);
    this.#assertChatAccess(chat, currentUser.id);

    const text = safeText(payload.text ?? payload.message);
    const imageUrl = normalizeImageUrl(payload.image ?? payload.imageUrl, "product");
    if (!text && !imageUrl) throw new Error("กรุณากรอกข้อความหรือแนบรูปภาพ");

    const createdAt = nowIso();
    const createdMessage = normalizeChatMessageRecord(
      {
        senderId: currentUser.id,
        text,
        imageUrl,
        createdAt,
      },
      currentUser.id,
      createdAt,
    );

    const messages = this.#ensureChatMessages(chat);
    messages.push(createdMessage);
    messages.sort((a, b) => toCreatedAtTime(a?.createdAt) - toCreatedAtTime(b?.createdAt));
    chat.updatedAt = createdMessage.createdAt;

    this.#persist();

    return {
      chat: this.#toChatResponse(chat, currentUser.id),
      message: this.#toChatMessageResponse(chat, createdMessage),
    };
  }

  respondMeetupProposal(chatId, messageId, payloadInput = {}) {
    const currentUser = this.#requireCurrentUser();
    const payload = toPayloadObject(payloadInput);
    const chat = this.#findChatById(chatId);
    this.#assertChatAccess(chat, currentUser.id);

    if (safeText(chat?.ownerId) !== safeText(currentUser.id)) {
      throw new Error("เฉพาะคนขายเท่านั้นที่ตอบกลับข้อเสนอนัดรับได้");
    }

    const action = safeText(payload.action);
    const nextLocation = safeText(payload.location);
    if (!["accept", "counter", "cancel"].includes(action)) {
      throw new Error("ไม่พบ action สำหรับตอบกลับข้อเสนอนัดรับ");
    }
    if (action === "counter" && !nextLocation) {
      throw new Error("กรุณาระบุสถานที่นัดรับใหม่");
    }

    const messages = this.#ensureChatMessages(chat);
    const proposalMessage = messages.find((message) => safeText(message?.id) === safeText(messageId));
    if (!proposalMessage || safeText(proposalMessage?.type) !== "meetup_proposal" || !proposalMessage?.meetupProposal) {
      throw new Error("ไม่พบกล่องข้อเสนอนัดรับที่ต้องการตอบกลับ");
    }

    if (safeText(proposalMessage.meetupProposal.status) !== "pending_seller_response") {
      throw new Error("ข้อเสนอนัดรับนี้ถูกตอบกลับแล้ว");
    }

    const order = this.state.orders.find((item) => safeText(item?.id) === safeText(proposalMessage.orderId));
    if (!order) throw new Error("ไม่พบคำสั่งซื้อที่เกี่ยวข้องกับข้อเสนอนี้");

    const shopOrder = ensureArray(order.shopOrders).find(
      (item) =>
        safeText(item?.ownerId) === safeText(chat?.ownerId) &&
        ShippingMethod.isMeetup(item?.shippingMethod),
    );
    if (!shopOrder?.meetupProposal) {
      throw new Error("ไม่พบข้อมูลการนัดรับสำหรับคำสั่งซื้อนี้");
    }

    const respondedAt = nowIso();
    const sellerName = this.#findUserById(currentUser.id)?.name ?? "คนขาย";

    if (action === "accept") {
      proposalMessage.meetupProposal.status = "awaiting_meetup";
      proposalMessage.meetupProposal.respondedBy = currentUser.id;
      proposalMessage.meetupProposal.respondedAt = respondedAt;

      shopOrder.status = "awaiting_meetup";
      shopOrder.meetupProposal.status = "awaiting_meetup";
      shopOrder.meetupProposal.proposedAt = shopOrder.meetupProposal.proposedAt || proposalMessage.meetupProposal.proposedAt;
      shopOrder.meetupProposal.respondedBy = currentUser.id;
      shopOrder.meetupProposal.respondedAt = respondedAt;

      this.#appendChatMessage(chat, {
        senderId: currentUser.id,
        text: `${sellerName} ยอมรับข้อเสนอสถานที่นัดรับแล้ว สถานะคำสั่งซื้อเปลี่ยนเป็นรอนัดพบ`,
      });
    } else if (action === "counter") {
      proposalMessage.meetupProposal.status = "countered_by_seller";
      proposalMessage.meetupProposal.responseLocation = nextLocation;
      proposalMessage.meetupProposal.respondedBy = currentUser.id;
      proposalMessage.meetupProposal.respondedAt = respondedAt;

      shopOrder.status = "countered_by_seller";
      shopOrder.meetupProposal.status = "countered_by_seller";
      shopOrder.meetupProposal.responseLocation = nextLocation;
      shopOrder.meetupProposal.respondedBy = currentUser.id;
      shopOrder.meetupProposal.respondedAt = respondedAt;

      this.#appendChatMessage(chat, {
        senderId: currentUser.id,
        text: `${sellerName} เสนอเปลี่ยนสถานที่นัดรับเป็น: ${nextLocation}`,
      });
    } else {
      proposalMessage.meetupProposal.status = "cancelled_by_seller";
      proposalMessage.meetupProposal.respondedBy = currentUser.id;
      proposalMessage.meetupProposal.respondedAt = respondedAt;

      shopOrder.status = "cancelled_by_seller";
      shopOrder.meetupProposal.status = "cancelled_by_seller";
      shopOrder.meetupProposal.respondedBy = currentUser.id;
      shopOrder.meetupProposal.respondedAt = respondedAt;

      this.#appendChatMessage(chat, {
        senderId: currentUser.id,
        text: `${sellerName} ยกเลิกการนัดรับสำหรับคำสั่งซื้อนี้แล้ว`,
      });
    }

    this.#syncOrderStatusFromShopOrders(order);
    this.#refreshProductSaleStatuses(
      ensureArray(shopOrder.items).map((item) => item?.productId),
    );
    chat.updatedAt = respondedAt;
    this.#persist();

    return {
      chat: this.#toChatResponse(chat, currentUser.id),
      message: this.#toChatMessageResponse(chat, proposalMessage),
    };
  }

  listCart() {
    const user = this.#requireCurrentUser();
    const cart = this.#getOrCreateCart(user.id);

    const items = (Array.isArray(cart.items) ? cart.items : []).map((item) =>
      this.#toCartItemResponse(cart, item),
    );
    const totalItems = items.reduce((sum, item) => sum + (item.quantity ?? 0), 0);
    const totalPrice = items.reduce((sum, item) => sum + (item.price ?? 0) * (item.quantity ?? 0), 0);

    return {
      cartId: cart.id,
      items,
      totalItems,
      totalPrice,
    };
  }

  listMyOrders() {
    const user = this.#requireCurrentUser();
    const orders = sortByCreatedAtDesc(
      this.state.orders.filter((order) => safeText(order?.userId) === safeText(user.id)),
    )
      .map((order) => this.#toOrderResponse(order))
      .filter(Boolean);

    return { orders };
  }

  updateMyShopParcelPaymentReviewDecision(orderId, shopOrderKey, payloadInput = {}) {
    const currentUser = this.#requireCurrentUser();
    const payload = toPayloadObject(payloadInput);
    const normalizedOrderId = safeText(orderId);
    const normalizedShopOrderKey = safeText(shopOrderKey);
    const action = safeText(payload.action);
    const note = safeText(payload.note ?? payload.reason);

    if (!normalizedOrderId) throw new Error("ไม่พบ orderId");
    if (!normalizedShopOrderKey) throw new Error("ไม่พบ shopOrderKey");
    if (!["approve", "report"].includes(action)) {
      throw new Error("ไม่พบ action สำหรับตรวจสอบการชำระ");
    }

    const order = this.state.orders.find((item) => safeText(item?.id) === normalizedOrderId);
    if (!order) throw new Error("ไม่พบคำสั่งซื้อที่ต้องการตรวจสอบ");

    const shopOrder = ensureArray(order.shopOrders).find((item) => {
      const identityKey = safeText(item?.shopId || item?.ownerId);
      return (
        identityKey === normalizedShopOrderKey &&
        safeText(item?.ownerId) === safeText(currentUser.id) &&
        ShippingMethod.isParcel(item?.shippingMethod)
      );
    });
    if (!shopOrder) throw new Error("ไม่พบคำสั่งซื้อของร้านค้านี้");

    const currentStatus = safeText(shopOrder.status);
    if (!["pending_payment_verification", "pending_seller_confirmation"].includes(currentStatus)) {
      throw new Error("คำสั่งซื้อนี้ถูกตรวจสอบแล้ว");
    }

    if (!shopOrder.parcelPayment) {
      throw new Error("ไม่พบข้อมูลการชำระเงินของคำสั่งซื้อนี้");
    }

    const processedAt = nowIso();
    const buyer = this.#findUserById(order.userId);
    const sellerName = this.#findUserById(currentUser.id)?.name ?? "ร้านค้า";
    const firstItem = ensureArray(shopOrder.items)[0] ?? null;

    if (action === "approve") {
      shopOrder.status = "awaiting_parcel_pickup";
      shopOrder.parcelPayment.status = "approved";
      shopOrder.parcelPayment.verifiedAt = processedAt;
      shopOrder.parcelPayment.verifiedBy = currentUser.id;
      shopOrder.adminReport = null;

      if (firstItem?.productId) {
        const chat = this.#findOrCreateCheckoutChat({
          buyerId: order.userId,
          ownerId: shopOrder.ownerId,
          productId: firstItem.productId,
        });
        this.#appendChatMessage(chat, {
          senderId: currentUser.id,
          orderId: order.id,
          text: `${sellerName} ยืนยันการชำระเงินสำหรับคำสั่งซื้อ #${order.id} แล้ว สถานะเปลี่ยนเป็นรอรับพัสดุ`,
        });
      }
    } else {
      const reportRecord = normalizeAdminReportRecord({
        id: createId("admin_report"),
        type: "parcel_payment_receipt",
        status: "open",
        reason: note || "ร้านค้าสงสัยว่าใบเสร็จอาจไม่ถูกต้อง",
        orderId: order.id,
        shopOrderKey: normalizedShopOrderKey,
        buyerId: safeText(order.userId),
        reporterId: safeText(currentUser.id),
        receiptImageUrl: shopOrder.parcelPayment.receiptImageUrl,
        createdAt: processedAt,
      });

      this.state.adminReports.push(reportRecord);
      shopOrder.status = "reported_to_admin";
      shopOrder.parcelPayment.status = "reported_to_admin";
      shopOrder.adminReport = {
        reportId: reportRecord.id,
        status: reportRecord.status,
        reason: reportRecord.reason,
        createdAt: reportRecord.createdAt,
      };

      if (firstItem?.productId) {
        const chat = this.#findOrCreateCheckoutChat({
          buyerId: order.userId,
          ownerId: shopOrder.ownerId,
          productId: firstItem.productId,
        });
        this.#appendChatMessage(chat, {
          senderId: currentUser.id,
          orderId: order.id,
          text: `${sellerName} รายงานใบเสร็จของคำสั่งซื้อ #${order.id} ให้ Admin ตรวจสอบแล้ว${reportRecord.reason ? `: ${reportRecord.reason}` : ""}`,
        });
      }
    }

    this.#syncOrderStatusFromShopOrders(order);
    this.#refreshProductSaleStatuses(
      ensureArray(shopOrder.items).map((item) => item?.productId),
    );
    this.#persist();

    return {
      review: this.#toParcelPaymentReviewResponse(order, shopOrder),
      message:
        action === "approve"
          ? `ยืนยันคำสั่งซื้อของ ${buyer?.name ?? "ผู้ซื้อ"} แล้ว สถานะเปลี่ยนเป็นรอรับพัสดุ`
          : "รายงานรายการนี้ไปยัง Admin แล้ว",
    };
  }

  updateMyOrderShopDecision(orderId, shopOrderKey, payloadInput = {}) {
    const currentUser = this.#requireCurrentUser();
    const payload = toPayloadObject(payloadInput);
    const normalizedOrderId = safeText(orderId);
    const normalizedShopOrderKey = safeText(shopOrderKey);
    const action = safeText(payload.action);

    if (!normalizedOrderId) throw new Error("ไม่พบ orderId");
    if (!normalizedShopOrderKey) throw new Error("ไม่พบ shopOrderKey");
    if (!["receive", "reject"].includes(action)) {
      throw new Error("ไม่พบ action สำหรับอัปเดตคำสั่งซื้อ");
    }

    const order = this.state.orders.find(
      (item) =>
        safeText(item?.id) === normalizedOrderId &&
        safeText(item?.userId) === safeText(currentUser.id),
    );
    if (!order) throw new Error("ไม่พบคำสั่งซื้อของผู้ใช้");

    const shopOrder = ensureArray(order.shopOrders).find((item) => {
      const identityKey = safeText(item?.shopId || item?.ownerId);
      return identityKey === normalizedShopOrderKey;
    });
    if (!shopOrder) throw new Error("ไม่พบคำสั่งซื้อของร้านค้านี้");

    const currentStatus = safeText(shopOrder.status);
    if (["completed", "rejected", "rejected_by_buyer", "cancelled", "cancelled_by_seller"].includes(currentStatus)) {
      throw new Error("คำสั่งซื้อนี้ถูกปิดแล้ว");
    }

    if (action === "receive") {
      shopOrder.status = "completed";
      if (shopOrder.meetupProposal) shopOrder.meetupProposal.status = "completed";
      if (shopOrder.parcelPayment) shopOrder.parcelPayment.status = "completed";
    } else {
      shopOrder.status = "rejected_by_buyer";
      if (shopOrder.meetupProposal) shopOrder.meetupProposal.status = "rejected_by_buyer";
      if (shopOrder.parcelPayment) shopOrder.parcelPayment.status = "rejected_by_buyer";
    }

    const firstItem = ensureArray(shopOrder.items)[0] ?? null;
    if (firstItem?.productId) {
      const chat = this.#findOrCreateCheckoutChat({
        buyerId: currentUser.id,
        ownerId: shopOrder.ownerId,
        productId: firstItem.productId,
      });
      const buyerName = this.#findUserById(currentUser.id)?.name ?? "ผู้ซื้อ";
      this.#appendChatMessage(chat, {
        senderId: currentUser.id,
        orderId: order.id,
        text:
          action === "receive"
            ? `${buyerName} กดยืนยันรับของสำหรับคำสั่งซื้อ #${order.id} แล้ว`
            : `${buyerName} กดปฏิเสธของสำหรับคำสั่งซื้อ #${order.id} แล้ว`,
      });
    }

    this.#syncOrderStatusFromShopOrders(order);
    this.#refreshProductSaleStatuses(
      ensureArray(shopOrder.items).map((item) => item?.productId),
    );
    this.#persist();

    return {
      order: this.#toOrderResponse(order),
      message:
        action === "receive"
          ? "อัปเดตสถานะเป็นรับของแล้ว"
          : "อัปเดตสถานะเป็นปฏิเสธของแล้ว",
    };
  }

  addCartItem(payloadInput = {}) {
    const user = this.#requireCurrentUser();
    const payload = toPayloadObject(payloadInput);
    const productId = safeText(payload.productId);
    const quantity = Math.max(1, toNumber(payload.quantity, 1));
    const product = this.#findProductById(productId);

    if (!product) throw new Error("ไม่พบสินค้าที่ต้องการเพิ่มลงตะกร้า");
    if (this.#isProductSold(product)) throw new Error("สินค้านี้ขายออกแล้ว");

    const cart = this.#getOrCreateCart(user.id);
    if (!Array.isArray(cart.items)) cart.items = [];

    const existing = cart.items.find((item) => item.productId === productId);
    if (existing) {
      existing.quantity = Math.max(1, toNumber(existing.quantity, 1) + quantity);
    } else {
      const productShop = this.#findShopProfileByOwnerId(product.ownerId);
      cart.items.push({
        id: createId("cart_item"),
        productId,
        ownerId: product.ownerId,
        quantity,
        snapshotName: product.name,
        snapshotImageUrl: product.imageUrl,
        snapshotPrice: product.price,
        snapshotShopName: productShop?.shopName ?? "",
        snapshotShopAvatarUrl: productShop?.avatarUrl ?? "",
        snapshotShopParcelQrCodeUrl: productShop?.parcelQrCodeUrl ?? "",
      });
    }

    this.#persist();

    const latestItem = cart.items.find((item) => item.productId === productId) ?? cart.items[0];
    return {
      item: this.#toCartItemResponse(cart, latestItem),
      cartId: cart.id,
    };
  }

  removeCartItem({ itemId, productId } = {}) {
    const user = this.#requireCurrentUser();
    const cart = this.#getOrCreateCart(user.id);
    const normalizedItemId = safeText(itemId);
    const normalizedProductId = safeText(productId);

    const nextItems = (Array.isArray(cart.items) ? cart.items : []).filter((item) => {
      if (normalizedItemId) return item.id !== normalizedItemId;
      if (normalizedProductId) return item.productId !== normalizedProductId;
      return true;
    });

    if (nextItems.length === (cart.items ?? []).length) {
      throw new Error("ไม่พบสินค้าที่ต้องการลบจากตะกร้า");
    }

    cart.items = nextItems;
    this.#persist();
    return { ok: true };
  }

  checkout(payloadInput = {}) {
    const user = this.#requireCurrentUser();
    const payload = toPayloadObject(payloadInput);
    const cart = this.#getOrCreateCart(user.id);
    const cartItems = Array.isArray(cart.items) ? cart.items : [];

    if (!cartItems.length) throw new Error("ไม่พบสินค้าในตะกร้า");

    const resolvedItems = cartItems.map((item) => this.#toCartItemResponse(cart, item));
    const soldCartItem = resolvedItems.find((item) => this.#isProductSold(this.#findProductById(item?.productId)));
    if (soldCartItem) {
      throw new Error(`สินค้า ${soldCartItem?.name ?? ""} ขายออกแล้ว กรุณาลบออกจากตะกร้า`);
    }
    const rawShopOrders = Array.isArray(payload.shopOrders)
      ? payload.shopOrders
      : tryParseJson(payload.shopOrders, []);

    if (!Array.isArray(rawShopOrders) || !rawShopOrders.length) {
      const orderTotal = resolvedItems.reduce(
        (sum, item) => sum + (item.price ?? 0) * (item.quantity ?? 0),
        0,
      );

      const createdOrder = {
        id: createId("order"),
        userId: user.id,
        notes: safeText(payload.notes),
        items: resolvedItems.map((item) => ({
          productId: item.productId,
          name: item.name,
          imageUrl: item.imageUrl,
          price: item.price,
          quantity: item.quantity,
        })),
        totalPrice: orderTotal,
        createdAt: nowIso(),
      };

      const soldProductIds = new Set(resolvedItems.map((item) => safeText(item?.productId)).filter(Boolean));
      this.state.products = this.state.products.map((product) => {
        if (!soldProductIds.has(safeText(product?.id))) return product;
        return {
          ...product,
          saleStatus: "sold",
          soldAt: createdOrder.createdAt,
          soldOrderId: createdOrder.id,
        };
      });
      this.state.carts = ensureArray(this.state.carts).map((currentCart) => ({
        ...currentCart,
        items: ensureArray(currentCart?.items).filter(
          (item) => !soldProductIds.has(safeText(item?.productId)),
        ),
      }));
      this.state.orders.push(createdOrder);
      cart.items = [];
      this.#persist();

      return {
        orderId: createdOrder.id,
        message: "สั่งซื้อเรียบร้อย (mock mode)",
      };
    }

    const normalizedShopOrders = rawShopOrders.map((shopOrder, index) => {
      const normalizedOwnerId = safeText(shopOrder?.ownerId);
      const requestedItemIds = ensureArray(shopOrder?.itemIds)
        .map((itemId) => safeText(itemId))
        .filter(Boolean);
      const selectedItems = resolvedItems.filter((item) => {
        const sameOwner = safeText(item?.ownerId) === normalizedOwnerId;
        if (!sameOwner) return false;
        if (!requestedItemIds.length) return true;
        return requestedItemIds.includes(safeText(item?.id));
      });

      if (!normalizedOwnerId) {
        throw new Error(`ไม่พบ ownerId ของร้านลำดับที่ ${index + 1}`);
      }
      if (!selectedItems.length) {
        throw new Error(`ไม่พบสินค้าของร้านลำดับที่ ${index + 1} ในตะกร้า`);
      }

      const shippingMethod = ShippingMethod.normalize(shopOrder?.shippingMethod);
      const shop = this.#findShopProfileByOwnerId(normalizedOwnerId);
      const meetupLocation = safeText(shopOrder?.meetupLocation);
      const buyerShippingAddressInput =
        shopOrder?.buyerShippingAddress && typeof shopOrder.buyerShippingAddress === "object"
          ? shopOrder.buyerShippingAddress
          : {};
      const buyerShippingAddress = {
        name: safeText(buyerShippingAddressInput?.name ?? user.name),
        phone: safeText(buyerShippingAddressInput?.phone ?? user.phone),
        address: safeText(buyerShippingAddressInput?.address ?? user.address ?? shopOrder?.buyerAddress),
      };
      const receiptFileKey = safeText(shopOrder?.receiptFileKey);
      const receiptImageUrl = normalizeImageUrl(
        payload?.[receiptFileKey] ?? shopOrder?.receiptImageUrl ?? shopOrder?.receiptImage,
        "product",
      );
      const subtotal = selectedItems.reduce(
        (sum, item) => sum + (item.price ?? 0) * (item.quantity ?? 0),
        0,
      );

      if (ShippingMethod.isMeetup(shippingMethod) && !meetupLocation) {
        throw new Error(`กรุณาระบุสถานที่นัดรับสำหรับร้าน ${shop?.shopName || selectedItems[0]?.shopName || index + 1}`);
      }

      if (ShippingMethod.isParcel(shippingMethod)) {
        if (!safeText(shop?.parcelQrCodeUrl)) {
          throw new Error(`ร้าน ${shop?.shopName || selectedItems[0]?.shopName || index + 1} ยังไม่ได้ตั้งค่า QR code รับชำระ`);
        }
        if (!receiptImageUrl) {
          throw new Error(`กรุณาแนบรูปใบเสร็จสำหรับร้าน ${shop?.shopName || selectedItems[0]?.shopName || index + 1}`);
        }
        if (!buyerShippingAddress.address) {
          throw new Error("กรุณากรอกที่อยู่ผู้ซื้อก่อนสั่งซื้อแบบส่งพัสดุ");
        }
      }

      return {
        ownerId: normalizedOwnerId,
        shopId: safeText(shop?.id),
        shopName: safeText(shop?.shopName) || safeText(selectedItems[0]?.shopName) || "ร้านค้า",
        shippingMethod,
        status: ShippingMethod.isParcel(shippingMethod)
          ? "pending_payment_verification"
          : "pending_meetup_response",
        items: selectedItems.map((item) => ({
          itemId: item.id,
          productId: item.productId,
          name: item.name,
          imageUrl: item.imageUrl,
          price: item.price,
          quantity: item.quantity,
        })),
        subtotal,
        meetupProposal: ShippingMethod.isMeetup(shippingMethod)
          ? {
              location: meetupLocation,
              status: "pending_seller_response",
              proposedBy: user.id,
              proposedAt: nowIso(),
            }
          : null,
        parcelPayment: ShippingMethod.isParcel(shippingMethod)
          ? {
              qrCodeUrl: shop?.parcelQrCodeUrl ?? "",
              receiptImageUrl,
              status: "pending_seller_confirmation",
              submittedAt: nowIso(),
            }
          : null,
        buyerShippingAddress: ShippingMethod.isParcel(shippingMethod) ? buyerShippingAddress : null,
      };
    });

    const createdAt = nowIso();
    const totalPrice = normalizedShopOrders.reduce((sum, shopOrder) => sum + (shopOrder?.subtotal ?? 0), 0);
    const createdOrder = {
      id: createId("order"),
      userId: user.id,
      notes: safeText(payload.notes),
      status: "pending_seller_action",
      shopOrders: normalizedShopOrders,
      items: normalizedShopOrders.flatMap((shopOrder) => shopOrder.items),
      totalPrice,
      createdAt,
    };

    const consumedItemIds = new Set(
      normalizedShopOrders.flatMap((shopOrder) => shopOrder.items.map((item) => safeText(item?.itemId))),
    );

    normalizedShopOrders.forEach((shopOrder) => {
      const firstItem = shopOrder?.items?.[0];
      if (!firstItem?.productId) return;

      const chat = this.#findOrCreateCheckoutChat({
        buyerId: user.id,
        ownerId: shopOrder.ownerId,
        productId: firstItem.productId,
      });
      const itemSummary = shopOrder.items
        .map((item) => `- ${item.name} x ${item.quantity}`)
        .join("\n");

      if (ShippingMethod.isMeetup(shopOrder.shippingMethod)) {
        this.#appendChatMessage(chat, {
          senderId: user.id,
          type: "meetup_proposal",
          orderId: createdOrder.id,
          meetupProposal: {
            location: shopOrder?.meetupProposal?.location ?? "",
            status: shopOrder?.meetupProposal?.status ?? "pending_seller_response",
            proposedBy: user.id,
            proposedAt: shopOrder?.meetupProposal?.proposedAt ?? createdAt,
          },
        });
        this.#appendChatMessage(chat, {
          senderId: user.id,
          text: [
            `คำขอสั่งซื้อ #${createdOrder.id}`,
            "วิธีจัดส่ง: นัดรับ",
            "รายการสินค้า:",
            itemSummary,
            "กรุณาตอบกลับจากกล่องข้อเสนอด้านบนเพื่อยอมรับ เสนอเปลี่ยนสถานที่ หรือยกเลิกการนัดรับ",
          ].join("\n"),
        });
        return;
      }

      this.#appendChatMessage(chat, {
        senderId: user.id,
        text: [
          `คำขอสั่งซื้อ #${createdOrder.id}`,
          "วิธีจัดส่ง: ส่งพัสดุ",
          `ชื่อผู้รับ: ${shopOrder?.buyerShippingAddress?.name ?? "-"}`,
          `เบอร์โทรผู้รับ: ${shopOrder?.buyerShippingAddress?.phone ?? "-"}`,
          `ที่อยู่จัดส่ง: ${shopOrder?.buyerShippingAddress?.address ?? "-"}`,
          "ผู้ซื้อแนบสลิปการชำระเงินแล้ว กรุณาตรวจสอบข้อมูลและยืนยันคำสั่งซื้อ",
          "รายการสินค้า:",
          itemSummary,
        ].join("\n"),
      });

      if (safeText(shopOrder?.parcelPayment?.receiptImageUrl)) {
        this.#appendChatMessage(chat, {
          senderId: user.id,
          text: `สลิปการชำระเงินสำหรับคำสั่งซื้อ #${createdOrder.id}`,
          imageUrl: shopOrder.parcelPayment.receiptImageUrl,
        });
      }
    });

    const soldProductIds = new Set(
      normalizedShopOrders.flatMap((shopOrder) => shopOrder.items.map((item) => safeText(item?.productId))).filter(Boolean),
    );
    this.state.products = this.state.products.map((product) => {
      if (!soldProductIds.has(safeText(product?.id))) return product;
      return {
        ...product,
        saleStatus: "sold",
        soldAt: createdAt,
        soldOrderId: createdOrder.id,
      };
    });
    this.state.carts = ensureArray(this.state.carts).map((currentCart) => ({
      ...currentCart,
      items: ensureArray(currentCart?.items).filter(
        (item) => !soldProductIds.has(safeText(item?.productId)),
      ),
    }));
    this.state.orders.push(createdOrder);
    cart.items = ensureArray(cart.items).filter(
      (item) =>
        !consumedItemIds.has(safeText(item?.id)) &&
        !soldProductIds.has(safeText(item?.productId)),
    );
    this.#persist();

    return {
      orderId: createdOrder.id,
      message: "ส่งคำสั่งซื้อไปยังร้านค้าแล้ว สามารถติดตามได้ที่หน้า การสั่งซื้อของฉัน หรือทางแชท",
    };
  }
}
