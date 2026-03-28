import { ParcelPaymentMethod } from "./ParcelPaymentMethod";

const safeText = (value) => `${value ?? ""}`.trim();
const ensureArray = (value) => (Array.isArray(value) ? value : value == null ? [] : [value]);
const isObject = (value) => Boolean(value && typeof value === "object" && !Array.isArray(value));

const getByPath = (source, path = []) =>
  ensureArray(path).reduce(
    (current, key) => (current && typeof current === "object" ? current[key] : undefined),
    source,
  );

const pickFirstDefined = (source, paths = []) => {
  for (const path of paths) {
    const value = getByPath(source, path);
    if (value !== undefined && value !== null && safeText(value)) {
      return value;
    }
  }
  return undefined;
};

const pickDefinedValues = (source, paths = []) => {
  const values = [];
  const seen = new Set();

  paths.forEach((path) => {
    const value = getByPath(source, path);
    const normalizedValue = safeText(value);
    if (!normalizedValue || seen.has(normalizedValue)) return;
    seen.add(normalizedValue);
    values.push(value);
  });

  return values;
};

const PAYMENT_OBJECT_PATHS = [
  ["parcelPayment"],
  ["payment"],
  ["paymentVerification"],
  ["paymentReview"],
  ["proofOfPayment"],
  ["receipt"],
];

const PARCEL_STATUS_PATHS = [
  ["parcelPayment", "status"],
  ["payment", "status"],
  ["paymentVerification", "status"],
  ["paymentReview", "status"],
  ["proofOfPayment", "status"],
  ["receipt", "status"],
  ["parcelPaymentStatus"],
  ["paymentStatus"],
  ["reviewStatus"],
  ["verificationStatus"],
  ["paymentVerificationStatus"],
  ["receiptStatus"],
  ["status"],
];

const PARCEL_HINT_STATUS_PATHS = PARCEL_STATUS_PATHS.filter((path) => path.join(".") !== "status");

const RECEIPT_IMAGE_PATHS = [
  ["receiptImageUrl"],
  ["receiptUrl"],
  ["receiptImage"],
  ["slipImageUrl"],
  ["slipUrl"],
  ["slipImage"],
  ["paymentSlipUrl"],
  ["proofOfPaymentUrl"],
  ["proofImageUrl"],
  ["paymentProofUrl"],
  ["parcelPayment", "receiptImageUrl"],
  ["parcelPayment", "receiptUrl"],
  ["parcelPayment", "receiptImage"],
  ["parcelPayment", "slipImageUrl"],
  ["parcelPayment", "slipUrl"],
  ["parcelPayment", "slipImage"],
  ["parcelPayment", "paymentSlipUrl"],
  ["parcelPayment", "proofOfPaymentUrl"],
  ["parcelPayment", "proofImageUrl"],
  ["parcelPayment", "imageUrl"],
  ["parcelPayment", "image"],
  ["payment", "receiptImageUrl"],
  ["payment", "receiptUrl"],
  ["payment", "receiptImage"],
  ["payment", "slipImageUrl"],
  ["payment", "slipUrl"],
  ["payment", "slipImage"],
  ["payment", "paymentSlipUrl"],
  ["payment", "proofOfPaymentUrl"],
  ["payment", "proofImageUrl"],
  ["payment", "imageUrl"],
  ["payment", "image"],
  ["paymentVerification", "receiptImageUrl"],
  ["paymentVerification", "receiptUrl"],
  ["paymentVerification", "slipImageUrl"],
  ["paymentVerification", "slipUrl"],
  ["paymentVerification", "proofOfPaymentUrl"],
  ["paymentVerification", "imageUrl"],
  ["proofOfPayment", "url"],
  ["proofOfPayment", "imageUrl"],
  ["proofOfPayment", "image"],
  ["receipt", "url"],
  ["receipt", "imageUrl"],
  ["receipt", "image"],
];

