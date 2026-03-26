const DATA_MODE_STORAGE_KEY = "myweb:data-mode";

export class DataModeSwitch {
  static DATABASE_MODE = "database";
  static NO_DATABASE_MODE = "no-database";
  static API_MODE = DataModeSwitch.DATABASE_MODE; // backward compatibility
  static MOCK_MODE = DataModeSwitch.NO_DATABASE_MODE; // backward compatibility
  static #listeners = new Set();

  static normalize(mode) {
    const normalized = `${mode ?? ""}`.trim().toLowerCase();

    if (
      [
        "mock",
        "no-db",
        "no_database",
        "nodb",
        "without-db",
        "without_database",
        DataModeSwitch.NO_DATABASE_MODE,
      ].includes(normalized)
    ) {
      return DataModeSwitch.NO_DATABASE_MODE;
    }

    return DataModeSwitch.DATABASE_MODE;
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
    return DataModeSwitch.isNoDatabaseMode();
  }

  static isDatabaseMode() {
    return DataModeSwitch.getMode() === DataModeSwitch.DATABASE_MODE;
  }

  static isNoDatabaseMode() {
    return DataModeSwitch.getMode() === DataModeSwitch.NO_DATABASE_MODE;
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
      DataModeSwitch.isNoDatabaseMode()
        ? DataModeSwitch.DATABASE_MODE
        : DataModeSwitch.NO_DATABASE_MODE,
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
