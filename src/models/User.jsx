export class User {
  constructor({ id, name, email, avatarUrl, phone, address, username, role, kycStatus, banStatus, createdAt } = {}) {
    this.id = id ?? "";
    this.name = name ?? "";
    this.email = email ?? "";
    this.avatarUrl = avatarUrl ?? "";
    this.phone = phone ?? "";
    this.address = address ?? "";
    this.username = username ?? "";
    this.role = role ?? "user";
    this.kycStatus = kycStatus ?? "";
    this.banStatus = banStatus ?? "active";
    this.createdAt = createdAt ?? "";
  }

  static fromJSON(json) {
    return new User({
      id: json.id ?? json._id,
      name: json.name,
      email: json.email,
      avatarUrl: json.avatarUrl,
      phone: json.phone,
      address: json.address,
      username: json.username,
      role: json.role,
      kycStatus: json.kycStatus,
      banStatus: json.banStatus,
      createdAt: json.createdAt,
    });
  }

  toEditablePayload() {
    return {
      name: this.name,
      email: this.email,
      phone: this.phone,
      address: this.address,
    };
  }

  withEditablePatch(patch = {}) {
    return new User({
      ...this,
      ...patch,
    });
  }

  isAdmin() {
    return `${this.role ?? ""}`.trim().toLowerCase() === "admin";
  }

  isBanned() {
    return `${this.banStatus ?? ""}`.trim().toLowerCase() === "banned";
  }
}
