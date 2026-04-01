import React from "react";
import { LoginPage } from "../pages/LoginPage";
import { RegisterPage } from "../pages/RegisterPage";
import { HomePage } from "../pages/HomePage";
import { MyShopPage } from "../pages/MyShopPage";
import { ProductDetailPage } from "../pages/ProductDetailPage";
import { SearchProductsPage } from "../pages/SearchProductsPage";
import { ChatPage } from "../pages/ChatPage";
import { MyOrdersPage } from "../pages/MyOrdersPage";
import { AdminPage } from "../pages/AdminPage";
import { SellerStorefrontPage } from "../pages/SellerStorefrontPage";
import { PublicUserProfilePage } from "../pages/PublicUserProfilePage";
import { NotificationsPage } from "../pages/NotificationsPage";
import { AuthService } from "../services/AuthService";
import { ChatService } from "../services/ChatService";
import { NotificationService } from "../services/NotificationService";
import { RealtimeSyncManager } from "../utils/RealtimeSyncManager";
import { DataModeSwitchWidget } from "./DataModeSwitchWidget";

const ADMIN_CONTACT_EMAIL = "s6704062616045@email.kmutnb.ac.th";
const ADMIN_CONTACT_PHONE = "0822062469";

export default class App extends React.Component {
  state = {
    route: "login",
    user: null,
    selectedProduct: null,
    selectedSellerOwnerId: "",
    selectedPublicUserId: "",
    searchKeyword: "",
    selectedChatId: "",
    selectedAdminSection: "",
    selectedAdminMemberId: "",
    selectedAdminShopId: "",
    chatUnreadCount: 0,
    notificationUnreadCount: 0,
    booting: true,
  };

  auth = AuthService.instance();
  chatService = ChatService.instance();
  notificationService = NotificationService.instance();
  chatUnreadSync = new RealtimeSyncManager({
    onRefresh: () => this.refreshChatUnreadCount(),
    databasePollIntervalMs: 4000,
  });
  notificationSync = new RealtimeSyncManager({
    onRefresh: () => this.refreshNotificationUnreadCount(),
    databasePollIntervalMs: 5000,
  });
  appRoutes = new Set(["login", "register", "home", "myshop", "product", "seller", "profile", "search", "chat", "orders", "admin", "notifications"]);
  chatUnreadRefreshInFlight = false;
  pendingChatUnreadRefresh = false;
  notificationUnreadRefreshInFlight = false;
  pendingNotificationUnreadRefresh = false;

  async componentDidMount() {
    if (typeof window !== "undefined") {
      window.addEventListener("popstate", this.onPopState);
    }

    let nextUser = this.state.user;
    let nextRoute = this.state.route;

    try {
      const me = await this.auth.me?.();
      if (me?.user) {
        nextUser = me.user;
        nextRoute = me.user?.isAdmin?.() ? "admin" : "home";
      }
    } catch {
      // ignore
    } finally {
      this.setState(
        {
          user: nextUser,
          route: nextRoute,
          booting: false,
        },
        () => {
          this.syncHistoryEntry({ replace: true });
        },
      );
    }
  }

  componentWillUnmount() {
    if (typeof window !== "undefined") {
      window.removeEventListener("popstate", this.onPopState);
    }
    this.chatUnreadSync.stop();
    this.notificationSync.stop();
  }

  componentDidUpdate(prevProps, prevState) {
    const previousUserId = `${prevState.user?.id ?? ""}`.trim();
    const nextUserId = `${this.state.user?.id ?? ""}`.trim();

    if (previousUserId !== nextUserId) {
      if (nextUserId) {
        this.refreshChatUnreadCount();
        this.refreshNotificationUnreadCount();
        this.chatUnreadSync.start();
        this.notificationSync.start();
      } else {
        this.chatUnreadSync.stop();
        this.notificationSync.stop();
        if (this.state.chatUnreadCount !== 0) {
          this.setState({ chatUnreadCount: 0 });
        }
        if (this.state.notificationUnreadCount !== 0) {
          this.setState({ notificationUnreadCount: 0 });
        }
      }
    }

    const user = this.state.user;
    const isAdmin = user?.isAdmin?.();

    if (isAdmin && !["admin", "notifications"].includes(this.state.route)) {
      this.navigate("admin", { replace: true });
      return;
    }

    if (!isAdmin && this.state.route === "admin") {
      this.navigate(user ? "home" : "login", { replace: true });
    }
  }

