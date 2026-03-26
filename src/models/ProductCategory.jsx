export class ProductCategory {
  static ALL = "__all__";

  static #categories = [
    "ของเล่น",
    "หนังสือ",
    "เครื่องใช้ไฟฟ้า",
    "เฟอร์นิเจอร์",
    "เครื่องประดับ",
    "คอมพิวเตอร์",
    "อะไหล่รถยนต์",
    "อื่นๆ",
  ];

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
    return ProductCategory.#categories.includes(category);
  }

  static normalize(category) {
    if (ProductCategory.isValid(category)) return category;
    return "";
  }

  static getLabel(category) {
    if (ProductCategory.isAll(category)) return "ทั้งหมด";
    if (ProductCategory.isValid(category)) return category;
    return "ไม่ระบุหมวดหมู่";
  }
}