const QR_CODE_PATHS = [
  ["qrCodeUrl"],
  ["paymentQrCodeUrl"],
  ["parcelQrCodeUrl"],
  ["qrUrl"],
  ["parcelPayment", "qrCodeUrl"],
  ["parcelPayment", "paymentQrCodeUrl"],
  ["parcelPayment", "parcelQrCodeUrl"],
  ["payment", "qrCodeUrl"],
  ["payment", "paymentQrCodeUrl"],
  ["payment", "parcelQrCodeUrl"],
  ["paymentVerification", "qrCodeUrl"],
];

const PAYMENT_METHOD_PATHS = [
  ["paymentMethod"],
  ["parcelPaymentMethod"],
  ["payment", "paymentMethod"],
  ["payment", "method"],
  ["parcelPayment", "paymentMethod"],
  ["parcelPayment", "method"],
  ["paymentVerification", "paymentMethod"],
  ["paymentVerification", "method"],
];

const SUBMITTED_AT_PATHS = [
  ["submittedAt"],
  ["uploadedAt"],
  ["paidAt"],
  ["parcelPayment", "submittedAt"],
  ["parcelPayment", "uploadedAt"],
  ["parcelPayment", "paidAt"],
  ["payment", "submittedAt"],
  ["payment", "uploadedAt"],
  ["payment", "paidAt"],
  ["paymentVerification", "submittedAt"],
  ["paymentVerification", "uploadedAt"],
];

const VERIFIED_AT_PATHS = [
  ["verifiedAt"],
  ["reviewedAt"],
  ["approvedAt"],
  ["decisionAt"],
  ["parcelPayment", "verifiedAt"],
  ["parcelPayment", "reviewedAt"],
  ["parcelPayment", "approvedAt"],
  ["payment", "verifiedAt"],
  ["payment", "reviewedAt"],
  ["payment", "approvedAt"],
  ["paymentVerification", "verifiedAt"],
  ["paymentVerification", "reviewedAt"],
];

const VERIFIED_BY_PATHS = [
  ["verifiedBy"],
  ["reviewedBy"],
  ["approvedBy"],
  ["parcelPayment", "verifiedBy"],
  ["parcelPayment", "reviewedBy"],
  ["parcelPayment", "approvedBy"],
  ["payment", "verifiedBy"],
  ["payment", "reviewedBy"],
  ["payment", "approvedBy"],
  ["paymentVerification", "verifiedBy"],
  ["paymentVerification", "reviewedBy"],
];

const SHIPPING_METHOD_PATHS = [
  ["shippingMethod"],
  ["deliveryMethod"],
  ["shippingType"],
];

export class ParcelPaymentRecord {
  constructor({
    qrCodeUrl,
    receiptImageUrl,
    status,
    submittedAt,
    verifiedAt,
    verifiedBy,
    paymentMethod,
  } = {}) {
    this.qrCodeUrl = safeText(qrCodeUrl);
    this.receiptImageUrl = safeText(receiptImageUrl);
    this.status = safeText(status);
    this.submittedAt = safeText(submittedAt);
    this.verifiedAt = safeText(verifiedAt);
    this.verifiedBy = safeText(verifiedBy);
    this.paymentMethod = safeText(paymentMethod)
      ? ParcelPaymentMethod.normalize(paymentMethod)
      : "";
  }

  static normalizeStatus(value) {
    const normalized = safeText(value).toLowerCase();

    if (
      [
        "approved",
        "verified",
        "confirmed",
        "payment_verified",
        "receipt_verified",
        "ready_to_ship",
        "awaiting_shipment",
        "awaiting_parcel_pickup",
      ].includes(normalized)
    ) {
      return "awaiting_parcel_pickup";
    }

    if (
      [
        "pending",
        "submitted",
        "uploaded",
        "under_review",
        "pending_review",
        "pending_verification",
        "waiting_verification",
        "waiting_payment_verification",
        "pending_payment_verification",
        "pending_seller_confirmation",
      ].includes(normalized)
    ) {
      return "pending_payment_verification";
    }

    if (
      [
        "reported",
        "flagged",
        "fraud_reported",
        "fake_receipt_reported",
        "reported_to_admin",
      ].includes(normalized)
    ) {
      return "reported_to_admin";
    }

    if (["cancelled", "canceled", "cancel"].includes(normalized)) {
      return "cancelled";
    }

    if (["completed", "delivered"].includes(normalized)) {
      return "completed";
    }

    if (["rejected_by_buyer", "buyer_rejected"].includes(normalized)) {
      return "rejected_by_buyer";
    }

    return normalized;
  }

