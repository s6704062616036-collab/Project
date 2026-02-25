import { HttpClient } from "./HttpClient";
import { User } from "../models/User";

export class AuthService {
  static #instance = null;

  static instance() {
    if (!AuthService.#instance) AuthService.#instance = new AuthService();
    return AuthService.#instance;
  }

  constructor() {
    this.http = new HttpClient({ baseUrl: import.meta.env.VITE_API_URL ?? "" });
  }

  async login(payload) {
    const result = await this.http.post("/api/auth/login", payload);
    return {
      user: result?.user ? User.fromJSON(result.user) : null,
      token: result?.token,
    };
  }

  async register(payload) {
    const result = await this.http.post("/api/auth/register", payload);
    return {
      user: result?.user ? User.fromJSON(result.user) : null,
      token: result?.token,
    };
  }

  async registerForm(formData) {
    return this.http.post("/api/auth/register", formData);
  }

  async me() {
    // backend: GET /api/auth/me -> { user: {...} }
    const result = await this.http.get("/api/auth/me");
    return { user: result?.user ? User.fromJSON(result.user) : null };
  }

  async logout() {
    await this.http.post("/api/auth/logout", {});
    return true;
  }
}