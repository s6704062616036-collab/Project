import { DataModeSwitch } from "./DataModeSwitch";
import { MockApiRouter } from "./MockApiRouter";

// DATA_MODE_SWITCH: remove this file + HttpClient integration to disable no-db mode entirely.
const AUTH_TOKEN_STORAGE_KEY = "myweb_auth_token";

class ApiHttpTransport {
  constructor({ baseUrl = "" } = {}) {
    this.baseUrl = baseUrl;
    this.jsonHeaders = { "Content-Type": "application/json" };
  }

  buildRequestUrl(path) {
    const normalizedBaseUrl = `${this.baseUrl ?? ""}`.replace(/\/+$/, "");
    const normalizedPath = `${path ?? ""}`;

    if (!normalizedBaseUrl) {
      return normalizedPath;
    }

    if (
      normalizedBaseUrl.endsWith("/api") &&
      normalizedPath.startsWith("/api/")
    ) {
      return `${normalizedBaseUrl}${normalizedPath.slice(4)}`;
    }

    return `${normalizedBaseUrl}${normalizedPath}`;
  }

  getAuthHeaders(headers = {}) {
    if (typeof window === "undefined") {
      return { ...(headers ?? {}) };
    }

    const token = window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
    if (!token) {
      return { ...(headers ?? {}) };
    }

    return {
      Authorization: `Bearer ${token}`,
      ...(headers ?? {}),
    };
  }

  async request(path, { method = "GET", body, headers } = {}) {
    const isFormData =
      typeof FormData !== "undefined" && body instanceof FormData;
    const authHeaders = this.getAuthHeaders(headers);

    const finalHeaders = isFormData
      ? authHeaders
      : { ...this.jsonHeaders, ...authHeaders };

    const finalBody = isFormData
      ? body
      : body != null
        ? JSON.stringify(body)
        : undefined;

    const res = await fetch(this.buildRequestUrl(path), {
      method,
      headers: finalHeaders,
      body: finalBody,
    });

    const contentType = res.headers.get("content-type") ?? "";
    const isJson = contentType.includes("application/json");
    const data = isJson ? await res.json().catch(() => null) : await res.text();

    if (!res.ok) {
      const msg =
        (data && typeof data === "object" && data.message) ||
        (typeof data === "string" ? data : "Request failed");
      throw new Error(msg);
    }

    return data;
  }
}

class NoDatabaseHttpTransport {
  constructor() {
    this.mockRouter = MockApiRouter.instance();
  }

  async request(path, { method = "GET", body } = {}) {
    return this.mockRouter.request(path, { method, body });
  }
}

export class DataModeHttpTransport {
  constructor({ baseUrl = "" } = {}) {
    this.apiTransport = new ApiHttpTransport({ baseUrl });
    this.noDatabaseTransport = new NoDatabaseHttpTransport();
  }

  async request(path, options = {}) {
    if (DataModeSwitch.isNoDatabaseMode()) {
      return this.noDatabaseTransport.request(path, options);
    }
    return this.apiTransport.request(path, options);
  }
}
