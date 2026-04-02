const Shop = require("../models/Shop");
const Product = require("../models/Product");
const User = require("../models/User");
const mongoose = require("mongoose");
const { assertApprovedShopForSelling } = require("../services/shopKycService");
const { notifyAdmins } = require("../services/notificationService");
const { deleteUploadedFile, deleteUploadedFiles, saveUploadedFile, saveUploadedFiles } = require("../services/fileStorageService");
const serializeUser = require("../utils/serializeUser");

const normalizeProductStatus = (value) => {
  const normalizedValue = `${value ?? ""}`.trim().toLowerCase();
  return normalizedValue === "sold" ? "sold" : "available";
};

const normalizeProductDescription = (value) => `${value ?? ""}`.trim();

const normalizeBirthDate = (value) => {
  const normalizedValue = `${value ?? ""}`.trim();
  if (!normalizedValue) return "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalizedValue)) return "";

  const parsedDate = new Date(`${normalizedValue}T00:00:00.000Z`);
  if (Number.isNaN(parsedDate.getTime())) return "";

  const [year, month, day] = normalizedValue.split("-").map((entry) => Number(entry));
  if (
    parsedDate.getUTCFullYear() !== year ||
    parsedDate.getUTCMonth() + 1 !== month ||
    parsedDate.getUTCDate() !== day
  ) {
    return "";
  }

  return normalizedValue;
};

const normalizeProvince = (value) => `${value ?? ""}`.trim().slice(0, 100);
const normalizeLegalName = (value) => `${value ?? ""}`.trim().slice(0, 120);

const normalizeBankAccountNumber = (value) =>
  `${value ?? ""}`
    .replace(/\D+/g, "")
    .slice(0, 20);

const mapShop = (shop) => {
  if (!shop) return null;

  return {
    id: shop._id,
    ownerId: shop.owner,
    shopName: shop.shopName,
    citizenId: shop.citizenId,
    birthDate: shop.birthDate,
    province: shop.province,
    description: shop.description,
    contact: shop.contact,
    avatarUrl: shop.avatarUrl,
    parcelQrCodeUrl: shop.parcelQrCodeUrl,
    bankName: shop.bankName,
    bankAccountName: shop.bankAccountName,
    bankAccountNumber: shop.bankAccountNumber,
    kycStatus: shop.kycStatus,
    kycSubmittedAt: shop.kycSubmittedAt,
    kycReviewedAt: shop.kycReviewedAt,
    kycApprovedAt: shop.kycApprovedAt,
    moderationNote: shop.moderationNote,
  };
};

const mapProduct = (product) => {
  if (!product) return null;

  return {
    id: product._id,
    ownerId: product.seller,
    name: product.title,
    category: product.category,
    imageUrl: Array.isArray(product.images) && product.images.length ? product.images[0] : "",
    imageUrls: Array.isArray(product.images) ? product.images : [],
    price: product.price,
    exchangeItem: product.exchangeItem,
    description: product.description,
    saleStatus: product.status,
    soldAt: product.soldAt,
    soldOrderId: product.soldOrderId,
    createdAt: product.createdAt,
  };
};

const getMyShop = async (req, res) => {
  try {
    const shop = await Shop.findOne({ owner: req.user.id });

    return res.status(200).json({
      success: true,
      shop: mapShop(shop),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error while fetching shop",
      error: error.message,
    });
  }
};

