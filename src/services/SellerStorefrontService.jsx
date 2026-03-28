import { HttpClient } from "./HttpClient";
import { SellerStorefront } from "../models/SellerStorefront";

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

const extractMessage = (payload, fallbackMessage) =>
  pickFirstDefined(payload, [
    ["message"],
    ["data", "message"],
    ["meta", "message"],
    ["result", "message"],
  ]) ?? fallbackMessage;

const extractStorefrontPayload = (payload) =>
  pickFirstDefined(payload, [
    ["storefront"],
    ["data", "storefront"],
    ["result", "storefront"],
  ]) ?? payload;

export class SellerStorefrontService {
  static #instance = null;

  static instance() {
    if (!SellerStorefrontService.#instance) {
      SellerStorefrontService.#instance = new SellerStorefrontService();
    }
    return SellerStorefrontService.#instance;
  }

  constructor() {
    this.http = new HttpClient({ baseUrl: import.meta.env.VITE_API_URL ?? "" });
  }

  // โครง backend: GET /api/shops/owner/:ownerId/storefront
  async getStorefrontByOwnerId(ownerId) {
    const normalizedOwnerId = `${ownerId ?? ""}`.trim();
    if (!normalizedOwnerId) {
      return {
        storefront: SellerStorefront.empty(),
        message: "",
      };
    }

    const candidatePaths = [
      `/api/shops/owner/${encodeURIComponent(normalizedOwnerId)}/storefront`,
      `/api/sellers/${encodeURIComponent(normalizedOwnerId)}/storefront`,
    ];
    let lastError = null;

    for (const path of candidatePaths) {
      try {
        const result = await this.http.get(path);
        return {
          storefront: SellerStorefront.fromJSON(extractStorefrontPayload(result)),
          message: extractMessage(result, "โหลดหน้าร้านสำเร็จ"),
        };
      } catch (error) {
        lastError = error;
      }
    }

    if (lastError) throw lastError;

    return {
      storefront: SellerStorefront.empty(normalizedOwnerId),
      message: "",
    };
  }
}
