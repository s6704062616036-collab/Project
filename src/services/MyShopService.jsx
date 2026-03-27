import { HttpClient } from "./HttpClient";
import { ShopProfile } from "../models/ShopProfile";
import { ShopProduct } from "../models/ShopProduct";
import { SellerParcelPaymentReview } from "../models/SellerParcelPaymentReview";
import { ProductSaleSyncRequest } from "../models/ProductSaleSyncRequest";

const ensureArray = (value) => (Array.isArray(value) ? value : value == null ? [] : [value]);

const getByPath = (source, path = []) =>
  ensureArray(path).reduce(
    (current, key) => (current && typeof current === "object" ? current[key] : undefined),
    source,
  );

const pickFirstDefined = (source, paths = []) => {
  for (const path of paths) {
    const value = getByPath(source, path);
    if (value !== undefined && value !== null) return value;
  }
  return undefined;
};

const pickArray = (source, paths = []) => {
  const value = pickFirstDefined(source, paths);
  return Array.isArray(value) ? value : [];
};

const normalizeOrderPayload = (payload) => {
  if (!payload || typeof payload !== "object") return null;

  const normalizedShopOrders = pickArray(payload, [
    ["shopOrders"],
    ["sellerOrders"],
    ["subOrders"],
    ["orderShops"],
    ["shops"],
  ]);

  if (!normalizedShopOrders.length && !payload?.id && !payload?._id && !payload?.orderId) {
    return null;
  }

  return normalizedShopOrders.length
    ? {
        ...payload,
        shopOrders: normalizedShopOrders,
      }
    : payload;
};

const looksLikeParcelReviewPayload = (payload) =>
  Boolean(
    payload &&
      typeof payload === "object" &&
      (
        normalizeOrderPayload(payload)?.shopOrders?.length ||
        payload?.orderId ||
        payload?.buyerId ||
        payload?.buyerName ||
        payload?.ownerId ||
        payload?.parcelPayment ||
        payload?.payment ||
        payload?.receiptImageUrl ||
        payload?.receiptUrl ||
        payload?.paymentStatus ||
        payload?.reviewStatus ||
        payload?.verificationStatus ||
        `${payload?.shippingMethod ?? ""}`.trim().toLowerCase() === "parcel"
      ),
  );

const extractParcelPaymentReviews = (payload) => {
  if (Array.isArray(payload)) {
    return payload.flatMap((item) => extractParcelPaymentReviews(item));
  }

  if (!payload || typeof payload !== "object") {
    return [];
  }

  const directReviewArrays = [
    pickArray(payload, [["reviews"], ["items"], ["results"]]),
    pickArray(payload, [["data", "reviews"], ["data", "items"], ["data", "results"]]),
  ]
    .flat()
    .filter((item) => looksLikeParcelReviewPayload(item));

  if (directReviewArrays.length) {
    return directReviewArrays.flatMap((item) => {
      const normalizedOrderPayload = normalizeOrderPayload(item);
      if (normalizedOrderPayload?.shopOrders?.length) {
        return SellerParcelPaymentReview.listFromOrderPayload(normalizedOrderPayload);
      }
      return [SellerParcelPaymentReview.fromJSON(item)];
    });
  }

  const directReviewObject = pickFirstDefined(payload, [
    ["review"],
    ["parcelPaymentReview"],
    ["item"],
    ["result"],
    ["data", "review"],
    ["data", "parcelPaymentReview"],
    ["data", "item"],
    ["data", "result"],
  ]);
  if (directReviewObject && typeof directReviewObject === "object") {
    const normalizedOrderPayload = normalizeOrderPayload(directReviewObject);
    if (normalizedOrderPayload?.shopOrders?.length) {
      return SellerParcelPaymentReview.listFromOrderPayload(normalizedOrderPayload);
    }
    return [SellerParcelPaymentReview.fromJSON(directReviewObject)];
  }

  const orderArrays = [
    pickArray(payload, [["orders"], ["data", "orders"]]),
  ].flat();
  if (orderArrays.length) {
    return orderArrays.flatMap((item) => {
      const normalizedOrderPayload = normalizeOrderPayload(item);
      return normalizedOrderPayload?.shopOrders?.length
        ? SellerParcelPaymentReview.listFromOrderPayload(normalizedOrderPayload)
        : [];
    });
  }

  const directOrderPayload = normalizeOrderPayload(payload);
  if (directOrderPayload?.shopOrders?.length) {
    return SellerParcelPaymentReview.listFromOrderPayload(directOrderPayload);
  }

  const nestedOrderPayload = normalizeOrderPayload(
    pickFirstDefined(payload, [["order"], ["updatedOrder"], ["data", "order"], ["data", "updatedOrder"]]),
  );
  if (nestedOrderPayload?.shopOrders?.length) {
    return SellerParcelPaymentReview.listFromOrderPayload(nestedOrderPayload);
  }

  if (looksLikeParcelReviewPayload(payload)) {
    return [SellerParcelPaymentReview.fromJSON(payload)];
  }

  return [];
};