  static resolveWorkflowStatus(values = []) {
    const normalizedStatuses = ensureArray(values)
      .flatMap((value) => ensureArray(value))
      .map((value) => ParcelPaymentRecord.normalizeStatus(value))
      .filter(Boolean);

    if (!normalizedStatuses.length) return "";
    if (normalizedStatuses.includes("reported_to_admin")) return "reported_to_admin";
    if (normalizedStatuses.includes("rejected_by_buyer")) return "rejected_by_buyer";
    if (normalizedStatuses.includes("cancelled")) return "cancelled";
    if (normalizedStatuses.includes("completed")) return "completed";
    if (normalizedStatuses.includes("awaiting_parcel_pickup")) return "awaiting_parcel_pickup";
    if (normalizedStatuses.includes("pending_payment_verification")) return "pending_payment_verification";
    return normalizedStatuses[0];
  }

  static looksLikeParcelPayload(json) {
    const source = isObject(json) ? json : {};
    const shippingMethod = safeText(pickFirstDefined(source, SHIPPING_METHOD_PATHS)).toLowerCase();

    return (
      shippingMethod === "parcel" ||
      Boolean(pickFirstDefined(source, RECEIPT_IMAGE_PATHS)) ||
      Boolean(pickFirstDefined(source, QR_CODE_PATHS)) ||
      Boolean(pickFirstDefined(source, PAYMENT_METHOD_PATHS)) ||
      Boolean(pickDefinedValues(source, PARCEL_HINT_STATUS_PATHS).length) ||
      Boolean(pickFirstDefined(source, PAYMENT_OBJECT_PATHS))
    );
  }

  static fromJSON(json) {
    const source = isObject(json) ? json : {};
    if (!ParcelPaymentRecord.looksLikeParcelPayload(source)) {
      return null;
    }

    const record = new ParcelPaymentRecord({
      qrCodeUrl: pickFirstDefined(source, QR_CODE_PATHS),
      receiptImageUrl: pickFirstDefined(source, RECEIPT_IMAGE_PATHS),
      paymentMethod: pickFirstDefined(source, PAYMENT_METHOD_PATHS),
      status: ParcelPaymentRecord.resolveWorkflowStatus(
        pickDefinedValues(source, PARCEL_STATUS_PATHS),
      ),
      submittedAt: pickFirstDefined(source, SUBMITTED_AT_PATHS),
      verifiedAt: pickFirstDefined(source, VERIFIED_AT_PATHS),
      verifiedBy: pickFirstDefined(source, VERIFIED_BY_PATHS),
    });

    return record.hasAnyData() ? record : null;
  }

  hasReceipt() {
    return Boolean(this.receiptImageUrl);
  }

  getPaymentMethod() {
    return this.paymentMethod
      ? ParcelPaymentMethod.normalize(this.paymentMethod)
      : ParcelPaymentMethod.QR_CODE;
  }

  isCashOnDelivery() {
    return ParcelPaymentMethod.isCashOnDelivery(this.getPaymentMethod());
  }

  requiresReceipt() {
    return ParcelPaymentMethod.requiresReceipt(this.getPaymentMethod());
  }

  requiresSellerQrCode() {
    return ParcelPaymentMethod.requiresSellerQrCode(this.getPaymentMethod());
  }

  getPaymentMethodLabel() {
    return ParcelPaymentMethod.getLabel(this.getPaymentMethod());
  }

  getPendingReviewLabel() {
    return this.requiresReceipt() ? "รอตรวจสอบสลิป" : "รอตรวจสอบคำสั่งซื้อ";
  }

  hasAnyData() {
    return Boolean(
      this.qrCodeUrl ||
        this.receiptImageUrl ||
        this.paymentMethod ||
        this.status ||
        this.submittedAt ||
        this.verifiedAt ||
        this.verifiedBy,
    );
  }
}
