export class ProductCategory {
  static ALL = "__all__";

  static #defaultCategories = [
    "ของเล่น",
    "หนังสือ",
    "เครื่องใช้ไฟฟ้า",
    "เฟอร์นิเจอร์",
    "เครื่องประดับ",
    "คอมพิวเตอร์",
    "อะไหล่รถยนต์",
    "อื่นๆ",
  ];

  static #categories = [...ProductCategory.#defaultCategories];

  static normalize(category) {
    return `${category ?? ""}`.trim();
  }

  static defaultList() {
    return [...ProductCategory.#defaultCategories];
  }

  static setAvailableCategories(categories = []) {
    const normalized = [...new Set(
      (Array.isArray(categories) ? categories : [])
        .map((category) => ProductCategory.normalize(category))
        .filter(Boolean),
    )];

    ProductCategory.#categories = normalized.length
      ? normalized
      : [...ProductCategory.#defaultCategories];

    return ProductCategory.list();
  }

  static hydrateFromRecords(records = []) {
    return ProductCategory.setAvailableCategories(
      (Array.isArray(records) ? records : []).map((record) =>
        typeof record === "string" ? record : record?.name,
      ),
    );
  }

  static list() {
    return [...ProductCategory.#categories];
  }

  static listWithAll() {
    return [ProductCategory.ALL, ...ProductCategory.list()];
  }

  static isAll(category) {
    return category === ProductCategory.ALL;
  }

  static isValid(category) {
    const normalized = ProductCategory.normalize(category);
    return Boolean(normalized) && ProductCategory.#categories.includes(normalized);
  }

  static getLabel(category) {
    if (ProductCategory.isAll(category)) return "ทั้งหมด";
    const normalized = ProductCategory.normalize(category);
    if (normalized) return normalized;
    return "ไม่ระบุหมวดหมู่";
  }
}