const upsertMyShop = async (req, res) => {
  let session = null;
  let uploadedQrPath = "";
  let hasCommittedTransaction = false;
  try {
    const {
      shopName,
      citizenId,
      kycCitizenId,
      submissionAction,
      firstName,
      lastName,
      birthDate,
      province,
      description,
      contact,
      avatarUrl,
      parcelQrCodeUrl,
      bankName,
      bankAccountName,
      bankAccountNumber,
    } = req.body;

    uploadedQrPath = req.file
      ? await saveUploadedFile(req.file, { folder: "secondhand/shops/qr" })
      : undefined;
    const normalizedCitizenId = `${citizenId ?? kycCitizenId ?? ""}`.replace(/\D+/g, "").slice(0, 13);
    const normalizedSubmissionAction = `${submissionAction ?? ""}`.trim().toLowerCase();
    const explicitKycSubmissionRequested = normalizedSubmissionAction === "submit_kyc_review";
    const normalizedFirstName = normalizeLegalName(firstName);
    const normalizedLastName = normalizeLegalName(lastName);
    const normalizedBirthDate = normalizeBirthDate(birthDate);
    const normalizedProvince = normalizeProvince(province);
    const normalizedBankAccountNumber = normalizeBankAccountNumber(bankAccountNumber);
    let user = null;
    let shop = null;
    let shouldNotifyAdmins = false;

    session = await mongoose.startSession();
    await session.withTransaction(async () => {
      user = await User.findById(req.user.id).select("-password").session(session);

      if (!user) {
        const missingUserError = new Error("User not found");
        missingUserError.statusCode = 404;
        throw missingUserError;
      }

      const existingShop = await Shop.findOne({ owner: req.user.id }).session(session);
      const nextCitizenId = normalizedCitizenId || existingShop?.citizenId || "";
      const nextParcelQrCodeUrl =
        uploadedQrPath ??
        parcelQrCodeUrl ??
        existingShop?.parcelQrCodeUrl ??
        "";
      const hasKycEvidence = Boolean(nextCitizenId || nextParcelQrCodeUrl);
      const hasEvidenceChanged =
        nextCitizenId !== (existingShop?.citizenId ?? "") ||
        nextParcelQrCodeUrl !== (existingShop?.parcelQrCodeUrl ?? "");
      let nextKycStatus = existingShop?.kycStatus ?? "unsubmitted";
      let nextKycSubmittedAt = existingShop?.kycSubmittedAt ?? null;
      let nextKycReviewedAt = existingShop?.kycReviewedAt ?? null;
      let nextKycApprovedAt = existingShop?.kycApprovedAt ?? null;
      let nextModerationNote = existingShop?.moderationNote ?? "";

      if (!hasKycEvidence) {
        nextKycStatus = "unsubmitted";
        nextKycSubmittedAt = null;
        nextKycReviewedAt = null;
        nextKycApprovedAt = null;
        nextModerationNote = "";
      } else if (
        explicitKycSubmissionRequested ||
        !existingShop ||
        hasEvidenceChanged ||
        !["pending", "approved", "rejected"].includes(existingShop?.kycStatus)
      ) {
        nextKycStatus = "pending";
        nextKycSubmittedAt = new Date();
        nextKycReviewedAt = null;
        nextKycApprovedAt = null;
        nextModerationNote = "";
      }

      if (firstName !== undefined) {
        user.firstName = normalizedFirstName;
      }

      if (lastName !== undefined) {
        user.lastName = normalizedLastName;
      }

      shop = await Shop.findOneAndUpdate(
        { owner: req.user.id },
        {
          owner: req.user.id,
          shopName: shopName ?? existingShop?.shopName ?? "",
          citizenId: nextCitizenId,
          birthDate: normalizedBirthDate || existingShop?.birthDate || "",
          province: province === undefined ? existingShop?.province ?? "" : normalizedProvince,
          description: description ?? existingShop?.description ?? "",
          contact: contact ?? existingShop?.contact ?? "",
          avatarUrl: avatarUrl ?? existingShop?.avatarUrl ?? "",
          parcelQrCodeUrl: nextParcelQrCodeUrl,
          bankName: `${bankName ?? existingShop?.bankName ?? ""}`.trim(),
          bankAccountName: `${bankAccountName ?? existingShop?.bankAccountName ?? ""}`.trim(),
          bankAccountNumber: normalizedBankAccountNumber || existingShop?.bankAccountNumber || "",
          kycStatus: nextKycStatus,
          kycSubmittedAt: nextKycSubmittedAt,
          kycReviewedAt: nextKycReviewedAt,
          kycApprovedAt: nextKycApprovedAt,
          moderationNote: nextModerationNote,
        },
        {
          new: true,
          upsert: true,
          setDefaultsOnInsert: true,
          session,
        }
      );

      await user.save({ session });

      shouldNotifyAdmins =
        nextKycStatus === "pending" &&
        (explicitKycSubmissionRequested ||
          !existingShop ||
          hasEvidenceChanged ||
          `${existingShop?.kycStatus ?? ""}`.trim().toLowerCase() !== "pending");
    });
    hasCommittedTransaction = true;

    if (shouldNotifyAdmins) {
      await notifyAdmins({
        type: "kyc_submitted",
        title: "มีคำขอ KYC ใหม่",
        message: `ร้าน ${shop.shopName || "ร้านค้า"} ส่งข้อมูล KYC เข้ามาให้ตรวจสอบแล้ว`,
        target: {
          route: "admin",
          params: {
            section: "members",
            memberId: `${req.user.id ?? ""}`.trim(),
            shopId: shop._id.toString(),
          },
        },
        metadata: {
          shopId: shop._id.toString(),
          ownerId: `${req.user.id ?? ""}`.trim(),
        },
      });
    }

    return res.status(200).json({
      success: true,
      message: "Shop saved successfully",
      shop: mapShop(shop),
      user: serializeUser(user),
    });
  } catch (error) {
    if (uploadedQrPath && !hasCommittedTransaction) {
      try {
        await deleteUploadedFile(uploadedQrPath);
      } catch (cleanupError) {
        console.error("Failed to clean up uploaded shop QR file:", cleanupError.message);
      }
    }

    if (error?.statusCode === 404) {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Server error while saving shop",
      error: error.message,
    });
  } finally {
    if (session) {
      await session.endSession();
    }
  }
};

