const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    name: {
      type: String,
      default: "",
      trim: true,
    },
    imageUrl: {
      type: String,
      default: "",
    },
    price: {
      type: Number,
      default: 0,
    },
    quantity: {
      type: Number,
      default: 1,
      min: 1,
    },
  },
  { _id: true }
);

const meetupProposalSchema = new mongoose.Schema(
  {
    location: { type: String, default: "", trim: true },
    status: { type: String, default: "", trim: true },
    proposedBy: { type: String, default: "", trim: true },
    proposedAt: { type: String, default: "" },
    responseLocation: { type: String, default: "", trim: true },
    respondedBy: { type: String, default: "", trim: true },
    respondedAt: { type: String, default: "" },
  },
  { _id: false }
);

const parcelPaymentSchema = new mongoose.Schema(
  {
    qrCodeUrl: { type: String, default: "" },
    bankName: { type: String, default: "", trim: true },
    bankAccountName: { type: String, default: "", trim: true },
    bankAccountNumber: { type: String, default: "", trim: true },
    receiptImageUrl: { type: String, default: "" },
    paymentMethod: { type: String, default: "" },
    status: { type: String, default: "" },
    submittedAt: { type: String, default: "" },
    verifiedAt: { type: String, default: "" },
    verifiedBy: { type: String, default: "" },
  },
  { _id: false }
);

const parcelShipmentSchema = new mongoose.Schema(
  {
    trackingNumber: { type: String, default: "", trim: true },
    carrier: { type: String, default: "", trim: true },
    status: { type: String, default: "", trim: true },
    note: { type: String, default: "", trim: true },
    preparedAt: { type: String, default: "" },
    shippedAt: { type: String, default: "" },
    updatedAt: { type: String, default: "" },
  },
  { _id: false }
);

const buyerShippingAddressSchema = new mongoose.Schema(
  {
    addressId: { type: String, default: "", trim: true },
    label: { type: String, default: "", trim: true },
    name: { type: String, default: "", trim: true },
    phone: { type: String, default: "", trim: true },
    houseNo: { type: String, default: "", trim: true },
    village: { type: String, default: "", trim: true },
    subdistrict: { type: String, default: "", trim: true },
    district: { type: String, default: "", trim: true },
    province: { type: String, default: "", trim: true },
    postalCode: { type: String, default: "", trim: true },
    note: { type: String, default: "", trim: true },
    address: { type: String, default: "", trim: true },
  },
  { _id: false }
);

const adminReportSchema = new mongoose.Schema(
  {
    reportId: { type: String, default: "", trim: true },
    status: { type: String, default: "", trim: true },
    reason: { type: String, default: "", trim: true },
    createdAt: { type: String, default: "" },
  },
  { _id: false }
);

const shopOrderSchema = new mongoose.Schema(
  {
    shopOrderKey: {
      type: String,
      required: true,
      trim: true,
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    shopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shop",
      default: null,
    },
    shopName: {
      type: String,
      default: "",
      trim: true,
    },
    shippingMethod: {
      type: String,
      enum: ["meetup", "parcel"],
      default: "meetup",
    },
    status: {
      type: String,
      default: "",
      trim: true,
    },
    items: {
      type: [orderItemSchema],
      default: [],
    },
    subtotal: {
      type: Number,
      default: 0,
    },
    meetupProposal: {
      type: meetupProposalSchema,
      default: null,
    },
    parcelPayment: {
      type: parcelPaymentSchema,
      default: null,
    },
    parcelShipment: {
      type: parcelShipmentSchema,
      default: null,
    },
    adminReport: {
      type: adminReportSchema,
      default: null,
    },
    buyerShippingAddress: {
      type: buyerShippingAddressSchema,
      default: null,
    },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    status: {
      type: String,
      default: "pending",
      trim: true,
    },
    notes: {
      type: String,
      default: "",
      trim: true,
    },
    totalPrice: {
      type: Number,
      default: 0,
    },
    shopOrders: {
      type: [shopOrderSchema],
      default: [],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", orderSchema);