  onPopState = (event) => {
    const historyState = event?.state;
    const route = historyState?.route;
    if (!this.appRoutes.has(route)) return;

    this.setState({
      route,
      selectedProduct: historyState?.selectedProduct ?? null,
      selectedSellerOwnerId: historyState?.selectedSellerOwnerId ?? "",
      selectedPublicUserId: historyState?.selectedPublicUserId ?? "",
      searchKeyword: historyState?.searchKeyword ?? "",
      selectedChatId: historyState?.selectedChatId ?? "",
      selectedAdminSection: historyState?.selectedAdminSection ?? "",
      selectedAdminMemberId: historyState?.selectedAdminMemberId ?? "",
      selectedAdminShopId: historyState?.selectedAdminShopId ?? "",
    });
  };

  syncHistoryEntry = ({ replace = false } = {}) => {
    if (typeof window === "undefined") return;

    const method = replace ? "replaceState" : "pushState";
    const safePayload = {
      route: this.state.route,
      selectedProduct: this.state.selectedProduct ? { ...this.state.selectedProduct } : null,
      selectedSellerOwnerId: this.state.selectedSellerOwnerId ?? "",
      selectedPublicUserId: this.state.selectedPublicUserId ?? "",
      searchKeyword: this.state.searchKeyword ?? "",
      selectedChatId: this.state.selectedChatId ?? "",
      selectedAdminSection: this.state.selectedAdminSection ?? "",
      selectedAdminMemberId: this.state.selectedAdminMemberId ?? "",
      selectedAdminShopId: this.state.selectedAdminShopId ?? "",
    };

    try {
      window.history[method](safePayload, "", window.location.href);
    } catch {
      window.history[method](
        {
          route: safePayload.route,
          selectedProduct: null,
          selectedSellerOwnerId: safePayload.selectedSellerOwnerId,
          selectedPublicUserId: safePayload.selectedPublicUserId,
          searchKeyword: safePayload.searchKeyword,
          selectedChatId: safePayload.selectedChatId,
          selectedAdminSection: safePayload.selectedAdminSection,
          selectedAdminMemberId: safePayload.selectedAdminMemberId,
          selectedAdminShopId: safePayload.selectedAdminShopId,
        },
        "",
        window.location.href,
      );
    }
  };

  navigate = (route, { patch = {}, replace = false } = {}) => {
    if (!this.appRoutes.has(route)) return;

    const hasSelectedProduct = Object.prototype.hasOwnProperty.call(patch, "selectedProduct");
    const hasSelectedSellerOwnerId = Object.prototype.hasOwnProperty.call(patch, "selectedSellerOwnerId");
    const hasSelectedPublicUserId = Object.prototype.hasOwnProperty.call(patch, "selectedPublicUserId");
    const hasSearchKeyword = Object.prototype.hasOwnProperty.call(patch, "searchKeyword");
    const hasSelectedChatId = Object.prototype.hasOwnProperty.call(patch, "selectedChatId");
    const hasSelectedAdminSection = Object.prototype.hasOwnProperty.call(patch, "selectedAdminSection");
    const hasSelectedAdminMemberId = Object.prototype.hasOwnProperty.call(patch, "selectedAdminMemberId");
    const hasSelectedAdminShopId = Object.prototype.hasOwnProperty.call(patch, "selectedAdminShopId");

    this.setState(
      {
        ...patch,
        route,
        selectedProduct: hasSelectedProduct ? patch.selectedProduct : this.state.selectedProduct,
        selectedSellerOwnerId: hasSelectedSellerOwnerId
          ? patch.selectedSellerOwnerId
          : this.state.selectedSellerOwnerId,
        selectedPublicUserId: hasSelectedPublicUserId
          ? patch.selectedPublicUserId
          : this.state.selectedPublicUserId,
        searchKeyword: hasSearchKeyword ? patch.searchKeyword : this.state.searchKeyword,
        selectedChatId: hasSelectedChatId ? patch.selectedChatId : this.state.selectedChatId,
        selectedAdminSection: hasSelectedAdminSection ? patch.selectedAdminSection : this.state.selectedAdminSection,
        selectedAdminMemberId: hasSelectedAdminMemberId ? patch.selectedAdminMemberId : this.state.selectedAdminMemberId,
        selectedAdminShopId: hasSelectedAdminShopId ? patch.selectedAdminShopId : this.state.selectedAdminShopId,
      },
      () => {
        this.syncHistoryEntry({ replace });
      },
    );
  };

