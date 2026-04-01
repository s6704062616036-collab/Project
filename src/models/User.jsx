import { composeStructuredAddress } from "../utils/addressFormatter";

const safeText = (value) => `${value ?? ""}`.trim();
const apiBaseUrl = `${import.meta.env.VITE_API_URL ?? ""}`.trim().replace(/\/+$/, "");

const normalizeSavedAddress = (entry, index = 0, fallback = {}) => {
  if (!entry || typeof entry !== "object") return null;

  const houseNo = safeText(entry.houseNo);
  const village = safeText(entry.village);
  const district = safeText(entry.district);
  const province = safeText(entry.province);
  const postalCode = safeText(entry.postalCode);
  const note = safeText(entry.note);
  const address =
    composeStructuredAddress({ houseNo, village, district, province, postalCode, note }) ||
    safeText(entry.address);
  if (!address) return null;

  return {
    id: safeText(entry.id) || `address-${index + 1}`,
    label: safeText(entry.label) || `ที่อยู่ ${index + 1}`,
    recipientName: safeText(entry.recipientName ?? entry.name ?? fallback.name),
    phone: safeText(entry.phone ?? fallback.phone),
    houseNo,
    village,
    district,
    province,
    postalCode,
    note,
    address,
    isDefault: Boolean(entry.isDefault),
  };
};

const toAbsoluteApiUrl = (value) => {
  const normalizedValue = safeText(value).replace(/\\/g, "/");
  if (!normalizedValue) return "";
  if (/^(?:https?:)?\/\//i.test(normalizedValue)) return normalizedValue;
  if (normalizedValue.startsWith("blob:") || normalizedValue.startsWith("data:")) return normalizedValue;
  if (normalizedValue.startsWith("/uploads/")) {
    return apiBaseUrl && apiBaseUrl !== "/api" ? `${apiBaseUrl}${normalizedValue}` : normalizedValue;
  }
  if (normalizedValue.startsWith("uploads/")) {
    return apiBaseUrl && apiBaseUrl !== "/api" ? `${apiBaseUrl}/${normalizedValue}` : `/${normalizedValue}`;
  }
  if (normalizedValue.startsWith("/")) return apiBaseUrl ? `${apiBaseUrl}${normalizedValue}` : normalizedValue;
  return normalizedValue;
};

export class User {
  constructor({ id, name, email, avatarUrl, phone, address, addresses, username, role, kycStatus, banStatus, createdAt } = {}) {
    this.id = id ?? "";
    this.name = name ?? "";
    this.email = email ?? "";
    this.avatarUrl = toAbsoluteApiUrl(avatarUrl);
    this.phone = phone ?? "";
    this.address = address ?? "";
    const normalizedAddresses = (Array.isArray(addresses) ? addresses : [])
      .map((entry, index) => normalizeSavedAddress(entry, index, { name: this.name, phone: this.phone }))
      .filter(Boolean)
      .slice(0, 5);
    const fallbackAddress = safeText(address);
    if (!normalizedAddresses.length && fallbackAddress) {
      normalizedAddresses.push({
        id: "address-1",
        label: "ที่อยู่หลัก",
        recipientName: safeText(this.name),
        phone: safeText(this.phone),
        houseNo: "",
        village: "",
        district: "",
        province: "",
        postalCode: "",
        note: "",
        address: fallbackAddress,
        isDefault: true,
      });
    }
    const defaultIndex = normalizedAddresses.findIndex((entry) => entry.isDefault);
    if (normalizedAddresses.length) {
      normalizedAddresses.forEach((entry, index) => {
        entry.isDefault = index === (defaultIndex >= 0 ? defaultIndex : 0);
      });
    }
    this.addresses = normalizedAddresses;
    this.address =
      this.addresses.find((entry) => entry.isDefault)?.address ||
      this.addresses[0]?.address ||
      fallbackAddress;
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
      addresses: json.addresses,
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
      addresses: this.addresses.map((entry, index) => ({
        id: safeText(entry.id) || `address-${index + 1}`,
        label: safeText(entry.label),
        recipientName: safeText(entry.recipientName),
        phone: safeText(entry.phone),
        houseNo: safeText(entry.houseNo),
        village: safeText(entry.village),
        district: safeText(entry.district),
        province: safeText(entry.province),
        postalCode: safeText(entry.postalCode),
        note: safeText(entry.note),
        address: safeText(entry.address),
        isDefault: Boolean(entry.isDefault),
      })),
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

  getContactEmail() {
    return `${this.email ?? ""}`.trim();
  }

  getContactPhone() {
    return `${this.phone ?? ""}`.trim();
  }
}
