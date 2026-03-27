import { HttpClient } from "./HttpClient";
import { ShopProduct } from "../models/ShopProduct";
import { ProductSaleSyncRequest } from "../models/ProductSaleSyncRequest";

export class ProductInventoryService {
  static #instance = null;

  static instance() {
    if (!ProductInventoryService.#instance) {
      ProductInventoryService.#instance = new ProductInventoryService();
    }
    return ProductInventoryService.#instance;
  }

  constructor() {
    this.http = new HttpClient({ baseUrl: import.meta.env.VITE_API_URL ?? "" });
  }

  buildSyncRequest(requestInput = {}) {
    return requestInput instanceof ProductSaleSyncRequest
      ? requestInput
      : ProductSaleSyncRequest.fromJSON(requestInput);
  }

  // โครง backend: POST /api/products/sale-status/sync
  // backend ควรใช้ endpoint นี้ใน transaction เดียวกับการอัปเดต order/shopOrder เพื่อ sync saleStatus ลง database จริง
  async syncSaleStatus(requestInput = {}) {
    const request = this.buildSyncRequest(requestInput);
    request.validate();

    const result = await this.http.post("/api/products/sale-status/sync", request.toPayload());
    const products = Array.isArray(result?.products)
      ? result.products.map((item) => ShopProduct.fromJSON(item))
      : [];

    return {
      products,
      message: result?.message ?? "sync สถานะสินค้าแล้ว",
    };
  }
}
