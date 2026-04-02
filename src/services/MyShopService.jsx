import { HttpClient } from "./HttpClient";
import { ShopProfile } from "../models/ShopProfile";
import { ShopProduct } from "../models/ShopProduct";
import { SellerParcelPaymentReview } from "../models/SellerParcelPaymentReview";
import { ProductSaleSyncRequest } from "../models/ProductSaleSyncRequest";
import { User } from "../models/User";

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

const extractShopPayload = (payload) =>
  pickFirstDefined(payload, [
    ["shop"],
    ["shopProfile"],
    ["merchant"],
    ["data", "shop"],
    ["data", "shopProfile"],
    ["data", "merchant"],
    ["result", "shop"],
    ["result", "shopProfile"],
    ["result", "merchant"],
    ["data"],
  ]);

const extractMessage = (payload, fallbackMessage) =>
  pickFirstDefined(payload, [
    ["message"],
    ["data", "message"],
    ["meta", "message"],
    ["result", "message"],
  ]) ?? fallbackMessage;

const extractUserPayload = (payload) =>
  pickFirstDefined(payload, [
    ["user"],
    ["data", "user"],
    ["result", "user"],
  ]);

const buildShopUpsertPayload = (payload = {}, kycContext = {}) => {
  const directSave = Boolean(kycContext?.directSave);
  const citizenId = `${payload?.citizenId ?? ""}`.trim();

  return {
    ...(payload ?? {}),
    kycCitizenId: citizenId,
    submissionAction: directSave ? "save_shop_profile" : "submit_kyc_review",
    requiresKycReview: !directSave,
    kycSubmissionType: `${kycContext?.submissionType ?? (directSave ? "profile_update" : "initial_kyc")}`.trim(),
    hasApprovedKycHistory: Boolean(kycContext?.hasApprovedKycHistory),
    hasPendingSubmission: Boolean(kycContext?.hasPendingSubmission),
    citizenIdLocked: Boolean(kycContext?.citizenIdLocked),
    qrCodeChanged: Boolean(kycContext?.qrCodeChanged),
    submissionChannel: "my_shop_page",
    kycFlowVersion: "shop-kyc-v1",
  };
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
        payload?.paymentMethod ||
        payload?.parcelPayment?.paymentMethod ||
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
    const shopPayload = extractShopPayload(result);
    return { shop: shopPayload ? ShopProfile.fromJSON(shopPayload) : null };
  }

  // โครง backend: PUT /api/myshop/me (upsert ลง database)
  async upsert(payload, { avatarFile = null, parcelQrFile = null, kycContext = {} } = {}) {
    const requestBody = buildShopUpsertPayload(payload, kycContext);
    const hasFiles = Boolean(avatarFile || parcelQrFile);
    if (!hasFiles) {
      const result = await this.http.request("/api/myshop/me", {
        method: "PUT",
        body: requestBody,
      });
      const shopPayload = extractShopPayload(result);
      const userPayload = extractUserPayload(result);
      return {
        shop: shopPayload ? ShopProfile.fromJSON(shopPayload) : null,
        user: userPayload ? User.fromJSON(userPayload) : null,
        message: extractMessage(result, "อัปเดตข้อมูลร้านแล้ว"),
      };
    }

    const formData = new FormData();
    Object.entries(requestBody).forEach(([key, value]) => {
      formData.append(key, typeof value === "boolean" ? `${value}` : (value ?? ""));
    });

    if (avatarFile) {
      formData.append("avatar", avatarFile);
    }
    if (parcelQrFile) {
      formData.append("parcelQrCode", parcelQrFile);
    }

    const result = await this.http.request("/api/myshop/me", {
      method: "PUT",
      body: formData,
    });
    const shopPayload = extractShopPayload(result);
    const userPayload = extractUserPayload(result);
    return {
      shop: shopPayload ? ShopProfile.fromJSON(shopPayload) : null,
      user: userPayload ? User.fromJSON(userPayload) : null,
      message: extractMessage(result, "อัปเดตข้อมูลร้านแล้ว"),
    };
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

  // โครง backend:
  // - POST /api/myshop/parcel-payment-reviews/:orderId/shop-orders/:shopOrderKey/decision
  // - fallback: POST /api/myshop/orders/:orderId/shop-orders/:shopOrderKey/decision
  // - fallback: POST /api/orders/:orderId/shop-orders/:shopOrderKey/decision?sellerView=1
  async updateParcelPaymentReviewDecision({ orderId, shopOrderKey, action, note, productIds, changedBy } = {}) {
    const normalizedOrderId = `${orderId ?? ""}`.trim();
    const normalizedShopOrderKey = `${shopOrderKey ?? ""}`.trim();
    const normalizedAction = `${action ?? ""}`.trim();
    const normalizedNote = `${note ?? ""}`.trim();
    const normalizedChangedBy = `${changedBy ?? ""}`.trim();
    const decisionAt = new Date().toISOString();
    let nextOrderStatus = "";
    let nextParcelPaymentStatus = "";
    const normalizedProductIds = [...new Set(ensureArray(productIds).map((item) => `${item ?? ""}`.trim()).filter(Boolean))];

    if (!normalizedOrderId) throw new Error("ไม่พบ orderId");
    if (!normalizedShopOrderKey) throw new Error("ไม่พบ shopOrderKey");
    if (!normalizedAction) throw new Error("ไม่พบ action สำหรับตรวจสอบการชำระ");
    if (normalizedAction === "approve") {
      nextOrderStatus = "awaiting_parcel_pickup";
      nextParcelPaymentStatus = "approved";
    } else if (normalizedAction === "cancel") {
      nextOrderStatus = "cancelled";
      nextParcelPaymentStatus = "cancelled";
    } else if (normalizedAction === "report") {
      nextOrderStatus = "reported_to_admin";
      nextParcelPaymentStatus = "reported_to_admin";
    } else {
      throw new Error("ไม่พบ action สำหรับตรวจสอบการชำระ");
    }

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

    const requestBody = {
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
    };
    const candidatePaths = [
      `/api/myshop/parcel-payment-reviews/${encodeURIComponent(normalizedOrderId)}/shop-orders/${encodeURIComponent(normalizedShopOrderKey)}/decision`,
      `/api/myshop/orders/${encodeURIComponent(normalizedOrderId)}/shop-orders/${encodeURIComponent(normalizedShopOrderKey)}/decision`,
      `/api/orders/${encodeURIComponent(normalizedOrderId)}/shop-orders/${encodeURIComponent(normalizedShopOrderKey)}/decision?sellerView=1`,
    ];
    let lastError = null;
    let result = null;

    for (const path of candidatePaths) {
      try {
        result = await this.http.post(path, requestBody);
        lastError = null;
        break;
      } catch (error) {
        lastError = error;
      }
    }

    if (lastError) throw lastError;

    return {
      review: buildReviewFromDecisionResult(result, normalizedShopOrderKey),
      message: pickFirstDefined(result, [["message"], ["data", "message"]]) ?? "อัปเดตรายการตรวจสอบการชำระแล้ว",
    };
  }

  // โครง backend: GET /api/products (ดึงสินค้าที่ลงขายทั้งหมดจากผู้ใช้ทุกคน)
  async updateParcelShipment({ orderId, shopOrderKey, action, trackingNumber, carrier, note } = {}) {
    const normalizedOrderId = `${orderId ?? ""}`.trim();
    const normalizedShopOrderKey = `${shopOrderKey ?? ""}`.trim();
    const normalizedAction = `${action ?? ""}`.trim();

    if (!normalizedOrderId) throw new Error("ไม่พบ orderId");
    if (!normalizedShopOrderKey) throw new Error("ไม่พบ shopOrderKey");
    if (!normalizedAction) throw new Error("ไม่พบ action สำหรับการจัดส่ง");

    const result = await this.http.post(
      `/api/myshop/parcel-payment-reviews/${encodeURIComponent(normalizedOrderId)}/shop-orders/${encodeURIComponent(normalizedShopOrderKey)}/shipment`,
      {
        action: normalizedAction,
        trackingNumber: `${trackingNumber ?? ""}`.trim(),
        carrier: `${carrier ?? ""}`.trim(),
        note: `${note ?? ""}`.trim(),
      },
    );

    return {
      review: buildReviewFromDecisionResult(result, normalizedShopOrderKey),
      message: pickFirstDefined(result, [["message"], ["data", "message"]]) ?? "อัปเดตสถานะจัดส่งแล้ว",
    };
  }

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

    const files = (Array.isArray(imageFiles)
      ? imageFiles.filter(Boolean)
      : imageFiles
        ? [imageFiles]
        : []).slice(0, 4);

    files.forEach((file) => {
      formData.append("images", file);
    });
    if (files.length === 1) {
      // เผื่อ backend เดิมที่รองรับ field ชื่อ image แบบไฟล์เดียว
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

    const files = (Array.isArray(imageFiles)
      ? imageFiles.filter(Boolean)
      : imageFiles
        ? [imageFiles]
        : []).slice(0, 4);

    files.forEach((file) => {
      formData.append("images", file);
    });
    if (files.length === 1) {
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