const getMyProducts = async (req, res) => {
  try {
    const products = await Product.find({ seller: req.user.id }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      products: products.map(mapProduct),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error while fetching products",
      error: error.message,
    });
  }
};

const listParcelPaymentReviews = async (req, res) => {
  return res.status(200).json({
    success: true,
    reviews: [],
  });
};

const createMyProduct = async (req, res) => {
  let imagePaths = [];
  try {
    await assertApprovedShopForSelling(req.user.id);

    const { name, category, price, exchangeItem, description, saleStatus, status } = req.body;
    const normalizedDescription = normalizeProductDescription(description);

    if (!name || !category || !price || !normalizedDescription) {
      return res.status(400).json({
        success: false,
        message: "Please provide name, category, price and description",
      });
    }

    imagePaths = Array.isArray(req.files)
      ? await saveUploadedFiles(req.files, { folder: "secondhand/products" })
      : [];

    const product = await Product.create({
      title: name,
      category,
      price,
      exchangeItem: exchangeItem ?? "",
      description: normalizedDescription,
      images: imagePaths,
      seller: req.user.id,
      status: normalizeProductStatus(saleStatus ?? status),
    });

    return res.status(201).json({
      success: true,
      message: "Product created successfully",
      product: mapProduct(product),
    });
  } catch (error) {
    if (imagePaths.length) {
      await deleteUploadedFiles(imagePaths);
    }

    if (error.status === 403) {
      return res.status(403).json({
        success: false,
        code: error.code ?? "SHOP_KYC_REQUIRED",
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Server error while creating product",
      error: error.message,
    });
  }
};

const updateMyProduct = async (req, res) => {
  let uploadedImages = [];
  try {
    await assertApprovedShopForSelling(req.user.id);

    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product id",
      });
    }

    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    if (product.seller.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to update this product",
      });
    }

    product.title = req.body.name ?? product.title;
    product.category = req.body.category ?? product.category;
    product.price = req.body.price ?? product.price;
    product.exchangeItem = req.body.exchangeItem ?? product.exchangeItem;
    const nextDescription =
      req.body.description !== undefined
        ? normalizeProductDescription(req.body.description)
        : normalizeProductDescription(product.description);

    if (!nextDescription) {
      return res.status(400).json({
        success: false,
        message: "Please provide product description",
      });
    }

    product.description = nextDescription;
    product.status = normalizeProductStatus(req.body.saleStatus ?? req.body.status ?? product.status);

    const previousImages = Array.isArray(product.images) ? [...product.images] : [];
    if (Array.isArray(req.files) && req.files.length) {
      uploadedImages = await saveUploadedFiles(req.files, { folder: "secondhand/products" });
      product.images = uploadedImages;
    }

    await product.save();

    if (uploadedImages.length && previousImages.length) {
      await deleteUploadedFiles(previousImages);
    }

    return res.status(200).json({
      success: true,
      message: "Product updated successfully",
      product: mapProduct(product),
    });
  } catch (error) {
    if (uploadedImages.length) {
      await deleteUploadedFiles(uploadedImages);
    }

    if (error.status === 403) {
      return res.status(403).json({
        success: false,
        code: error.code ?? "SHOP_KYC_REQUIRED",
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Server error while updating product",
      error: error.message,
    });
  }
};

const deleteMyProduct = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product id",
      });
    }

    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    if (product.seller.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to delete this product",
      });
    }

    const productImages = Array.isArray(product.images) ? [...product.images] : [];
    await Product.findByIdAndDelete(req.params.id);
    await deleteUploadedFiles(productImages);

    return res.status(200).json({
      success: true,
      message: "Product deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error while deleting product",
      error: error.message,
    });
  }
};

module.exports = {
  getMyShop,
  upsertMyShop,
  getMyProducts,
  listParcelPaymentReviews,
  createMyProduct,
  updateMyProduct,
  deleteMyProduct,
};
