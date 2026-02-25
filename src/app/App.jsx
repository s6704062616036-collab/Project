import React from "react";
import { LoginPage } from "../pages/LoginPage";
import { RegisterPage } from "../pages/RegisterPage";
import { HomePage } from "../pages/HomePage";
import { AuthService } from "../services/AuthService";

export default class App extends React.Component {
  state = {
    route: "login", // login | register | home
    user: null,
    booting: true,
  };

  auth = AuthService.instance();

  async componentDidMount() {
    // (โครง) ถ้า backend ใช้ cookie session: เปิดเว็บใหม่แล้วยังรู้ว่า login อยู่
    try {
      const me = await this.auth.me();
      if (me?.user) {
        this.setState({ user: me.user, route: "home" });
      }
    } catch {
      // ignore
    } finally {
      this.setState({ booting: false });
    }
  }

  go = (route) => this.setState({ route });

  onLoggedIn = (user) => this.setState({ user, route: "home" });

  onRegistered = () => this.setState({ route: "login" });

  onLogout = async () => {
    try {
      await this.auth.logout();
    } finally {
      this.setState({ user: null, route: "login" });
    }
  };

  render() {
    const { route, user, booting } = this.state;
    if (booting) return null;

    // ✅ Guard: ถ้าเข้า home แต่ไม่มี user -> เด้งไป login
    if (route === "home" && !user) {
      return (
        <LoginPage
          onGoRegister={() => this.go("register")}
          onLoggedIn={this.onLoggedIn}
        />
      );
    }

    if (route === "login") {
      return (
        <LoginPage
          onGoRegister={() => this.go("register")}
          onLoggedIn={this.onLoggedIn}
        />
      );
    }

    if (route === "register") {
      return (
        <RegisterPage
          onGoLogin={() => this.go("login")}
          onRegistered={this.onRegistered}
        />
      );
    }

    return (
      <HomePage
        user={user}
        onLogout={this.onLogout}
        onPickCategory={(c) => console.log("pick category:", c)}
        onSearch={(q) => console.log("search:", q)}
        onCart={() => console.log("cart")}
        onProfile={() => console.log("profile")}
        onToggleMenu={() => console.log("menu")}
      />
    );
  }
}