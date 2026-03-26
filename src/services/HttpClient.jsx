import { DataModeSwitch } from "./dataMode/DataModeSwitch";
import { MockApiRouter } from "./dataMode/MockApiRouter";

export class HttpClient {
  constructor({ baseUrl = import.meta.env.VITE_API_URL ?? "" } = {}) {
    this.baseUrl = baseUrl;
    this.jsonHeaders = { "Content-Type": "application/json" };
    // DB_SWITCH: mock router สำหรับทดสอบโดยไม่ใช้ database จริง
    this.mockRouter = MockApiRouter.instance();
  }

  async request(path, { method = "GET", body, headers } = {}) {
    // DB_SWITCH: เมื่ออยู่โหมด mock ให้ตัดไปใช้ mock backend ทั้งระบบ
    if (DataModeSwitch.isMockMode()) {
      return this.mockRouter.request(path, { method, body, headers });
    }

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

  async patch(path, body) {
    return this.request(path, { method: "PATCH", body });
  }

  get(path, opts) {
    return this.request(path, { ...(opts ?? {}), method: "GET" });
  }

  post(path, body, opts) {
    return this.request(path, { ...(opts ?? {}), method: "POST", body });
  }
}
