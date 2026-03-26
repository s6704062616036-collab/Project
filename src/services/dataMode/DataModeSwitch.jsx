const DATA_MODE_STORAGE_KEY = "myweb:data-mode";

export class DataModeSwitch {
  static API_MODE = "api";
  static MOCK_MODE = "mock";
  static #listeners = new Set();

  static normalize(mode) {
    return mode === DataModeSwitch.MOCK_MODE
      ? DataModeSwitch.MOCK_MODE
      : DataModeSwitch.API_MODE;
  }

  static getDefaultMode() {
    return DataModeSwitch.normalize(import.meta.env.VITE_DATA_MODE);
  }

  static getMode() {
    if (typeof window === "undefined") return DataModeSwitch.getDefaultMode();
    const persisted = window.localStorage.getItem(DATA_MODE_STORAGE_KEY);
    return DataModeSwitch.normalize(persisted ?? DataModeSwitch.getDefaultMode());
  }

  static isMockMode() {
    return DataModeSwitch.getMode() === DataModeSwitch.MOCK_MODE;
  }

  static setMode(mode) {
    const nextMode = DataModeSwitch.normalize(mode);

    if (typeof window !== "undefined") {
      window.localStorage.setItem(DATA_MODE_STORAGE_KEY, nextMode);
    }

    DataModeSwitch.#listeners.forEach((listener) => {
      try {
        listener(nextMode);
      } catch {
        // no-op
      }
    });

    return nextMode;
  }

  static toggle() {
    return DataModeSwitch.setMode(
      DataModeSwitch.isMockMode() ? DataModeSwitch.API_MODE : DataModeSwitch.MOCK_MODE,
    );
  }

  static subscribe(listener) {
    if (typeof listener !== "function") return () => {};

    DataModeSwitch.#listeners.add(listener);
    return () => {
      DataModeSwitch.#listeners.delete(listener);
    };
  }
}
