import { HttpClient } from "./HttpClient";
import { User } from "../models/User";

const AUTH_TOKEN_STORAGE_KEY = "myweb_auth_token";

const readUserPayload = (payload) => payload?.user ?? payload?.data ?? null;

const persistToken = (token) => {
  if (typeof window === "undefined") return;

  if (token) {
    window.localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
    return;
  }

  window.localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
};

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
    const userPayload = readUserPayload(result);
    persistToken(result?.token ?? "");
    return {
      user: userPayload ? User.fromJSON(userPayload) : null,
      token: result?.token,
    };
  }

  async register(payload) {
    const result = await this.http.post("/api/auth/register", payload);
    const userPayload = readUserPayload(result);
    return {
      user: userPayload ? User.fromJSON(userPayload) : null,
      token: result?.token,
    };
  }

  async registerForm(formData) {
    return this.http.post("/api/auth/register", formData);
  }

  async me() {
    // backend: GET /api/auth/me -> { user: {...} }
    const result = await this.http.get("/api/auth/me");
    const userPayload = readUserPayload(result);
    return { user: userPayload ? User.fromJSON(userPayload) : null };
  }

  async logout() {
    try {
      await this.http.post("/api/auth/logout", {});
    } finally {
      persistToken("");
    }
    return true;
  }
}
