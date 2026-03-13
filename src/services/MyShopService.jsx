import { HttpClient } from "./HttpClient";
import { ShopProfile } from "../models/ShopProfile";
import { ShopProduct } from "../models/ShopProduct";

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
    return { shop: result?.shop ? ShopProfile.fromJSON(result.shop) : null };
  }

  // โครง backend: PUT /api/myshop/me (upsert ลง database)
  async upsert(payload) {
    const result = await this.http.request("/api/myshop/me", {
      method: "PUT",
      body: payload,
    });
    return { shop: result?.shop ? ShopProfile.fromJSON(result.shop) : null };
  }

  // โครง backend: GET /api/myshop/products (ดึงสินค้าที่ผู้ใช้ลงขายจาก database)
  async listProducts() {
    const result = await this.http.get("/api/myshop/products");
    const products = Array.isArray(result?.products)
      ? result.products.map((item) => ShopProduct.fromJSON(item))
      : [];
    return { products };
  }

  // โครง backend: GET /api/products (ดึงสินค้าที่ลงขายทั้งหมดจากผู้ใช้ทุกคน)
  async listMarketplaceProducts() {
    const result = await this.http.get("/api/products");
    const products = Array.isArray(result?.products)
      ? result.products.map((item) => ShopProduct.fromJSON(item))
      : [];
    return { products };
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
}
