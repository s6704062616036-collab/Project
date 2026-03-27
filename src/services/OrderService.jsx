import { HttpClient } from "./HttpClient";
import { MyOrder } from "../models/MyOrder";

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

const looksLikeOrderPayload = (payload) =>
  Boolean(
    payload &&
      typeof payload === "object" &&
      (
        Array.isArray(payload?.shopOrders) ||
        Array.isArray(payload?.sellerOrders) ||
        Array.isArray(payload?.subOrders) ||
        payload?.orderId ||
        payload?.userId ||
        payload?.buyerId ||
        payload?.createdAt ||
        payload?.orderDate
      ),
  );

const extractOrderPayloads = (payload) => {
  if (Array.isArray(payload)) return payload.filter((item) => looksLikeOrderPayload(item));
  if (!payload || typeof payload !== "object") return [];

  const arrayPayload = pickArray(payload, [
    ["orders"],
    ["items"],
    ["results"],
    ["data", "orders"],
    ["data", "items"],
    ["data", "results"],
  ]).filter((item) => looksLikeOrderPayload(item));
  if (arrayPayload.length) return arrayPayload;

  const singleOrderPayload = pickFirstDefined(payload, [
    ["order"],
    ["updatedOrder"],
    ["data", "order"],
    ["data", "updatedOrder"],
  ]);
  if (singleOrderPayload && typeof singleOrderPayload === "object") {
    return [singleOrderPayload];
  }

  if (payload?.id || payload?._id || payload?.orderId || Array.isArray(payload?.shopOrders)) {
    return [payload];
  }

  return [];
};

export class OrderService {
  static #instance = null;

  static instance() {
    if (!OrderService.#instance) OrderService.#instance = new OrderService();
    return OrderService.#instance;
  }

  constructor() {
    this.http = new HttpClient({ baseUrl: import.meta.env.VITE_API_URL ?? "" });
  }

  // โครง backend: GET /api/orders/me (ดึงคำสั่งซื้อของผู้ใช้ปัจจุบันจาก database)
  async listMyOrders() {
    const result = await this.http.get("/api/orders/me");
    const orders = extractOrderPayloads(result).map((item) => MyOrder.fromJSON(item));

    return { orders };
  }

  // โครง backend: POST /api/orders/:orderId/shop-orders/:shopOrderKey/decision
  async updateShopOrderDecision({ orderId, shopOrderKey, action } = {}) {
    const normalizedOrderId = `${orderId ?? ""}`.trim();
    const normalizedShopOrderKey = `${shopOrderKey ?? ""}`.trim();
    const normalizedAction = `${action ?? ""}`.trim();

    if (!normalizedOrderId) throw new Error("ไม่พบ orderId");
    if (!normalizedShopOrderKey) throw new Error("ไม่พบ shopOrderKey");
    if (!normalizedAction) throw new Error("ไม่พบ action สำหรับคำสั่งซื้อ");

    const result = await this.http.post(
      `/api/orders/${encodeURIComponent(normalizedOrderId)}/shop-orders/${encodeURIComponent(normalizedShopOrderKey)}/decision`,
      { action: normalizedAction },
    );
    const orderPayload = pickFirstDefined(result, [
      ["order"],
      ["updatedOrder"],
      ["data", "order"],
      ["data", "updatedOrder"],
    ]);

    return {
      order: orderPayload ? MyOrder.fromJSON(orderPayload) : null,
      message: pickFirstDefined(result, [["message"], ["data", "message"]]) ?? "อัปเดตสถานะคำสั่งซื้อแล้ว",
    };
  }
}