  go = (route) => this.navigate(route);

  refreshChatUnreadCount = async () => {
    const userId = `${this.state.user?.id ?? ""}`.trim();
    if (!userId) return;

    if (this.chatUnreadRefreshInFlight) {
      this.pendingChatUnreadRefresh = true;
      return;
    }

    this.chatUnreadRefreshInFlight = true;
    try {
      const { chats } = await this.chatService.listMyChats();
      const nextUnreadCount = (Array.isArray(chats) ? chats : []).reduce(
        (sum, chat) => sum + (Number(chat?.unreadCount) || 0),
        0,
      );

      if (nextUnreadCount !== this.state.chatUnreadCount) {
        this.setState({ chatUnreadCount: nextUnreadCount });
      }
    } catch {
      // keep current unread badge on transient errors
    } finally {
      this.chatUnreadRefreshInFlight = false;
    }

    if (this.pendingChatUnreadRefresh) {
      this.pendingChatUnreadRefresh = false;
      this.refreshChatUnreadCount();
    }
  };

  refreshNotificationUnreadCount = async () => {
    const userId = `${this.state.user?.id ?? ""}`.trim();
    if (!userId) return;

    if (this.notificationUnreadRefreshInFlight) {
      this.pendingNotificationUnreadRefresh = true;
      return;
    }

    this.notificationUnreadRefreshInFlight = true;
    try {
      const { unreadCount } = await this.notificationService.listMyNotifications();
      const nextUnreadCount = Number(unreadCount) || 0;

      if (nextUnreadCount !== this.state.notificationUnreadCount) {
        this.setState({ notificationUnreadCount: nextUnreadCount });
      }
    } catch {
      // keep current unread badge on transient errors
    } finally {
      this.notificationUnreadRefreshInFlight = false;
    }

    if (this.pendingNotificationUnreadRefresh) {
      this.pendingNotificationUnreadRefresh = false;
      this.refreshNotificationUnreadCount();
    }
  };

  getAuthenticatedLandingRoute(user = this.state.user) {
    return user?.isAdmin?.() ? "admin" : "home";
  }

  onLoggedIn = (user) =>
    this.navigate(this.getAuthenticatedLandingRoute(user), {
      patch: { user, selectedProduct: null, selectedSellerOwnerId: "", selectedPublicUserId: "" },
    });

  onRegistered = () => this.navigate("login");

  // ✅ HomePage เรียกกลับมาเมื่อแก้โปรไฟล์สำเร็จ
  onUpdatedUser = (user) => this.setState({ user });
  onDeletedAccount = () =>
    this.navigate("login", {
      patch: {
        user: null,
        selectedProduct: null,
        selectedSellerOwnerId: "",
        selectedPublicUserId: "",
        searchKeyword: "",
        selectedChatId: "",
      },
      replace: true,
    });
  onGoMyShop = () => this.navigate("myshop");
  onGoMyOrders = () => this.navigate("orders");
  onBackHome = () =>
    this.navigate("home", {
      patch: { selectedProduct: null, selectedSellerOwnerId: "", selectedPublicUserId: "", selectedChatId: "" },
    });
  onOpenProduct = (product) =>
    this.navigate("product", {
      patch: { selectedProduct: product ?? null, selectedSellerOwnerId: "", selectedPublicUserId: "", selectedChatId: "" },
    });
  onOpenSellerProfile = (ownerId) =>
    this.navigate("seller", {
      patch: {
        selectedProduct: null,
        selectedSellerOwnerId: `${ownerId ?? ""}`.trim(),
        selectedPublicUserId: "",
        selectedChatId: "",
      },
    });
  onOpenPublicUserProfile = (userId) =>
    this.navigate("profile", {
      patch: {
        selectedProduct: null,
        selectedSellerOwnerId: "",
        selectedPublicUserId: `${userId ?? ""}`.trim(),
        selectedChatId: "",
      },
    });
  onOpenSearch = (keyword) =>
    this.navigate("search", {
      patch: {
        searchKeyword: keyword ?? "",
        selectedProduct: null,
        selectedSellerOwnerId: "",
        selectedPublicUserId: "",
        selectedChatId: "",
      },
    });
  onGoChat = ({ chatId } = {}) => {
    const normalizedChatId = `${chatId ?? ""}`.trim();
    const patch = normalizedChatId
      ? {
          selectedChatId: normalizedChatId,
          selectedProduct: null,
          selectedSellerOwnerId: "",
          selectedPublicUserId: "",
        }
      : { selectedProduct: null, selectedSellerOwnerId: "", selectedPublicUserId: "" };
    this.navigate("chat", { patch });
  };
  onGoNotifications = () =>
    this.navigate("notifications", {
      patch: {
        selectedChatId: "",
      },
    });

