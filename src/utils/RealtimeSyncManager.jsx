import { DataModeSwitch } from "../services/dataMode/DataModeSwitch";

const DEFAULT_MOCK_STORAGE_KEY = "myweb:mock-db:v1";
const DEFAULT_MOCK_UPDATED_EVENT = "myweb:mock-db:updated";

export class RealtimeSyncManager {
  constructor({
    onRefresh,
    mockStorageKey = DEFAULT_MOCK_STORAGE_KEY,
    mockUpdatedEvent = DEFAULT_MOCK_UPDATED_EVENT,
    databasePollIntervalMs = 5000,
  } = {}) {
    this.onRefresh = typeof onRefresh === "function" ? onRefresh : () => {};
    this.mockStorageKey = mockStorageKey;
    this.mockUpdatedEvent = mockUpdatedEvent;
    this.databasePollIntervalMs = Number.isFinite(Number(databasePollIntervalMs))
      ? Math.max(1000, Number(databasePollIntervalMs))
      : 5000;
    this.unsubscribeDataMode = null;
    this.pollingTimerId = null;
    this.started = false;
  }

  start() {
    if (this.started || typeof window === "undefined") return;
    this.started = true;

    window.addEventListener("focus", this.handleWindowFocus);
    document.addEventListener("visibilitychange", this.handleVisibilityChange);
    this.unsubscribeDataMode = DataModeSwitch.subscribe(this.handleDataModeChange);
    this.bindModeSpecificSync();
  }

  stop() {
    if (!this.started || typeof window === "undefined") return;
    this.started = false;

    window.removeEventListener("focus", this.handleWindowFocus);
    document.removeEventListener("visibilitychange", this.handleVisibilityChange);
    window.removeEventListener("storage", this.handleStorageSync);
    window.removeEventListener(this.mockUpdatedEvent, this.handleMockDbUpdated);
    this.stopPolling();

    if (typeof this.unsubscribeDataMode === "function") {
      this.unsubscribeDataMode();
    }
    this.unsubscribeDataMode = null;
  }

  bindModeSpecificSync() {
    if (typeof window === "undefined") return;

    window.removeEventListener("storage", this.handleStorageSync);
    window.removeEventListener(this.mockUpdatedEvent, this.handleMockDbUpdated);
    this.stopPolling();

    if (DataModeSwitch.isNoDatabaseMode()) {
      window.addEventListener("storage", this.handleStorageSync);
      window.addEventListener(this.mockUpdatedEvent, this.handleMockDbUpdated);
      return;
    }

    this.startPolling();
  }

  startPolling() {
    if (typeof window === "undefined" || this.pollingTimerId) return;
    this.pollingTimerId = window.setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
      this.onRefresh();
    }, this.databasePollIntervalMs);
  }

  stopPolling() {
    if (typeof window === "undefined" || !this.pollingTimerId) return;
    window.clearInterval(this.pollingTimerId);
    this.pollingTimerId = null;
  }

  handleStorageSync = (event) => {
    if (event?.key && event.key !== this.mockStorageKey) return;
    this.onRefresh();
  };

  handleMockDbUpdated = (event) => {
    const storageKey = event?.detail?.storageKey;
    if (storageKey && storageKey !== this.mockStorageKey) return;
    this.onRefresh();
  };

  handleWindowFocus = () => {
    this.onRefresh();
  };

  handleVisibilityChange = () => {
    if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
    this.onRefresh();
  };

  handleDataModeChange = () => {
    this.bindModeSpecificSync();
    this.onRefresh();
  };
}
