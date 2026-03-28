import { HttpClient } from "./HttpClient";
import { ProductCategory } from "../models/ProductCategory";

const ensureArray = (value) => (Array.isArray(value) ? value : []);

export class CategoryService {
  static #instance = null;

  static instance() {
    if (!CategoryService.#instance) CategoryService.#instance = new CategoryService();
    return CategoryService.#instance;
  }

  constructor() {
    this.http = new HttpClient({ baseUrl: import.meta.env.VITE_API_URL ?? "" });
  }

  async listCategories() {
    const result = await this.http.get("/api/categories");
    const categories = ensureArray(result?.categories).map((item) =>
      typeof item === "string" ? item : item?.name,
    ).filter(Boolean);

    ProductCategory.setAvailableCategories(categories);
    return { categories: ProductCategory.list() };
  }
}
