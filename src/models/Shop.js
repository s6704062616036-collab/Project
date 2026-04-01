const mongoose = require("mongoose");

const shopSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    shopName: {
      type: String,
      default: "",
      trim: true,
    },
    citizenId: {
      type: String,
      default: "",
      trim: true,
    },
    birthDate: {
      type: String,
      default: "",
      trim: true,
    },
    province: {
      type: String,
      default: "",
      trim: true,
    },
    description: {
      type: String,
      default: "",
      trim: true,
    },
    contact: {
      type: String,
      default: "",
      trim: true,
    },
    avatarUrl: {
      type: String,
      default: "",
    },
    parcelQrCodeUrl: {
      type: String,
      default: "",
    },
    bankName: {
      type: String,
      default: "",
      trim: true,
    },
    bankAccountName: {
      type: String,
      default: "",
      trim: true,
    },
    bankAccountNumber: {
      type: String,
      default: "",
      trim: true,
    },
    kycStatus: {
      type: String,
      enum: ["unsubmitted", "pending", "approved", "rejected"],
      default: "unsubmitted",
      trim: true,
    },
    kycSubmittedAt: {
      type: Date,
      default: null,
    },
    kycReviewedAt: {
      type: Date,
      default: null,
    },
    kycApprovedAt: {
      type: Date,
      default: null,
    },
    moderationNote: {
      type: String,
      default: "",
      trim: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Shop", shopSchema);
