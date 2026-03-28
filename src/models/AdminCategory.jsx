const safeText = (value) => `${value ?? ""}`.trim();

export class AdminCategory {
  constructor({ id, name, description, productCount, createdAt, updatedAt } = {}) {
    this.id = id ?? "";
    this.name = name ?? "";
    this.description = description ?? "";
    this.productCount = Number(productCount) || 0;
    this.createdAt = createdAt ?? "";
    this.updatedAt = updatedAt ?? "";
  }

  static fromJSON(json) {
    return new AdminCategory({
      id: json?.id ?? json?._id,
      name: json?.name,
      description: json?.description,
      productCount: json?.productCount,
      createdAt: json?.createdAt,
      updatedAt: json?.updatedAt,
    });
  }

  validate() {
    if (!safeText(this.name)) return "กรุณากรอกชื่อหมวดหมู่";
    return "";
  }

  toPayload() {
    return {
      name: safeText(this.name),
      description: safeText(this.description),
    };
  }

  withPatch(patch = {}) {
    return new AdminCategory({
      ...this,
      ...patch,
    });
  }
}