  onOpenNotificationTarget = (notification) => {
    const route = notification?.getTargetRoute?.() ?? `${notification?.target?.route ?? ""}`.trim();
    const params = notification?.target?.params ?? {};
    const metadata = notification?.metadata ?? {};

    if (!route || !this.appRoutes.has(route)) return;

    if (route === "chat") {
      const chatId = `${params?.chatId ?? metadata?.chatId ?? ""}`.trim();
      this.navigate("chat", {
        patch: {
          selectedChatId: chatId,
          selectedProduct: null,
          selectedSellerOwnerId: "",
          selectedPublicUserId: "",
          selectedAdminSection: "",
          selectedAdminMemberId: "",
          selectedAdminShopId: "",
        },
      });
      return;
    }

    if (route === "orders") {
      this.navigate("orders", {
        patch: { selectedChatId: "", selectedAdminSection: "", selectedAdminMemberId: "", selectedAdminShopId: "" },
      });
      return;
    }

    if (route === "myshop") {
      this.navigate("myshop", {
        patch: { selectedChatId: "", selectedAdminSection: "", selectedAdminMemberId: "", selectedAdminShopId: "" },
      });
      return;
    }

    if (route === "admin") {
      if (!this.state.user?.isAdmin?.()) return;
      this.navigate("admin", {
        patch: {
          selectedChatId: "",
          selectedAdminSection: `${params?.section ?? ""}`.trim(),
          selectedAdminMemberId: `${params?.memberId ?? metadata?.memberId ?? ""}`.trim(),
          selectedAdminShopId: `${params?.shopId ?? metadata?.shopId ?? ""}`.trim(),
        },
      });
      return;
    }

    if (route === "profile") {
      const userId = `${params?.userId ?? metadata?.userId ?? ""}`.trim();
      if (!userId) return;
      this.navigate("profile", {
        patch: {
          selectedPublicUserId: userId,
          selectedSellerOwnerId: "",
          selectedProduct: null,
          selectedChatId: "",
          selectedAdminSection: "",
          selectedAdminMemberId: "",
          selectedAdminShopId: "",
        },
      });
      return;
    }

    if (route === "seller") {
      const ownerId = `${params?.ownerId ?? metadata?.ownerId ?? metadata?.shopOwnerId ?? ""}`.trim();
      if (!ownerId) return;
      this.navigate("seller", {
        patch: {
          selectedSellerOwnerId: ownerId,
          selectedPublicUserId: "",
          selectedProduct: null,
          selectedChatId: "",
          selectedAdminSection: "",
          selectedAdminMemberId: "",
          selectedAdminShopId: "",
        },
      });
      return;
    }

    this.navigate(route, {
      patch: {
        selectedChatId: "",
        selectedAdminSection: "",
        selectedAdminMemberId: "",
        selectedAdminShopId: "",
      },
    });
  };

  onAdminTargetHandled = () => {
    if (!this.state.selectedAdminMemberId && !this.state.selectedAdminShopId) return;
    this.navigate("admin", {
      replace: true,
      patch: {
        selectedAdminMemberId: "",
        selectedAdminShopId: "",
      },
    });
  };

