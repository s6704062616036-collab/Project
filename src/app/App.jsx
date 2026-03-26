import React from "react";
import { LoginPage } from "../pages/LoginPage";
import { RegisterPage } from "../pages/RegisterPage";
import { HomePage } from "../pages/HomePage";
import { MyShopPage } from "../pages/MyShopPage";
import { ProductDetailPage } from "../pages/ProductDetailPage";
import { SearchProductsPage } from "../pages/SearchProductsPage";
import { AuthService } from "../services/AuthService";
import { DataModeSwitchWidget } from "./DataModeSwitchWidget";

export default class App extends React.Component {
  // Dev mode (เข้า home ได้เลยเพื่อดู UI)
  state = {
    route: import.meta.env.DEV ? "home" : "login",
    user: import.meta.env.DEV ? { name: "Preview User" } : null,
    selectedProduct: null,
    searchKeyword: "",
    booting: true,
  };

  auth = AuthService.instance();
  appRoutes = new Set(["login", "register", "home", "myshop", "product", "search"]);

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
    });
  };

  syncHistoryEntry = ({ replace = false } = {}) => {
    if (typeof window === "undefined") return;

    const method = replace ? "replaceState" : "pushState";
    const safePayload = {
      route: this.state.route,
      selectedProduct: this.state.selectedProduct ? { ...this.state.selectedProduct } : null,
      searchKeyword: this.state.searchKeyword ?? "",
    };

    try {
      window.history[method](safePayload, "", window.location.href);
    } catch {
      window.history[method](
        {
          route: safePayload.route,
          selectedProduct: null,
          searchKeyword: safePayload.searchKeyword,
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

    this.setState(
      {
        ...patch,
        route,
        selectedProduct: hasSelectedProduct ? patch.selectedProduct : this.state.selectedProduct,
        searchKeyword: hasSearchKeyword ? patch.searchKeyword : this.state.searchKeyword,
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
  onBackHome = () => this.navigate("home", { patch: { selectedProduct: null } });
  onOpenProduct = (product) => this.navigate("product", { patch: { selectedProduct: product ?? null } });
  onOpenSearch = (keyword) =>
    this.navigate("search", { patch: { searchKeyword: keyword ?? "", selectedProduct: null } });

  onLogout = async () => {
    try {
      await this.auth.logout?.();
    } finally {
      this.navigate("login", {
        patch: {
          user: null,
          selectedProduct: null,
          searchKeyword: "",
        },
      });
    }
  };

  // DB_SWITCH: render ตัวสวิตช์แบบ overlay โดยไม่กระทบ layout เดิมของแต่ละหน้า
  renderWithDataModeSwitch(content) {
    return (
      <>
        {content}
        <DataModeSwitchWidget />
      </>
    );
  }

  render() {
    const { route, user, selectedProduct, searchKeyword, booting } = this.state;
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
      return this.renderWithDataModeSwitch(<MyShopPage user={user} onBack={this.onBackHome} />);
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
      />
    );
  }
}

