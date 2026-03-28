import { ShopProfile } from "./ShopProfile";
import { ShopProduct } from "./ShopProduct";

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

export class SellerStorefront {
  constructor({ shop, products } = {}) {
    this.shop =
      shop instanceof ShopProfile ? shop : shop ? ShopProfile.fromJSON(shop) : ShopProfile.empty();
    this.products = ensureArray(products).map((product) =>
      product instanceof ShopProduct ? product : ShopProduct.fromJSON(product),
    );
  }

  static fromJSON(json) {
    const source = json && typeof json === "object" ? json : {};
    return new SellerStorefront({
      shop:
        pickFirstDefined(source, [
          ["shop"],
          ["shopProfile"],
          ["seller"],
          ["storefront", "shop"],
          ["data", "shop"],
          ["data", "shopProfile"],
          ["result", "shop"],
        ]) ?? {},
      products:
        pickFirstDefined(source, [
          ["products"],
          ["items"],
          ["storefront", "products"],
          ["data", "products"],
          ["data", "items"],
          ["result", "products"],
        ]) ?? [],
    });
  }

  static empty(ownerId = "") {
    return new SellerStorefront({
      shop: ShopProfile.fromJSON({ ownerId }),
      products: [],
    });
  }

  hasShop() {
    return Boolean(`${this.shop?.ownerId ?? ""}`.trim() || `${this.shop?.shopName ?? ""}`.trim());
  }

  getProducts() {
    return Array.isArray(this.products) ? this.products : [];
  }
}
