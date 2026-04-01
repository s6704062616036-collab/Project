import { DataModeHttpTransport } from "./dataMode/DataModeHttpTransport";

export class HttpClient {
  constructor({ baseUrl = import.meta.env.VITE_API_URL ?? "" } = {}) {
    // DATA_MODE_SWITCH: จุดเดียวที่สลับ DB transport กับ no-db transport
    this.transport = new DataModeHttpTransport({ baseUrl });
  }

  async request(path, { method = "GET", body, headers } = {}) {
    return this.transport.request(path, {
      method,
      body,
      headers,
    });
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

  delete(path, opts) {
    return this.request(path, { ...(opts ?? {}), method: "DELETE" });
  }
}