  onLogout = async () => {
    try {
      await this.auth.logout?.();
    } finally {
      this.navigate("login", {
        patch: {
          user: null,
          selectedProduct: null,
          selectedSellerOwnerId: "",
          selectedPublicUserId: "",
          searchKeyword: "",
          selectedChatId: "",
        },
      });
    }
  };

  renderWithDataModeSwitch(content) {
    return (
      <>
        <div className="flex min-h-dvh flex-col">
          <div className="flex-1">{content}</div>
          <footer className="border-t border-zinc-200/80 bg-white/80 px-4 py-4 text-center text-sm text-zinc-600 backdrop-blur-sm">
            ติดต่อผู้ดูแลระบบ:{" "}
            <a
              href={`mailto:${ADMIN_CONTACT_EMAIL}`}
              className="font-semibold text-amber-700 underline decoration-amber-400 underline-offset-2"
            >
              {ADMIN_CONTACT_EMAIL}
            </a>
            <span className="mx-2 text-zinc-400">|</span>
            <a href={`tel:${ADMIN_CONTACT_PHONE}`} className="font-semibold text-amber-700 underline decoration-amber-400 underline-offset-2">
              {ADMIN_CONTACT_PHONE}
            </a>
          </footer>
        </div>
        {/* DATA_MODE_SWITCH: ลบ widget นี้ได้ทันที หากไม่ต้องการโหมด no-db */}
        <DataModeSwitchWidget />
      </>
    );
  }

