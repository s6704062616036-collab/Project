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
import { AuthService } from "../services/AuthService";
import { DataModeSwitchWidget } from "./DataModeSwitchWidget";

export default class App extends React.Component {
  state = {
    route: "login",
    user: null,
    selectedProduct: null,
    selectedSellerOwnerId: "",
    searchKeyword: "",
    selectedChatId: "",
    booting: true,
  };

  auth = AuthService.instance();
  appRoutes = new Set(["login", "register", "home", "myshop", "product", "seller", "search", "chat", "orders", "admin"]);

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
  }

  componentDidUpdate() {
    const user = this.state.user;
    const isAdmin = user?.isAdmin?.();

    if (isAdmin && this.state.route !== "admin") {
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
      searchKeyword: historyState?.searchKeyword ?? "",
      selectedChatId: historyState?.selectedChatId ?? "",
    });
  };

  syncHistoryEntry = ({ replace = false } = {}) => {
    if (typeof window === "undefined") return;

    const method = replace ? "replaceState" : "pushState";
    const safePayload = {
      route: this.state.route,
      selectedProduct: this.state.selectedProduct ? { ...this.state.selectedProduct } : null,
      selectedSellerOwnerId: this.state.selectedSellerOwnerId ?? "",
      searchKeyword: this.state.searchKeyword ?? "",
      selectedChatId: this.state.selectedChatId ?? "",
    };

    try {
      window.history[method](safePayload, "", window.location.href);
    } catch {
      window.history[method](
        {
          route: safePayload.route,
          selectedProduct: null,
          selectedSellerOwnerId: safePayload.selectedSellerOwnerId,
          searchKeyword: safePayload.searchKeyword,
          selectedChatId: safePayload.selectedChatId,
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
    const hasSearchKeyword = Object.prototype.hasOwnProperty.call(patch, "searchKeyword");
    const hasSelectedChatId = Object.prototype.hasOwnProperty.call(patch, "selectedChatId");

    this.setState(
      {
        ...patch,
        route,
        selectedProduct: hasSelectedProduct ? patch.selectedProduct : this.state.selectedProduct,
        selectedSellerOwnerId: hasSelectedSellerOwnerId
          ? patch.selectedSellerOwnerId
          : this.state.selectedSellerOwnerId,
        searchKeyword: hasSearchKeyword ? patch.searchKeyword : this.state.searchKeyword,
        selectedChatId: hasSelectedChatId ? patch.selectedChatId : this.state.selectedChatId,
      },
      () => {
        this.syncHistoryEntry({ replace });
      },
    );
  };

  go = (route) => this.navigate(route);

  getAuthenticatedLandingRoute(user = this.state.user) {
    return user?.isAdmin?.() ? "admin" : "home";
  }

  onLoggedIn = (user) =>
    this.navigate(this.getAuthenticatedLandingRoute(user), {
      patch: { user, selectedProduct: null, selectedSellerOwnerId: "" },
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
        searchKeyword: "",
        selectedChatId: "",
      },
      replace: true,
    });
  onGoMyShop = () => this.navigate("myshop");
  onGoMyOrders = () => this.navigate("orders");
  onBackHome = () =>
    this.navigate("home", {
      patch: { selectedProduct: null, selectedSellerOwnerId: "", selectedChatId: "" },
    });
  onOpenProduct = (product) =>
    this.navigate("product", {
      patch: { selectedProduct: product ?? null, selectedSellerOwnerId: "", selectedChatId: "" },
    });
  onOpenSellerProfile = (ownerId) =>
    this.navigate("seller", {
      patch: {
        selectedProduct: null,
        selectedSellerOwnerId: `${ownerId ?? ""}`.trim(),
        selectedChatId: "",
      },
    });
  onOpenSearch = (keyword) =>
    this.navigate("search", {
      patch: {
        searchKeyword: keyword ?? "",
        selectedProduct: null,
        selectedSellerOwnerId: "",
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
        }
      : { selectedProduct: null, selectedSellerOwnerId: "" };
    this.navigate("chat", { patch });
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
          searchKeyword: "",
          selectedChatId: "",
        },
      });
    }
  };

  renderWithDataModeSwitch(content) {
    return (
      <>
        {content}
        {/* DATA_MODE_SWITCH: ลบ widget นี้ได้ทันที หากไม่ต้องการโหมด no-db */}
        <DataModeSwitchWidget />
      </>
    );
  }

  render() {
    const { route, user, selectedProduct, selectedSellerOwnerId, searchKeyword, selectedChatId, booting } = this.state;
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

    if (user?.isAdmin?.()) {
      return this.renderWithDataModeSwitch(
        <AdminPage
          user={user}
          onLogout={this.onLogout}
        />
      );
    }

    if (route === "myshop") {
      return this.renderWithDataModeSwitch(
        <MyShopPage
          user={user}
          onBack={this.onBackHome}
          onGoMyShop={this.onGoMyShop}
          onGoMyOrders={this.onGoMyOrders}
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
          onGoHome={this.onBackHome}
          onSubmitSearch={this.onOpenSearch}
          onOpenProduct={this.onOpenProduct}
          onOpenSellerProfile={this.onOpenSellerProfile}
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
          onGoHome={this.onBackHome}
          onSubmitSearch={this.onOpenSearch}
          onOpenProduct={this.onOpenProduct}
          onGoMyShop={this.onGoMyShop}
          onGoMyOrders={this.onGoMyOrders}
          onLogout={this.onLogout}
          onGoChat={this.onGoChat}
        />
      );
    }

    if (route === "search") {
      return this.renderWithDataModeSwitch(
        <SearchProductsPage
          initialKeyword={searchKeyword}
          user={user}
          onBack={this.onBackHome}
          onGoHome={this.onBackHome}
          onOpenProduct={this.onOpenProduct}
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
        />
      );
    }

    if (route === "orders") {
      return this.renderWithDataModeSwitch(
        <MyOrdersPage
          user={user}
          onGoHome={this.onBackHome}
          onGoMyShop={this.onGoMyShop}
          onGoChat={this.onGoChat}
          onLogout={this.onLogout}
        />
      );
    }

    return this.renderWithDataModeSwitch(
      <HomePage
        user={user}
        onLogout={this.onLogout}
        onPickCategory={(c) => console.log("pick category:", c)}
        onSearch={(q) => console.log("search:", q)}
        onCart={() => console.log("cart")}
        onToggleMenu={() => console.log("menu")}
        onUpdatedUser={this.onUpdatedUser} // ✅ เพิ่ม
        onDeletedAccount={this.onDeletedAccount}
        onGoMyShop={this.onGoMyShop}
        onGoMyOrders={this.onGoMyOrders}
        onGoHome={this.onBackHome}
        onOpenProduct={this.onOpenProduct}
        onSubmitSearch={this.onOpenSearch}
        onGoChat={this.onGoChat}
      />
    );
  }
}

