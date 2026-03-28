import { HttpClient } from "./HttpClient";

const pickMessage = (payload, fallbackMessage) =>
  payload?.message ??
  payload?.data?.message ??
  payload?.result?.message ??
  fallbackMessage;

export class ContentReportService {
  static #instance = null;

  static instance() {
    if (!ContentReportService.#instance) {
      ContentReportService.#instance = new ContentReportService();
    }
    return ContentReportService.#instance;
  }

  constructor() {
    this.http = new HttpClient({ baseUrl: import.meta.env.VITE_API_URL ?? "" });
  }

  // โครง backend: POST /api/reports/products/:productId
  async submitProductReport({ productId, reason } = {}) {
    const normalizedProductId = `${productId ?? ""}`.trim();
    if (!normalizedProductId) throw new Error("ไม่พบสินค้าที่ต้องการรายงาน");

    const result = await this.http.post(
      `/api/reports/products/${encodeURIComponent(normalizedProductId)}`,
      {
        reason: `${reason ?? ""}`.trim(),
        submittedAt: new Date().toISOString(),
        reportType: "product",
        source: "product_detail_page",
      },
    );

    return {
      report: result?.report ?? null,
      message: pickMessage(result, "ส่งรายงานสินค้าไปให้ผู้ดูแลระบบแล้ว"),
    };
  }

  // โครง backend: POST /api/reports/shops/owner/:ownerId
  async submitShopReport({ ownerId, reason } = {}) {
    const normalizedOwnerId = `${ownerId ?? ""}`.trim();
    if (!normalizedOwnerId) throw new Error("ไม่พบร้านค้าที่ต้องการรายงาน");

    const result = await this.http.post(
      `/api/reports/shops/owner/${encodeURIComponent(normalizedOwnerId)}`,
      {
        reason: `${reason ?? ""}`.trim(),
        submittedAt: new Date().toISOString(),
        reportType: "shop",
        source: "seller_storefront_page",
      },
    );

    return {
      report: result?.report ?? null,
      message: pickMessage(result, "ส่งรายงานร้านค้าไปให้ผู้ดูแลระบบแล้ว"),
    };
  }
}
