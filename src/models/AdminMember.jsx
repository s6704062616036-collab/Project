const safeText = (value) => `${value ?? ""}`.trim();
const toDigits = (value) => `${value ?? ""}`.replace(/\D+/g, "");
const ensureArray = (value) => (Array.isArray(value) ? value : value == null ? [] : [value]);

const getByPath = (source, path = []) =>
  ensureArray(path).reduce(
    (current, key) => (current && typeof current === "object" ? current[key] : undefined),
    source,
  );

const pickFirstDefined = (source, paths = []) => {
  for (const path of paths) {
    const value = getByPath(source, path);
    if (value !== undefined && value !== null) return value;
  }
  return undefined;
};

const toObject = (value) => (value && typeof value === "object" ? value : {});

const normalizeImageUrl = (value) => {
  if (typeof value === "string") return safeText(value);
  if (!value || typeof value !== "object") return "";

  return safeText(
    value.url ??
      value.imageUrl ??
      value.secure_url ??
      value.path ??
      value.location ??
      value.publicUrl ??
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

const formatDateTime = (value) => {
  const date = new Date(value ?? "");
  if (!safeText(value) || Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

export class AdminMember {
  constructor({
    id,
    name,
    email,
    phone,
    avatarUrl,
    username,
    role,
    kycStatus,
    banStatus,
    kycDocumentUrl,
    shopId,
    shopName,
    shopDescription,
    citizenId,
    kycCitizenId,
    kycQrCodeUrl,
    hasPendingKycSubmission,
    createdAt,
    reviewedAt,
    kycSubmittedAt,
    kycApprovedAt,
    moderationNote,
  } = {}) {
    this.id = id ?? "";
    this.name = name ?? "";
    this.email = email ?? "";
    this.phone = phone ?? "";
    this.avatarUrl = avatarUrl ?? "";
    this.username = username ?? "";
    this.role = role ?? "user";
    this.kycStatus = normalizeKycStatus(kycStatus);
    this.banStatus = banStatus ?? "active";
    this.kycDocumentUrl = kycDocumentUrl ?? "";
    this.shopId = shopId ?? "";
    this.shopName = shopName ?? "";
    this.shopDescription = shopDescription ?? "";
    this.citizenId = toDigits(citizenId).slice(0, 13);
    this.kycCitizenId = toDigits(kycCitizenId ?? citizenId).slice(0, 13);
    this.kycQrCodeUrl = kycQrCodeUrl ?? "";
    this.hasPendingKycSubmission = Boolean(hasPendingKycSubmission);
    this.createdAt = createdAt ?? "";
    this.reviewedAt = reviewedAt ?? "";
    this.kycSubmittedAt = kycSubmittedAt ?? "";
    this.kycApprovedAt = kycApprovedAt ?? "";
    this.moderationNote = moderationNote ?? "";
  }

  static fromJSON(json) {
    const source = toObject(json);
    const submissionPayload = toObject(
      pickFirstDefined(source, [
        ["pendingSubmission"],
        ["pendingKycSubmission"],
        ["kycSubmission"],
        ["submission"],
        ["review"],
        ["shop", "pendingSubmission"],
        ["shop", "pendingKycSubmission"],
        ["shop", "kycSubmission"],
        ["shopProfile", "pendingSubmission"],
        ["shopProfile", "pendingKycSubmission"],
        ["shopProfile", "kycSubmission"],
        ["merchant", "pendingSubmission"],
        ["merchant", "pendingKycSubmission"],
        ["merchant", "kycSubmission"],
      ]),
    );

    const effectiveKycStatus = normalizeKycStatus(
      pickFirstDefined(source, [
        ["kycStatus"],
        ["member", "kycStatus"],
        ["user", "kycStatus"],
        ["shop", "kycStatus"],
        ["shopProfile", "kycStatus"],
        ["merchant", "kycStatus"],
        ["pendingSubmission", "status"],
        ["pendingKycSubmission", "status"],
        ["kycSubmission", "status"],
        ["submission", "status"],
      ]),
    );

    const effectiveCitizenId = toDigits(
      pickFirstDefined(source, [
        ["kycCitizenId"],
        ["citizenId"],
        ["kycNationalId"],
        ["nationalId"],
        ["idCardNumber"],
        ["member", "citizenId"],
        ["user", "citizenId"],
        ["shop", "citizenId"],
        ["shopProfile", "citizenId"],
        ["merchant", "citizenId"],
        ["pendingSubmission", "citizenId"],
        ["pendingKycSubmission", "citizenId"],
        ["kycSubmission", "citizenId"],
        ["submission", "citizenId"],
      ]),
    ).slice(0, 13);

    const effectiveKycQrCodeUrl = normalizeImageUrl(
      pickFirstDefined(source, [
        ["kycQrCodeUrl"],
        ["kycDocumentUrl"],
        ["pendingSubmission", "parcelQrCodeUrl"],
        ["pendingSubmission", "qrCodeUrl"],
        ["pendingKycSubmission", "parcelQrCodeUrl"],
        ["pendingKycSubmission", "qrCodeUrl"],
        ["kycSubmission", "parcelQrCodeUrl"],
        ["kycSubmission", "qrCodeUrl"],
        ["submission", "parcelQrCodeUrl"],
        ["submission", "qrCodeUrl"],
        ["shop", "parcelQrCodeUrl"],
        ["shop", "qrCodeUrl"],
        ["shopProfile", "parcelQrCodeUrl"],
        ["shopProfile", "qrCodeUrl"],
        ["merchant", "parcelQrCodeUrl"],
        ["merchant", "qrCodeUrl"],
      ]),
    );

    const hasSubmissionPayload = Boolean(
      effectiveCitizenId ||
        effectiveKycQrCodeUrl ||
        safeText(submissionPayload.shopName) ||
        safeText(submissionPayload.description),
    );

    return new AdminMember({
      id: safeText(
        pickFirstDefined(source, [
          ["id"],
          ["_id"],
          ["memberId"],
          ["userId"],
          ["ownerId"],
          ["member", "id"],
          ["member", "_id"],
          ["user", "id"],
          ["user", "_id"],
        ]),
      ),
      name: safeText(
        pickFirstDefined(source, [
          ["name"],
          ["member", "name"],
          ["user", "name"],
        ]),
      ),
      email: safeText(
        pickFirstDefined(source, [
          ["email"],
          ["member", "email"],
          ["user", "email"],
        ]),
      ),
      phone: safeText(
        pickFirstDefined(source, [
          ["phone"],
          ["member", "phone"],
          ["user", "phone"],
        ]),
      ),
      avatarUrl: normalizeImageUrl(
        pickFirstDefined(source, [
          ["avatarUrl"],
          ["member", "avatarUrl"],
          ["user", "avatarUrl"],
        ]),
      ),
      username: safeText(
        pickFirstDefined(source, [
          ["username"],
          ["member", "username"],
          ["user", "username"],
        ]),
      ),
      role: safeText(
        pickFirstDefined(source, [
          ["role"],
          ["member", "role"],
          ["user", "role"],
        ]),
      ) || "user",
      kycStatus: effectiveKycStatus,
      banStatus: safeText(
        pickFirstDefined(source, [
          ["banStatus"],
          ["member", "banStatus"],
          ["user", "banStatus"],
        ]),
      ) || "active",
      kycDocumentUrl: effectiveKycQrCodeUrl,
      shopId: safeText(
        pickFirstDefined(source, [
          ["shopId"],
          ["shop", "id"],
          ["shop", "_id"],
          ["shopProfile", "id"],
          ["shopProfile", "_id"],
          ["merchant", "id"],
          ["merchant", "_id"],
        ]),
      ),
      shopName: safeText(
        pickFirstDefined(source, [
          ["shopName"],
          ["pendingSubmission", "shopName"],
          ["pendingKycSubmission", "shopName"],
          ["kycSubmission", "shopName"],
          ["submission", "shopName"],
          ["shop", "shopName"],
          ["shopProfile", "shopName"],
          ["merchant", "shopName"],
          ["shop", "name"],
          ["shopProfile", "name"],
          ["merchant", "name"],
        ]),
      ),
      shopDescription: safeText(
        pickFirstDefined(source, [
          ["shopDescription"],
          ["pendingSubmission", "description"],
          ["pendingKycSubmission", "description"],
          ["kycSubmission", "description"],
          ["submission", "description"],
          ["shop", "description"],
          ["shopProfile", "description"],
          ["merchant", "description"],
        ]),
      ),
      citizenId: toDigits(
        pickFirstDefined(source, [
          ["citizenId"],
          ["member", "citizenId"],
          ["user", "citizenId"],
          ["shop", "citizenId"],
          ["shopProfile", "citizenId"],
          ["merchant", "citizenId"],
        ]),
      ).slice(0, 13),
      kycCitizenId: effectiveCitizenId,
      kycQrCodeUrl: effectiveKycQrCodeUrl,
      hasPendingKycSubmission:
        Boolean(source.hasPendingKycSubmission) ||
        effectiveKycStatus === "pending" ||
        hasSubmissionPayload,
      createdAt: safeText(
        pickFirstDefined(source, [
          ["createdAt"],
          ["member", "createdAt"],
          ["user", "createdAt"],
        ]),
      ),
      reviewedAt: safeText(
        pickFirstDefined(source, [
          ["reviewedAt"],
          ["kycReviewedAt"],
          ["member", "reviewedAt"],
          ["user", "reviewedAt"],
          ["shop", "kycReviewedAt"],
          ["shopProfile", "kycReviewedAt"],
          ["merchant", "kycReviewedAt"],
          ["pendingSubmission", "reviewedAt"],
          ["pendingKycSubmission", "reviewedAt"],
          ["kycSubmission", "reviewedAt"],
          ["submission", "reviewedAt"],
        ]),
      ),
      kycSubmittedAt: safeText(
        pickFirstDefined(source, [
          ["kycSubmittedAt"],
          ["submittedAt"],
          ["shop", "kycSubmittedAt"],
          ["shopProfile", "kycSubmittedAt"],
          ["merchant", "kycSubmittedAt"],
          ["pendingSubmission", "submittedAt"],
          ["pendingKycSubmission", "submittedAt"],
          ["kycSubmission", "submittedAt"],
          ["submission", "submittedAt"],
        ]),
      ),
      kycApprovedAt: safeText(
        pickFirstDefined(source, [
          ["kycApprovedAt"],
          ["approvedAt"],
          ["shop", "kycApprovedAt"],
          ["shopProfile", "kycApprovedAt"],
          ["merchant", "kycApprovedAt"],
          ["pendingSubmission", "approvedAt"],
          ["pendingKycSubmission", "approvedAt"],
          ["kycSubmission", "approvedAt"],
          ["submission", "approvedAt"],
        ]),
      ),
      moderationNote: safeText(
        pickFirstDefined(source, [
          ["moderationNote"],
          ["note"],
          ["member", "moderationNote"],
          ["user", "moderationNote"],
          ["shop", "moderationNote"],
          ["shopProfile", "moderationNote"],
          ["merchant", "moderationNote"],
          ["pendingSubmission", "moderationNote"],
          ["pendingKycSubmission", "moderationNote"],
          ["kycSubmission", "moderationNote"],
          ["submission", "moderationNote"],
        ]),
      ),
    });
  }

  isPendingKyc() {
    return safeText(this.kycStatus) === "pending";
  }

  isApprovedKyc() {
    return safeText(this.kycStatus) === "approved";
  }

  isRejectedKyc() {
    return safeText(this.kycStatus) === "rejected";
  }

  isBanned() {
    return safeText(this.banStatus) === "banned";
  }

  hasApprovedKycHistory() {
    return Boolean(safeText(this.kycApprovedAt)) || this.isApprovedKyc();
  }

  hasKycEvidence() {
    return Boolean(this.getKycCitizenId()) || Boolean(this.getKycQrCodeUrl());
  }

  canApproveKyc() {
    if (this.hasPendingKycSubmission) return true;
    if (this.isApprovedKyc() || this.isRejectedKyc()) return false;
    return this.hasKycEvidence();
  }

  canRejectKyc() {
    if (this.hasPendingKycSubmission) return true;
    if (this.isApprovedKyc() || this.isRejectedKyc()) return false;
    return this.hasKycEvidence();
  }

  getJoinedAtLabel() {
    return formatDateTime(this.createdAt);
  }

  getReviewedAtLabel() {
    return formatDateTime(this.reviewedAt);
  }

  getSubmittedAtLabel() {
    return formatDateTime(this.kycSubmittedAt);
  }

  getKycCitizenId() {
    return this.kycCitizenId || this.citizenId || "";
  }

  getKycQrCodeUrl() {
    return this.kycQrCodeUrl || this.kycDocumentUrl || "";
  }

  getKycStatusLabel() {
    switch (safeText(this.kycStatus)) {
      case "approved":
        return "อนุมัติแล้ว";
      case "rejected":
        return "ถูกปฏิเสธ";
      case "pending":
        return "รออนุมัติ";
      default:
        return "ยังไม่ส่งตรวจ";
    }
  }

  getBanStatusLabel() {
    return this.isBanned() ? "ถูกระงับบัญชี" : "ใช้งานได้";
  }
}
