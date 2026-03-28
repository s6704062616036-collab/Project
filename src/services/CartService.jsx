import { HttpClient } from "./HttpClient";
import { CartItem } from "../models/CartItem";

export class CartService {
  static #instance = null;

  static instance() {
    if (!CartService.#instance) CartService.#instance = new CartService();
    return CartService.#instance;
  }

  constructor() {
    this.http = new HttpClient({ baseUrl: import.meta.env.VITE_API_URL ?? "" });
  }

  buildCheckoutRequestBody(payload = {}) {
    const shopOrders = Array.isArray(payload?.shopOrders) ? payload.shopOrders : [];
    const normalizedShopOrders = shopOrders.map((shopOrder) => {
      const { receiptFile, ...rest } = shopOrder ?? {};
      return rest;
    });
    const hasReceiptFiles = shopOrders.some((shopOrder) => Boolean(shopOrder?.receiptFile));

    if (!hasReceiptFiles) {
      return {
        ...(payload ?? {}),
        shopOrders: normalizedShopOrders,
      };
    }

    const formData = new FormData();
    const serializedShopOrders = shopOrders.map((shopOrder, index) => {
      const { receiptFile, ...rest } = shopOrder ?? {};
      const receiptFileKey = receiptFile ? `receiptFile_${index}` : "";

      if (receiptFile && receiptFileKey) {
        formData.append(receiptFileKey, receiptFile);
      }

      return receiptFileKey
        ? {
            ...rest,
            receiptFileKey,
          }
        : rest;
    });

    formData.append("shopOrders", JSON.stringify(serializedShopOrders));
    if (payload?.notes != null) {
      formData.append("notes", `${payload.notes ?? ""}`);
    }

    return formData;
  }

  // โครง backend: GET /api/cart (ดึงตะกร้าจาก database ของผู้ใช้ปัจจุบัน)
  async listMyCart() {
    const result = await this.http.get("/api/cart");
    const items = Array.isArray(result?.items)
      ? result.items.map((item) => CartItem.fromJSON(item))
      : [];

    return {
      cartId: result?.cartId ?? result?.id ?? "",
      items,
      totalItems: result?.totalItems ?? items.reduce((sum, item) => sum + (item.quantity ?? 0), 0),
      totalPrice: result?.totalPrice ?? items.reduce((sum, item) => sum + item.getLineTotalNumber(), 0),
    };
  }

  // โครง backend: POST /api/cart/items (เพิ่มสินค้าเข้าตะกร้าและเก็บลง database)
  async addItem({ productId, quantity = 1 } = {}) {
    const result = await this.http.post("/api/cart/items", {
      productId,
      quantity,
    });
    return {
      item: result?.item ? CartItem.fromJSON(result.item) : null,
      cartId: result?.cartId ?? "",
    };
  }

  // โครง backend: DELETE /api/cart/items/:itemId (ลบสินค้าออกจากตะกร้าใน database)
  async removeItem({ itemId, productId } = {}) {
    if (itemId) {
      await this.http.request(`/api/cart/items/${itemId}`, { method: "DELETE" });
      return true;
    }

    if (productId) {
      await this.http.request(`/api/cart/items/product/${productId}`, { method: "DELETE" });
      return true;
    }

    throw new Error("ไม่พบ itemId หรือ productId สำหรับลบสินค้าออกจากตะกร้า");
  }

  // โครง backend: POST /api/cart/checkout (สร้างคำสั่งซื้อและ persist ลง database)
  async checkout(payload = {}) {
    const requestBody = this.buildCheckoutRequestBody(payload);
    const result = await this.http.post("/api/cart/checkout", requestBody);
    return {
      orderId: result?.orderId ?? result?.order?.id ?? "",
      message: result?.message ?? "สร้างคำสั่งซื้อแล้ว",
    };
  }
}