const buildReviewFromDecisionResult = (result, shopOrderKey) => {
  const reviews = extractParcelPaymentReviews(result);
  return (
    reviews.find((item) => item?.getIdentityKey?.() === shopOrderKey) ??
    reviews.find((item) => item?.shopOrderKey === shopOrderKey) ??
    reviews[0] ??
    null
  );
};

export class MyShopService {
  static #instance = null;

  static instance() {
    if (!MyShopService.#instance) MyShopService.#instance = new MyShopService();
    return MyShopService.#instance;
  }

  constructor() {
    this.http = new HttpClient({ baseUrl: import.meta.env.VITE_API_URL ?? "" });
  }

  // โครง backend: GET /api/myshop/me
  async me() {
    const result = await this.http.get("/api/myshop/me");
    const shopPayload = pickFirstDefined(result, [
      ["shop"],
      ["data", "shop"],
      ["data"],
    ]);
    return { shop: shopPayload ? ShopProfile.fromJSON(shopPayload) : null };
  }

  // โครง backend: PUT /api/myshop/me (upsert ลง database)
  async upsert(payload, { avatarFile = null, parcelQrFile = null } = {}) {
    const hasFiles = Boolean(avatarFile || parcelQrFile);
    if (!hasFiles) {
      const result = await this.http.request("/api/myshop/me", {
        method: "PUT",
        body: payload,
      });
      const shopPayload = pickFirstDefined(result, [
        ["shop"],
        ["data", "shop"],
        ["data"],
      ]);
      return { shop: shopPayload ? ShopProfile.fromJSON(shopPayload) : null };
    }

    const formData = new FormData();
    Object.entries(payload ?? {}).forEach(([key, value]) => {
      formData.append(key, value ?? "");
    });

    if (avatarFile) {
      formData.append("avatar", avatarFile);
    }
    if (parcelQrFile) {
      formData.append("parcelQrCode", parcelQrFile);
      formData.append("paymentQrCode", parcelQrFile);
    }

    const result = await this.http.request("/api/myshop/me", {
      method: "PUT",
      body: formData,
    });
    const shopPayload = pickFirstDefined(result, [
      ["shop"],
      ["data", "shop"],
      ["data"],
    ]);
    return { shop: shopPayload ? ShopProfile.fromJSON(shopPayload) : null };
  }

  // โครง backend: GET /api/myshop/products (ดึงสินค้าที่ผู้ใช้ลงขายจาก database)
  async listProducts() {
    const result = await this.http.get("/api/myshop/products");
    const products = pickArray(result, [
      ["products"],
      ["items"],
      ["results"],
      ["data", "products"],
      ["data", "items"],
      ["data", "results"],
    ]).map((item) => ShopProduct.fromJSON(item));
    return { products };
  }

  // โครง backend: GET /api/myshop/parcel-payment-reviews
  async listParcelPaymentReviews() {
    const candidatePaths = [
      "/api/myshop/parcel-payment-reviews",
      "/api/myshop/orders?shippingMethod=parcel",
      "/api/myshop/orders",
      "/api/orders/my-shop?shippingMethod=parcel",
      "/api/orders?sellerView=1&shippingMethod=parcel",
    ];
    let lastError = null;

    for (const path of candidatePaths) {
      try {
        const result = await this.http.get(path);
        return {
          reviews: extractParcelPaymentReviews(result),
        };
      } catch (error) {
        lastError = error;
      }
    }

    if (lastError) throw lastError;
    return { reviews: [] };
  }

  // โครง backend: POST /api/myshop/parcel-payment-reviews/:orderId/shop-orders/:shopOrderKey/decision
  async updateParcelPaymentReviewDecision({ orderId, shopOrderKey, action, note, productIds, changedBy } = {}) {
    const normalizedOrderId = `${orderId ?? ""}`.trim();
    const normalizedShopOrderKey = `${shopOrderKey ?? ""}`.trim();
    const normalizedAction = `${action ?? ""}`.trim();
    const normalizedNote = `${note ?? ""}`.trim();
    const normalizedChangedBy = `${changedBy ?? ""}`.trim();
    const decisionAt = new Date().toISOString();
    const nextOrderStatus =
      normalizedAction === "approve" ? "awaiting_parcel_pickup" : "reported_to_admin";
    const nextParcelPaymentStatus =
      normalizedAction === "approve" ? "approved" : "reported_to_admin";
    const normalizedProductIds = [...new Set(ensureArray(productIds).map((item) => `${item ?? ""}`.trim()).filter(Boolean))];

    if (!normalizedOrderId) throw new Error("ไม่พบ orderId");
    if (!normalizedShopOrderKey) throw new Error("ไม่พบ shopOrderKey");
    if (!normalizedAction) throw new Error("ไม่พบ action สำหรับตรวจสอบการชำระ");

    const syncRequest = normalizedProductIds.length
      ? ProductSaleSyncRequest.fromOrderMutation({
          orderId: normalizedOrderId,
          shopOrderKey: normalizedShopOrderKey,
          productIds: normalizedProductIds,
          orderStatus: nextOrderStatus,
          reason: normalizedNote,
          changedBy: normalizedChangedBy,
          eventAt: decisionAt,
        }).toPayload()
      : null;

    const result = await this.http.post(
      `/api/myshop/parcel-payment-reviews/${encodeURIComponent(normalizedOrderId)}/shop-orders/${encodeURIComponent(normalizedShopOrderKey)}/decision`,
      {
        action: normalizedAction,
        note: normalizedNote,
        reason: normalizedNote,
        decisionAt,
        changedBy: normalizedChangedBy,
        orderStatus: nextOrderStatus,
        shopOrderStatus: nextOrderStatus,
        parcelPaymentStatus: nextParcelPaymentStatus,
        productIds: normalizedProductIds,
        syncRequest,
      },
    );

    return {
      review: buildReviewFromDecisionResult(result, normalizedShopOrderKey),
      message: pickFirstDefined(result, [["message"], ["data", "message"]]) ?? "อัปเดตรายการตรวจสอบการชำระแล้ว",
    };
  }

  // โครง backend: GET /api/products (ดึงสินค้าที่ลงขายทั้งหมดจากผู้ใช้ทุกคน)
  async listMarketplaceProducts() {
    const result = await this.http.get("/api/products");
    const products = Array.isArray(result?.products)
      ? result.products.map((item) => ShopProduct.fromJSON(item))
      : [];
    return { products };
  }

  // โครง backend: GET /api/products/:id (ดึงข้อมูลสินค้าเดี่ยวจาก database)
  async getMarketplaceProductById(productId) {
    const normalizedId = `${productId ?? ""}`.trim();
    if (!normalizedId) return { product: null };

    const result = await this.http.get(`/api/products/${encodeURIComponent(normalizedId)}`);
    return {
      product: result?.product ? ShopProduct.fromJSON(result.product) : null,
    };
  }

  // โครง backend: GET /api/products/search?keyword=... (ค้นหาสินค้าจาก database ด้วยความเหมือนชื่อสินค้า)
  async searchMarketplaceProducts(keyword) {
    const normalizedKeyword = (keyword ?? "").trim();
    const encodedKeyword = encodeURIComponent(normalizedKeyword);
    const searchPath = normalizedKeyword
      ? `/api/products/search?keyword=${encodedKeyword}`
      : "/api/products/search";

    try {
      const result = await this.http.get(searchPath);
      const products = Array.isArray(result?.products)
        ? result.products.map((item) => ShopProduct.fromJSON(item))
        : [];
      return { products };
    } catch (primaryError) {
      // fallback เผื่อ backend ใช้ query เดิม /api/products?keyword=...
      if (!normalizedKeyword) throw primaryError;

      const fallback = await this.http.get(`/api/products?keyword=${encodedKeyword}`);
      const products = Array.isArray(fallback?.products)
        ? fallback.products.map((item) => ShopProduct.fromJSON(item))
        : [];
      return { products };
    }
  }

  // โครง backend: POST /api/myshop/products (สร้างสินค้าใหม่และเก็บลง database)
  async createProduct(payload, imageFiles) {
    const formData = new FormData();

    // payload (รวม category) จะถูกส่งให้ backend เพื่อ persist ลง database
    Object.entries(payload ?? {}).forEach(([key, value]) => {
      formData.append(key, value ?? "");
    });

    const files = Array.isArray(imageFiles)
      ? imageFiles.filter(Boolean)
      : imageFiles
        ? [imageFiles]
        : [];

    files.forEach((file) => {
      formData.append("images", file);
    });
    if (files.length === 1) {
      // เผื่อ backend เดิมที่รองรับ field ชื่อ image แบบไฟล์เดียว
      formData.append("image", files[0]);
    }

    const result = await this.http.request("/api/myshop/products", {
      method: "POST",
      body: formData,
    });

    return {
      product: result?.product ? ShopProduct.fromJSON(result.product) : null,
    };
  }

  // โครง backend: PATCH /api/myshop/products/:productId (แก้ไขสินค้าเดิม)
  async updateProduct(productId, payload, imageFiles) {
    const normalizedId = `${productId ?? ""}`.trim();
    if (!normalizedId) throw new Error("ไม่พบรหัสสินค้าที่ต้องการแก้ไข");

    const formData = new FormData();
    Object.entries(payload ?? {}).forEach(([key, value]) => {
      formData.append(key, value ?? "");
    });

    const files = Array.isArray(imageFiles)
      ? imageFiles.filter(Boolean)
      : imageFiles
        ? [imageFiles]
        : [];

    files.forEach((file) => {
      formData.append("images", file);
    });
    if (files.length === 1) {
      formData.append("image", files[0]);
    }

    const endpoint = `/api/myshop/products/${encodeURIComponent(normalizedId)}`;

    try {
      const result = await this.http.request(endpoint, {
        method: "PATCH",
        body: formData,
      });

      return {
        product: result?.product ? ShopProduct.fromJSON(result.product) : null,
      };
    } catch {
      const fallback = await this.http.request(endpoint, {
        method: "PUT",
        body: formData,
      });

      return {
        product: fallback?.product ? ShopProduct.fromJSON(fallback.product) : null,
      };
    }
  }

  // โครง backend: DELETE /api/myshop/products/:productId (ลบสินค้า)
  async deleteProduct(productId) {
    const normalizedId = `${productId ?? ""}`.trim();
    if (!normalizedId) throw new Error("ไม่พบรหัสสินค้าที่ต้องการลบ");

    await this.http.request(`/api/myshop/products/${encodeURIComponent(normalizedId)}`, {
      method: "DELETE",
    });
    return true;
  }

  // โครง backend: POST /api/chats (สร้างห้องแชทกับร้านค้าและเก็บลง database)
  async startProductChat({ productId, ownerId, message } = {}) {
    const result = await this.http.post("/api/chats", {
      productId,
      ownerId,
      message: (message ?? "").trim(),
    });

    return {
      chatId: result?.chatId ?? result?.chat?.id ?? "",
      chat: result?.chat ?? null,
      message: result?.message ?? "สร้างห้องแชทแล้ว",
    };
  }
}
