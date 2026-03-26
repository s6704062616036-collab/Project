import React from "react";
import { LoginPage } from "../pages/LoginPage";
import { RegisterPage } from "../pages/RegisterPage";
import { HomePage } from "../pages/HomePage";
import { MyShopPage } from "../pages/MyShopPage";
import { ProductDetailPage } from "../pages/ProductDetailPage";
import { SearchProductsPage } from "../pages/SearchProductsPage";
import { ChatPage } from "../pages/ChatPage";
import { AuthService } from "../services/AuthService";
import { DataModeSwitchWidget } from "./DataModeSwitchWidget";

export default class App extends React.Component {
  state = {
    route: "login",
    user: null,
    selectedProduct: null,
    searchKeyword: "",
    selectedChatId: "",
    booting: true,
  };

  auth = AuthService.instance();
  appRoutes = new Set(["login", "register", "home", "myshop", "product", "search", "chat"]);

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
        nextRoute = "home";
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

  onPopState = (event) => {
    const historyState = event?.state;
    const route = historyState?.route;
    if (!this.appRoutes.has(route)) return;

    this.setState({
      route,
      selectedProduct: historyState?.selectedProduct ?? null,
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
    const hasSearchKeyword = Object.prototype.hasOwnProperty.call(patch, "searchKeyword");
    const hasSelectedChatId = Object.prototype.hasOwnProperty.call(patch, "selectedChatId");

    this.setState(
      {
        ...patch,
        route,
        selectedProduct: hasSelectedProduct ? patch.selectedProduct : this.state.selectedProduct,
        searchKeyword: hasSearchKeyword ? patch.searchKeyword : this.state.searchKeyword,
        selectedChatId: hasSelectedChatId ? patch.selectedChatId : this.state.selectedChatId,
      },
      () => {
        this.syncHistoryEntry({ replace });
      },
    );
  };

  go = (route) => this.navigate(route);

  onLoggedIn = (user) => this.navigate("home", { patch: { user, selectedProduct: null } });

  onRegistered = () => this.navigate("login");

  // ✅ HomePage เรียกกลับมาเมื่อแก้โปรไฟล์สำเร็จ
  onUpdatedUser = (user) => this.setState({ user });
  onGoMyShop = () => this.navigate("myshop");
  onBackHome = () => this.navigate("home", { patch: { selectedProduct: null, selectedChatId: "" } });
  onOpenProduct = (product) =>
    this.navigate("product", { patch: { selectedProduct: product ?? null, selectedChatId: "" } });
  onOpenSearch = (keyword) =>
    this.navigate("search", {
      patch: { searchKeyword: keyword ?? "", selectedProduct: null, selectedChatId: "" },
    });
  onGoChat = ({ chatId } = {}) => {
    const normalizedChatId = `${chatId ?? ""}`.trim();
    const patch = normalizedChatId ? { selectedChatId: normalizedChatId, selectedProduct: null } : { selectedProduct: null };
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
    const { route, user, selectedProduct, searchKeyword, selectedChatId, booting } = this.state;
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

    if (route === "myshop") {
      return this.renderWithDataModeSwitch(
        <MyShopPage
          user={user}
          onBack={this.onBackHome}
          onGoMyShop={this.onGoMyShop}
          onGoChat={this.onGoChat}
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
          onGoMyShop={this.onGoMyShop}
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

    return this.renderWithDataModeSwitch(
      <HomePage
        user={user}
        onLogout={this.onLogout}
        onPickCategory={(c) => console.log("pick category:", c)}
        onSearch={(q) => console.log("search:", q)}
        onCart={() => console.log("cart")}
        onToggleMenu={() => console.log("menu")}
        onUpdatedUser={this.onUpdatedUser} // ✅ เพิ่ม
        onGoMyShop={this.onGoMyShop}
        onGoHome={this.onBackHome}
        onOpenProduct={this.onOpenProduct}
        onSubmitSearch={this.onOpenSearch}
        onGoChat={this.onGoChat}
      />
    );
  }
}

