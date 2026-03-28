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

    // ---------- Public categories ----------
    if (normalizedMethod === "GET" && pathname === "/api/categories") {
      return this.store.listPublicCategories();
    }

    // ---------- Public reports ----------
    if (normalizedMethod === "POST" && pathname.startsWith("/api/reports/products/")) {
      const rawProductId = pathname.slice("/api/reports/products/".length);
      return this.store.createProductReport(decodeURIComponent(rawProductId), body);
    }
    if (
      normalizedMethod === "POST" &&
      pathname.startsWith("/api/reports/shops/owner/")
    ) {
      const rawOwnerId = pathname.slice("/api/reports/shops/owner/".length);
      return this.store.createShopReport(decodeURIComponent(rawOwnerId), body);
    }

    // ---------- Admin ----------
    if (normalizedMethod === "GET" && pathname === "/api/admin/dashboard") {
      return this.store.adminDashboard();
    }
    if (normalizedMethod === "GET" && pathname === "/api/admin/members") {
      return this.store.listAdminMembers();
    }
    if (
      normalizedMethod === "POST" &&
      pathname.startsWith("/api/admin/members/") &&
      pathname.endsWith("/decision")
    ) {
      const rawMemberId = pathname.slice("/api/admin/members/".length, -"/decision".length);
      return this.store.updateAdminMemberDecision(decodeURIComponent(rawMemberId), body);
    }
    if (normalizedMethod === "GET" && pathname === "/api/admin/reports") {
      return this.store.listAdminProductReports();
    }
    if (
      normalizedMethod === "POST" &&
      pathname.startsWith("/api/admin/reports/") &&
      pathname.endsWith("/decision")
    ) {
      const rawReportId = pathname.slice("/api/admin/reports/".length, -"/decision".length);
      return this.store.updateAdminProductReportDecision(decodeURIComponent(rawReportId), body);
    }
    if (normalizedMethod === "GET" && pathname === "/api/admin/categories") {
      return this.store.listAdminCategories();
    }
    if (normalizedMethod === "POST" && pathname === "/api/admin/categories") {
      return this.store.createAdminCategory(body);
    }
    if (
      (normalizedMethod === "PATCH" || normalizedMethod === "PUT") &&
      pathname.startsWith("/api/admin/categories/")
    ) {
      const rawCategoryId = pathname.slice("/api/admin/categories/".length);
      return this.store.updateAdminCategory(decodeURIComponent(rawCategoryId), body);
    }
    if (normalizedMethod === "DELETE" && pathname.startsWith("/api/admin/categories/")) {
      const rawCategoryId = pathname.slice("/api/admin/categories/".length);
      return this.store.deleteAdminCategory(decodeURIComponent(rawCategoryId));
    }

    // ---------- User ----------
    if (normalizedMethod === "GET" && pathname === "/api/users/me") {
      return this.store.userMe();
    }
    if (normalizedMethod === "PATCH" && pathname === "/api/users/me") {
      return this.store.updateUserMe(body);
    }
    if (normalizedMethod === "DELETE" && pathname === "/api/users/me") {
      return this.store.deleteUserMe();
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
    if (normalizedMethod === "GET" && pathname === "/api/myshop/parcel-payment-reviews") {
      return this.store.listMyParcelPaymentReviews();
    }
    if (
      normalizedMethod === "POST" &&
      pathname.startsWith("/api/myshop/parcel-payment-reviews/") &&
      pathname.includes("/shop-orders/") &&
      pathname.endsWith("/decision")
    ) {
      const rawPath = pathname.slice("/api/myshop/parcel-payment-reviews/".length, -"/decision".length);
      const [rawOrderId, rawShopOrdersSegment, rawShopOrderKey] = rawPath.split("/");
      if (rawShopOrdersSegment !== "shop-orders") {
        throw new Error(`Mock API ยังไม่รองรับ ${normalizedMethod} ${pathname}`);
      }
      return this.store.updateMyShopParcelPaymentReviewDecision(
        decodeURIComponent(rawOrderId),
        decodeURIComponent(rawShopOrderKey),
        body,
      );
    }
    if (normalizedMethod === "POST" && pathname === "/api/myshop/products") {
      return this.store.createProduct(body);
    }
    if (
      (normalizedMethod === "PATCH" || normalizedMethod === "PUT") &&
      pathname.startsWith("/api/myshop/products/")
    ) {
      const rawProductId = pathname.slice("/api/myshop/products/".length);
      return this.store.updateMyProduct(decodeURIComponent(rawProductId), body);
    }
    if (normalizedMethod === "DELETE" && pathname.startsWith("/api/myshop/products/")) {
      const rawProductId = pathname.slice("/api/myshop/products/".length);
      return this.store.deleteMyProduct(decodeURIComponent(rawProductId));
    }

    // ---------- Public shops ----------
    if (
      normalizedMethod === "GET" &&
      pathname.startsWith("/api/shops/owner/") &&
      pathname.endsWith("/storefront")
    ) {
      const rawOwnerId = pathname.slice("/api/shops/owner/".length, -"/storefront".length);
      return this.store.getSellerStorefrontByOwnerId(decodeURIComponent(rawOwnerId));
    }
    if (
      normalizedMethod === "GET" &&
      pathname.startsWith("/api/sellers/") &&
      pathname.endsWith("/storefront")
    ) {
      const rawOwnerId = pathname.slice("/api/sellers/".length, -"/storefront".length);
      return this.store.getSellerStorefrontByOwnerId(decodeURIComponent(rawOwnerId));
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
    if (normalizedMethod === "POST" && pathname === "/api/products/sale-status/sync") {
      return this.store.syncProductSaleStatuses(body);
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

    // ---------- Orders ----------
    if (normalizedMethod === "GET" && pathname === "/api/orders/me") {
      return this.store.listMyOrders();
    }
    if (
      normalizedMethod === "POST" &&
      pathname.startsWith("/api/orders/") &&
      pathname.includes("/shop-orders/") &&
      pathname.endsWith("/decision")
    ) {
      const rawPath = pathname.slice("/api/orders/".length, -"/decision".length);
      const [rawOrderId, rawShopOrdersSegment, rawShopOrderKey] = rawPath.split("/");
      if (rawShopOrdersSegment !== "shop-orders") {
        throw new Error(`Mock API ยังไม่รองรับ ${normalizedMethod} ${pathname}`);
      }
      return this.store.updateMyOrderShopDecision(
        decodeURIComponent(rawOrderId),
        decodeURIComponent(rawShopOrderKey),
        body,
      );
    }

    // ---------- Chat ----------
    if (normalizedMethod === "GET" && pathname === "/api/chats") {
      return this.store.listMyChats();
    }
    if (normalizedMethod === "POST" && pathname === "/api/chats") {
      return this.store.startProductChat(body);
    }
    if (
      normalizedMethod === "POST" &&
      pathname.startsWith("/api/chats/") &&
      pathname.includes("/meetup-proposals/") &&
      pathname.endsWith("/respond")
    ) {
      const rawPath = pathname.slice("/api/chats/".length, -"/respond".length);
      const [rawChatId, rawMessageSegment, rawMessageId] = rawPath.split("/");
      if (rawMessageSegment !== "meetup-proposals") {
        throw new Error(`Mock API ยังไม่รองรับ ${normalizedMethod} ${pathname}`);
      }
      return this.store.respondMeetupProposal(
        decodeURIComponent(rawChatId),
        decodeURIComponent(rawMessageId),
        body,
      );
    }
    if (pathname.startsWith("/api/chats/") && pathname.endsWith("/messages")) {
      const rawChatId = pathname.slice("/api/chats/".length, -"/messages".length);
      const chatId = decodeURIComponent(rawChatId);
      if (normalizedMethod === "GET") {
        return this.store.listChatMessages(chatId);
      }
      if (normalizedMethod === "POST") {
        return this.store.sendChatMessage(chatId, body);
      }
    }

    throw new Error(`Mock API ยังไม่รองรับ ${normalizedMethod} ${pathname}`);
  }
}
