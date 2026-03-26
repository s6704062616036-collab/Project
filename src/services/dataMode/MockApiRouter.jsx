import { MockDatabaseStore } from "./MockDatabaseStore";

const MOCK_BASE_URL = "https://mock.local";

export class MockApiRouter {
  static #instance = null;

  static instance() {
    if (!MockApiRouter.#instance) MockApiRouter.#instance = new MockApiRouter();
    return MockApiRouter.#instance;
  }

  constructor() {
    this.store = MockDatabaseStore.instance();
  }

  async request(path, { method = "GET", body } = {}) {
    const normalizedMethod = `${method ?? "GET"}`.toUpperCase();
    const url = new URL(path, MOCK_BASE_URL);
    const pathname = url.pathname;

    // ---------- Auth ----------
    if (normalizedMethod === "POST" && pathname === "/api/auth/login") {
      return this.store.login(body);
    }
    if (normalizedMethod === "POST" && pathname === "/api/auth/register") {
      return this.store.registerForm(body);
    }
    if (normalizedMethod === "GET" && pathname === "/api/auth/me") {
      return this.store.authMe();
    }
    if (normalizedMethod === "POST" && pathname === "/api/auth/logout") {
      return this.store.logout();
    }

    // ---------- User ----------
    if (normalizedMethod === "GET" && pathname === "/api/users/me") {
      return this.store.userMe();
    }
    if (normalizedMethod === "PATCH" && pathname === "/api/users/me") {
      return this.store.updateUserMe(body);
    }

    // ---------- Shop ----------
    if (normalizedMethod === "GET" && pathname === "/api/myshop/me") {
      return this.store.myShopMe();
    }
    if (normalizedMethod === "PUT" && pathname === "/api/myshop/me") {
      return this.store.upsertMyShop(body);
    }
    if (normalizedMethod === "GET" && pathname === "/api/myshop/products") {
      return this.store.listMyProducts();
    }
    if (normalizedMethod === "POST" && pathname === "/api/myshop/products") {
      return this.store.createProduct(body);
    }

    // ---------- Products ----------
    if (normalizedMethod === "GET" && pathname === "/api/products/search") {
      const keyword = url.searchParams.get("keyword") ?? "";
      return this.store.searchMarketplaceProducts(keyword);
    }
    if (normalizedMethod === "GET" && pathname === "/api/products") {
      const keyword = url.searchParams.get("keyword");
      if (keyword != null) return this.store.searchMarketplaceProducts(keyword);
      return this.store.listMarketplaceProducts();
    }
    if (normalizedMethod === "GET" && pathname.startsWith("/api/products/")) {
      const rawId = pathname.slice("/api/products/".length);
      return this.store.getMarketplaceProductById(decodeURIComponent(rawId));
    }

    // ---------- Cart ----------
    if (normalizedMethod === "GET" && pathname === "/api/cart") {
      return this.store.listCart();
    }
    if (normalizedMethod === "POST" && pathname === "/api/cart/items") {
      return this.store.addCartItem(body);
    }
    if (normalizedMethod === "DELETE" && pathname.startsWith("/api/cart/items/product/")) {
      const rawProductId = pathname.slice("/api/cart/items/product/".length);
      return this.store.removeCartItem({ productId: decodeURIComponent(rawProductId) });
    }
    if (normalizedMethod === "DELETE" && pathname.startsWith("/api/cart/items/")) {
      const rawItemId = pathname.slice("/api/cart/items/".length);
      return this.store.removeCartItem({ itemId: decodeURIComponent(rawItemId) });
    }
    if (normalizedMethod === "POST" && pathname === "/api/cart/checkout") {
      return this.store.checkout(body);
    }

    // ---------- Chat ----------
    if (normalizedMethod === "POST" && pathname === "/api/chats") {
      return this.store.startProductChat(body);
    }

    throw new Error(`Mock API ยังไม่รองรับ ${normalizedMethod} ${pathname}`);
  }
}
