const MOCK_DB_STORAGE_KEY = "myweb:mock-db:v1";
const DEFAULT_AVATAR_URL = "/App logo.jpg";
const DEFAULT_PRODUCT_IMAGE_URL = "/vite.svg";

const deepClone = (value) => {
  if (typeof structuredClone === "function") return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
};

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

const createSeedState = () => {
  const demoUserId = "user_demo";
  const ownerUserId = "user_owner";
  const now = Date.now();

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
        idCard: {
          citizenId: "1111111111111",
          title: "นาย",
          firstName: "ผู้ใช้",
          lastName: "ทดสอบ",
          dob: "1995-01-01",
        },
      },
      {
        id: ownerUserId,
        name: "ร้านตัวอย่าง",
        email: "seller@myweb.local",
        password: "123456",
        avatarUrl: `${DEFAULT_AVATAR_URL}?owner=1`,
        phone: "0899999999",
        address: "เชียงใหม่",
        idCard: {
          citizenId: "2222222222222",
          title: "นางสาว",
          firstName: "เจ้าของ",
          lastName: "ร้าน",
          dob: "1993-05-20",
        },
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
      },
      {
        id: "shop_owner",
        ownerId: ownerUserId,
        shopName: "ร้านตัวอย่าง",
        description: "สินค้าเดโม่สำหรับทดสอบหน้า home และ search",
        contact: "Line: seller-shop",
        avatarUrl: `${DEFAULT_AVATAR_URL}?shop=owner`,
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
    chats: [],
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
      users: Array.isArray(state.users) ? state.users : seed.users,
      session: state.session && typeof state.session === "object" ? state.session : seed.session,
      shopProfiles: Array.isArray(state.shopProfiles) ? state.shopProfiles : seed.shopProfiles,
      products: Array.isArray(state.products) ? state.products : seed.products,
      carts: Array.isArray(state.carts) ? state.carts : seed.carts,
      orders: Array.isArray(state.orders) ? state.orders : seed.orders,
      chats: Array.isArray(state.chats) ? state.chats : seed.chats,
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
      idCard: {
        citizenId: userRecord?.idCard?.citizenId ?? "",
        title: userRecord?.idCard?.title ?? "",
        firstName: userRecord?.idCard?.firstName ?? "",
        lastName: userRecord?.idCard?.lastName ?? "",
        dob: userRecord?.idCard?.dob ?? "",
      },
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
    };
    this.state.shopProfiles.push(created);
    this.#persist();
    return created;
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
      description: productRecord.description ?? "",
      createdAt: productRecord.createdAt ?? "",
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

  #toCartItemResponse(cart, item) {
    const product = this.#findProductById(item.productId);
    const fallbackProduct = product
      ? this.#toProductResponse(product)
      : {
          id: item.productId,
          name: item.snapshotName,
          imageUrl: item.snapshotImageUrl,
          imageUrls: [item.snapshotImageUrl].filter(Boolean),
          price: item.snapshotPrice,
        };

    return {
      id: item.id ?? "",
      cartId: cart.id ?? "",
      productId: item.productId ?? "",
      name: product?.name ?? item.snapshotName ?? "",
      imageUrl: product?.imageUrl ?? item.snapshotImageUrl ?? "",
      price: toNumber(product?.price ?? item.snapshotPrice, 0),
      quantity: Math.max(1, toNumber(item.quantity, 1)),
      product: fallbackProduct,
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
      idCard: {
        citizenId: safeText(payload.nationalId ?? payload.citizenId),
        title: safeText(payload.title),
        firstName: firstName || safeText(payload.idCardFirstName),
        lastName: lastName || safeText(payload.idCardLastName),
        dob: safeText(payload.dob ?? payload.birthDate),
      },
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

  myShopMe() {
    const user = this.#requireCurrentUser();
    const shop = this.#getOrCreateShopProfile(user.id);
    return {
      shop: deepClone(shop),
    };
  }

  upsertMyShop(payloadInput = {}) {
    const user = this.#requireCurrentUser();
    const payload = toPayloadObject(payloadInput);
    const shop = this.#getOrCreateShopProfile(user.id);

    shop.shopName = safeText(payload.shopName) || shop.shopName;
    shop.description = safeText(payload.description) || shop.description;
    shop.contact = safeText(payload.contact) || shop.contact;

    const nextAvatar = normalizeImageUrl(payload.avatarUrl, "avatar");
    if (nextAvatar) shop.avatarUrl = nextAvatar;

    this.#persist();

    return {
      shop: deepClone(shop),
    };
  }

  listMyProducts() {
    const user = this.#requireCurrentUser();
    const products = sortByCreatedAtDesc(
      this.state.products.filter((product) => product.ownerId === user.id),
    ).map((product) => this.#toProductResponse(product));

    return { products };
  }

  listMarketplaceProducts() {
    const products = sortByCreatedAtDesc(this.state.products).map((product) => this.#toProductResponse(product));
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
      description,
      createdAt: nowIso(),
    };

    this.state.products.unshift(createdProduct);
    this.#persist();

    return {
      product: this.#toProductResponse(createdProduct),
    };
  }

  startProductChat(payloadInput = {}) {
    const requester = this.#requireCurrentUser();
    const payload = toPayloadObject(payloadInput);
    const productId = safeText(payload.productId);
    const product = this.#findProductById(productId);
    const ownerId = safeText(payload.ownerId) || product?.ownerId || "";
    const message = safeText(payload.message) || "เริ่มแชท";

    if (!productId) throw new Error("ไม่พบรหัสสินค้า");
    if (!ownerId) throw new Error("ไม่พบเจ้าของสินค้า");

    const createdChat = {
      id: createId("chat"),
      productId,
      ownerId,
      buyerId: requester.id,
      message,
      createdAt: nowIso(),
    };

    this.state.chats.push(createdChat);
    this.#persist();

    return {
      chatId: createdChat.id,
      chat: deepClone(createdChat),
      message: "สร้างห้องแชทแล้ว (mock)",
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

  addCartItem(payloadInput = {}) {
    const user = this.#requireCurrentUser();
    const payload = toPayloadObject(payloadInput);
    const productId = safeText(payload.productId);
    const quantity = Math.max(1, toNumber(payload.quantity, 1));
    const product = this.#findProductById(productId);

    if (!product) throw new Error("ไม่พบสินค้าที่ต้องการเพิ่มลงตะกร้า");

    const cart = this.#getOrCreateCart(user.id);
    if (!Array.isArray(cart.items)) cart.items = [];

    const existing = cart.items.find((item) => item.productId === productId);
    if (existing) {
      existing.quantity = Math.max(1, toNumber(existing.quantity, 1) + quantity);
    } else {
      cart.items.push({
        id: createId("cart_item"),
        productId,
        quantity,
        snapshotName: product.name,
        snapshotImageUrl: product.imageUrl,
        snapshotPrice: product.price,
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

    this.state.orders.push(createdOrder);
    cart.items = [];
    this.#persist();

    return {
      orderId: createdOrder.id,
      message: "สั่งซื้อเรียบร้อย (mock mode)",
    };
  }
}
