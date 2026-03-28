const safeText = (value) => `${value ?? ""}`.trim();
const toDigits = (value) => `${value ?? ""}`.replace(/\D+/g, "");

const normalizeImageUrl = (value) => {
  if (typeof value === "string") return safeText(value);
  if (!value || typeof value !== "object") return "";

  return safeText(
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

const normalizePendingSubmission = (input = {}) => {
  if (!input || typeof input !== "object") return null;

  const submission = {
    shopName: safeText(input.shopName),
    description: safeText(input.description),
    citizenId: toDigits(input.citizenId).slice(0, 13),
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
    citizenId,
    avatarUrl,
    parcelQrCodeUrl,
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
    this.citizenId = ShopProfile.normalizeCitizenId(citizenId);
    this.avatarUrl = avatarUrl ?? "";
    this.parcelQrCodeUrl = parcelQrCodeUrl ?? "";
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
      citizenId: json?.citizenId,
      avatarUrl: json?.avatarUrl,
      parcelQrCodeUrl:
        json?.parcelQrCodeUrl ?? json?.paymentQrCodeUrl ?? json?.parcelPaymentQrCodeUrl ?? json?.qrCodeUrl,
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
      parcelQrCodeUrl: this.pendingSubmission.parcelQrCodeUrl ?? "",
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
      avatarUrl: this.avatarUrl,
      parcelQrCodeUrl: this.parcelQrCodeUrl,
    };
  }
}