  render() {
    const { route, user, selectedProduct, selectedSellerOwnerId, selectedPublicUserId, searchKeyword, selectedChatId, booting } = this.state;
    const { chatUnreadCount, notificationUnreadCount } = this.state;
    if (booting) return null;

    // guard (ป้องกันผู้ใช้ที่ยังไม่ login เข้าหน้าในระบบผ่าน browser back)
    if (!user && !["login", "register"].includes(route)) {
      return this.renderWithDataModeSwitch(
        <LoginPage
          onGoRegister={() => this.go("register")}
          onLoggedIn={this.onLoggedIn}
        />
      );
    }

    if (route === "login") {
      return this.renderWithDataModeSwitch(
        <LoginPage
          onGoRegister={() => this.go("register")}
          onLoggedIn={this.onLoggedIn}
        />
      );
    }

    if (route === "register") {
      return this.renderWithDataModeSwitch(
        <RegisterPage
          onGoLogin={() => this.go("login")}
          onRegistered={this.onRegistered}
        />
      );
    }

    if (route === "notifications") {
      return this.renderWithDataModeSwitch(
        <NotificationsPage
          user={user}
          onGoBack={() => this.navigate(this.getAuthenticatedLandingRoute(user))}
          onOpenNotification={this.onOpenNotificationTarget}
          onNotificationsChanged={this.refreshNotificationUnreadCount}
        />
      );
    }

    if (user?.isAdmin?.()) {
      return this.renderWithDataModeSwitch(
        <AdminPage
          user={user}
          initialSection={this.state.selectedAdminSection}
          initialMemberId={this.state.selectedAdminMemberId}
          initialShopId={this.state.selectedAdminShopId}
          notificationUnreadCount={notificationUnreadCount}
          onGoNotifications={this.onGoNotifications}
          onTargetHandled={this.onAdminTargetHandled}
          onLogout={this.onLogout}
        />
      );
    }

    if (route === "myshop") {
      return this.renderWithDataModeSwitch(
        <MyShopPage
          user={user}
          chatUnreadCount={chatUnreadCount}
          notificationUnreadCount={notificationUnreadCount}
          onBack={this.onBackHome}
          onGoMyShop={this.onGoMyShop}
          onGoMyOrders={this.onGoMyOrders}
          onGoNotifications={this.onGoNotifications}
          onGoChat={this.onGoChat}
          onUpdatedUser={this.onUpdatedUser}
          onDeletedAccount={this.onDeletedAccount}
          onLogout={this.onLogout}
        />
      );
    }

    if (route === "product") {
      return this.renderWithDataModeSwitch(
        <ProductDetailPage
          product={selectedProduct}
          user={user}
          chatUnreadCount={chatUnreadCount}
          notificationUnreadCount={notificationUnreadCount}
          onGoHome={this.onBackHome}
          onSubmitSearch={this.onOpenSearch}
          onOpenProduct={this.onOpenProduct}
          onOpenSellerProfile={this.onOpenSellerProfile}
          onGoNotifications={this.onGoNotifications}
          onGoMyShop={this.onGoMyShop}
          onGoMyOrders={this.onGoMyOrders}
          onLogout={this.onLogout}
          onGoChat={this.onGoChat}
        />
      );
    }

    if (route === "seller") {
      return this.renderWithDataModeSwitch(
        <SellerStorefrontPage
          ownerId={selectedSellerOwnerId}
          user={user}
          chatUnreadCount={chatUnreadCount}
          notificationUnreadCount={notificationUnreadCount}
          onGoHome={this.onBackHome}
          onSubmitSearch={this.onOpenSearch}
          onOpenProduct={this.onOpenProduct}
          onGoNotifications={this.onGoNotifications}
          onGoMyShop={this.onGoMyShop}
          onGoMyOrders={this.onGoMyOrders}
          onLogout={this.onLogout}
          onGoChat={this.onGoChat}
        />
      );
    }

    if (route === "profile") {
      return this.renderWithDataModeSwitch(
        <PublicUserProfilePage
          userId={selectedPublicUserId}
          user={user}
          onGoHome={this.onBackHome}
          onOpenSellerProfile={this.onOpenSellerProfile}
        />
      );
    }

    if (route === "search") {
      return this.renderWithDataModeSwitch(
        <SearchProductsPage
          initialKeyword={searchKeyword}
          user={user}
          chatUnreadCount={chatUnreadCount}
          notificationUnreadCount={notificationUnreadCount}
          onBack={this.onBackHome}
          onGoHome={this.onBackHome}
          onOpenProduct={this.onOpenProduct}
          onGoNotifications={this.onGoNotifications}
          onGoMyShop={this.onGoMyShop}
          onGoMyOrders={this.onGoMyOrders}
          onUpdatedUser={this.onUpdatedUser}
          onDeletedAccount={this.onDeletedAccount}
          onLogout={this.onLogout}
          onGoChat={this.onGoChat}
        />
      );
    }

    if (route === "chat") {
      return this.renderWithDataModeSwitch(
        <ChatPage
          user={user}
          initialChatId={selectedChatId}
          onGoHome={this.onBackHome}
          onOpenProduct={this.onOpenProduct}
          onOpenPublicUserProfile={this.onOpenPublicUserProfile}
          onChatReadStateChanged={this.refreshChatUnreadCount}
        />
      );
    }

    if (route === "orders") {
      return this.renderWithDataModeSwitch(
        <MyOrdersPage
          user={user}
          chatUnreadCount={chatUnreadCount}
          notificationUnreadCount={notificationUnreadCount}
          onGoHome={this.onBackHome}
          onGoMyShop={this.onGoMyShop}
          onGoNotifications={this.onGoNotifications}
          onGoChat={this.onGoChat}
          onLogout={this.onLogout}
        />
      );
    }

    return this.renderWithDataModeSwitch(
      <HomePage
        user={user}
        chatUnreadCount={chatUnreadCount}
        notificationUnreadCount={notificationUnreadCount}
        onLogout={this.onLogout}
        onPickCategory={(c) => console.log("pick category:", c)}
        onSearch={(q) => console.log("search:", q)}
        onCart={() => console.log("cart")}
        onToggleMenu={() => console.log("menu")}
        onUpdatedUser={this.onUpdatedUser} // ✅ เพิ่ม
        onDeletedAccount={this.onDeletedAccount}
        onGoMyShop={this.onGoMyShop}
        onGoMyOrders={this.onGoMyOrders}
        onGoNotifications={this.onGoNotifications}
        onGoHome={this.onBackHome}
        onOpenProduct={this.onOpenProduct}
        onSubmitSearch={this.onOpenSearch}
        onGoChat={this.onGoChat}
      />
    );
  }
}

