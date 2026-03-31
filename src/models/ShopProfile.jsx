const safeText = (value) => `${value ?? ""}`.trim();
const toDigits = (value) => `${value ?? ""}`.replace(/\D+/g, "");
const apiBaseUrl = `${import.meta.env.VITE_API_URL ?? ""}`.trim().replace(/\/+$/, "");

const toAbsoluteApiUrl = (value) => {
  const normalizedValue = safeText(value);
  if (!normalizedValue) return "";
  if (/^(?:https?:)?\/\//i.test(normalizedValue)) return normalizedValue;
  if (normalizedValue.startsWith("blob:") || normalizedValue.startsWith("data:")) return normalizedValue;
  if (normalizedValue.startsWith("/")) return apiBaseUrl ? `${apiBaseUrl}${normalizedValue}` : normalizedValue;
  return normalizedValue;
};

const normalizeImageUrl = (value) => {
  if (typeof value === "string") return toAbsoluteApiUrl(value);
  if (!value || typeof value !== "object") return "";

  return toAbsoluteApiUrl(
    value.url ??
      value.imageUrl ??
      value.secure_url ??
      value.path ??
      value.name,
  );
};

const normalizeKycStatus = (value) => {
  switch (safeText(value)) {
    case "approved":
    case "pending":
    case "rejected":
      return safeText(value);
    default:
      return "unsubmitted";
  }
};

const normalizeBirthDate = (value) => {
  const normalizedValue = safeText(value);
  if (!normalizedValue) return "";
  return /^\d{4}-\d{2}-\d{2}$/.test(normalizedValue) ? normalizedValue : "";
};

const normalizePendingSubmission = (input = {}) => {
  if (!input || typeof input !== "object") return null;

  const submission = {
    shopName: safeText(input.shopName),
    description: safeText(input.description),
    citizenId: toDigits(input.citizenId).slice(0, 13),
    birthDate: normalizeBirthDate(input.birthDate),
    parcelQrCodeUrl: normalizeImageUrl(
      input.parcelQrCodeUrl ??
        input.paymentQrCodeUrl ??
        input.parcelPaymentQrCodeUrl ??
        input.qrCodeUrl,
    ),
    submittedAt: safeText(input.submittedAt),
  };

  return Object.values(submission).some(Boolean) ? submission : null;
};

export class ShopProfile {
  constructor({
    id,
    ownerId,
    shopName,
    description,
    email,
    phone,
    citizenId,
    birthDate,
    avatarUrl,
    parcelQrCodeUrl,
    bankName,
    bankAccountName,
    bankAccountNumber,
    availableProductsCount,
    soldProductsCount,
    kycStatus,
    kycSubmittedAt,
    kycReviewedAt,
    kycApprovedAt,
    moderationNote,
    pendingSubmission,
  } = {}) {
    this.id = id ?? "";
    this.ownerId = ownerId ?? "";
    this.shopName = shopName ?? "";
    this.description = description ?? "";
    this.email = email ?? "";
    this.phone = phone ?? "";
    this.citizenId = ShopProfile.normalizeCitizenId(citizenId);
    this.birthDate = normalizeBirthDate(birthDate);
    this.avatarUrl = normalizeImageUrl(avatarUrl);
    this.parcelQrCodeUrl = normalizeImageUrl(parcelQrCodeUrl);
    this.bankName = `${bankName ?? ""}`;
    this.bankAccountName = `${bankAccountName ?? ""}`;
    this.bankAccountNumber = toDigits(bankAccountNumber).slice(0, 20);
    this.availableProductsCount = Number.isFinite(Number(availableProductsCount)) ? Number(availableProductsCount) : 0;
    this.soldProductsCount = Number.isFinite(Number(soldProductsCount)) ? Number(soldProductsCount) : 0;
    this.kycStatus = normalizeKycStatus(kycStatus);
    this.kycSubmittedAt = kycSubmittedAt ?? "";
    this.kycReviewedAt = kycReviewedAt ?? "";
    this.kycApprovedAt = kycApprovedAt ?? "";
    this.moderationNote = moderationNote ?? "";
    this.pendingSubmission = pendingSubmission ?? null;
  }

  static normalizeCitizenId(value) {
    return toDigits(value).slice(0, 13);
  }

  static fromJSON(json) {
    return new ShopProfile({
      id: json?.id ?? json?._id,
      ownerId: json?.ownerId ?? json?.sellerId ?? json?.userId,
      shopName: json?.shopName ?? json?.name,
      description: json?.description ?? json?.bio,
      email: json?.email,
      phone: json?.phone,
      citizenId: json?.citizenId,
      birthDate: json?.birthDate,
      avatarUrl: json?.avatarUrl,
      parcelQrCodeUrl:
        json?.parcelQrCodeUrl ?? json?.paymentQrCodeUrl ?? json?.parcelPaymentQrCodeUrl ?? json?.qrCodeUrl,
      bankName: json?.bankName,
      bankAccountName: json?.bankAccountName,
      bankAccountNumber: json?.bankAccountNumber,
      availableProductsCount: json?.availableProductsCount,
      soldProductsCount: json?.soldProductsCount,
      kycStatus: json?.kycStatus,
      kycSubmittedAt: json?.kycSubmittedAt,
      kycReviewedAt: json?.kycReviewedAt ?? json?.reviewedAt,
      kycApprovedAt: json?.kycApprovedAt ?? json?.approvedAt,
      moderationNote: json?.moderationNote ?? json?.note,
      pendingSubmission: normalizePendingSubmission(
        json?.pendingSubmission ?? json?.pendingKycSubmission ?? json?.kycSubmission,
      ),
    });
  }

  static empty() {
    return new ShopProfile();
  }

  withPatch(patch = {}) {
    return new ShopProfile({
      ...this,
      ...patch,
      citizenId:
        patch && Object.prototype.hasOwnProperty.call(patch, "citizenId")
          ? patch.citizenId
          : this.citizenId,
      birthDate:
        patch && Object.prototype.hasOwnProperty.call(patch, "birthDate")
          ? patch.birthDate
          : this.birthDate,
      pendingSubmission:
        patch && Object.prototype.hasOwnProperty.call(patch, "pendingSubmission")
          ? normalizePendingSubmission(patch.pendingSubmission)
          : this.pendingSubmission,
    });
  }

  hasParcelQrCode() {
    return Boolean(safeText(this.parcelQrCodeUrl));
  }

  hasPendingSubmission() {
    return Boolean(this.pendingSubmission);
  }

  isPendingKyc() {
    return this.kycStatus === "pending";
  }

  isApprovedKyc() {
    return this.kycStatus === "approved";
  }

  isRejectedKyc() {
    return this.kycStatus === "rejected";
  }

  hasApprovedKycHistory() {
    return Boolean(safeText(this.kycApprovedAt)) || this.isApprovedKyc();
  }

  isCitizenIdLocked() {
    return Boolean(this.citizenId) && this.hasApprovedKycHistory();
  }

  getDisplayName() {
    return safeText(this.shopName) || "ร้านค้าผู้ขาย";
  }

  canDirectSave({ hasNewQrFile = false } = {}) {
    return this.hasApprovedKycHistory() && !this.hasPendingSubmission() && !hasNewQrFile;
  }

  getKycStatusLabel() {
    switch (this.kycStatus) {
      case "approved":
        return "อนุมัติแล้ว";
      case "pending":
        return "รออนุมัติ";
      case "rejected":
        return "ถูกปฏิเสธ";
      default:
        return "ยังไม่ส่งตรวจ";
    }
  }

  getVisibleParcelQrCodeUrl() {
    return safeText(this.pendingSubmission?.parcelQrCodeUrl) || safeText(this.parcelQrCodeUrl);
  }

  toEditableDraft() {
    if (!this.pendingSubmission) {
      return new ShopProfile({
        ...this,
        pendingSubmission: this.pendingSubmission,
      });
    }

    return new ShopProfile({
      ...this,
      shopName: this.pendingSubmission.shopName ?? "",
      description: this.pendingSubmission.description ?? "",
      citizenId: this.pendingSubmission.citizenId ?? "",
      birthDate: this.pendingSubmission.birthDate ?? this.birthDate ?? "",
      parcelQrCodeUrl: this.pendingSubmission.parcelQrCodeUrl ?? "",
      bankName: safeText(this.bankName),
      bankAccountName: safeText(this.bankAccountName),
      bankAccountNumber: this.bankAccountNumber,
      pendingSubmission: this.pendingSubmission,
    });
  }

  validate({ requireQrCode = false, hasQrFile = false } = {}) {
    if (!safeText(this.shopName)) return "กรุณากรอกชื่อร้าน";

    const normalizedCitizenId = ShopProfile.normalizeCitizenId(this.citizenId);
    if (normalizedCitizenId.length !== 13) {
      return "กรุณากรอกเลขบัตรประชาชนให้ครบ 13 หลัก";
    }

    if (requireQrCode && !hasQrFile && !safeText(this.getVisibleParcelQrCodeUrl())) {
      return "กรุณาอัปโหลด QR code ร้านก่อนส่งตรวจสอบ";
    }

    return "";
  }

  toPayload() {
    return {
      shopName: this.shopName,
      description: this.description,
      citizenId: this.citizenId,
      birthDate: this.birthDate,
      avatarUrl: this.avatarUrl,
      parcelQrCodeUrl: this.parcelQrCodeUrl,
      bankName: this.bankName,
      bankAccountName: this.bankAccountName,
      bankAccountNumber: this.bankAccountNumber,
    };
  }
}
