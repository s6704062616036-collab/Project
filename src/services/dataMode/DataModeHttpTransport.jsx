import { DataModeSwitch } from "./DataModeSwitch";
import { MockApiRouter } from "./MockApiRouter";

// DATA_MODE_SWITCH: remove this file + HttpClient integration to disable no-db mode entirely.
class ApiHttpTransport {
  constructor({ baseUrl = "" } = {}) {
    this.baseUrl = baseUrl;
    this.jsonHeaders = { "Content-Type": "application/json" };
  }

  async request(path, { method = "GET", body, headers } = {}) {
    const isFormData =
      typeof FormData !== "undefined" && body instanceof FormData;

    // ถ้าเป็น FormData: ห้าม set Content-Type เอง
    const finalHeaders = isFormData
      ? { ...(headers ?? {}) }
      : { ...this.jsonHeaders, ...(headers ?? {}) };

    const finalBody = isFormData
      ? body
      : body != null
        ? JSON.stringify(body)
        : undefined;

    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: finalHeaders,
      body: finalBody,
      credentials: "include",
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
