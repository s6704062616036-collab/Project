const mongoose = require("mongoose");

const Category = require("../models/Category");
const Cart = require("../models/Cart");
const Product = require("../models/Product");
const Report = require("../models/Report");
const Shop = require("../models/Shop");
const User = require("../models/User");
const { createNotification, createNotifications } = require("./notificationService");
const {
  mapAdminCategory,
  mapAdminMember,
  mapAdminProduct,
  mapDashboardSummary,
} = require("../utils/adminMapper");

const DEFAULT_CATEGORY_NAMES = [
  "\u0e02\u0e2d\u0e07\u0e40\u0e25\u0e48\u0e19",
  "\u0e2b\u0e19\u0e31\u0e07\u0e2a\u0e37\u0e2d",
  "\u0e40\u0e04\u0e23\u0e37\u0e48\u0e2d\u0e07\u0e43\u0e0a\u0e49\u0e44\u0e1f\u0e1f\u0e49\u0e32",
  "\u0e40\u0e1f\u0e2d\u0e23\u0e4c\u0e19\u0e34\u0e40\u0e08\u0e2d\u0e23\u0e4c",
  "\u0e40\u0e04\u0e23\u0e37\u0e48\u0e2d\u0e07\u0e1b\u0e23\u0e30\u0e14\u0e31\u0e1a",
  "\u0e04\u0e2d\u0e21\u0e1e\u0e34\u0e27\u0e40\u0e15\u0e2d\u0e23\u0e4c",
  "\u0e2d\u0e30\u0e44\u0e2b\u0e25\u0e48\u0e23\u0e16\u0e22\u0e19\u0e15\u0e4c",
  "\u0e2d\u0e37\u0e48\u0e19\u0e46",
];

const THIRTY_DAYS_IN_MS = 1000 * 60 * 60 * 24 * 30;

const normalizeName = (value) => `${value ?? ""}`.trim();

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const toSortableTime = (value) => {
  const parsed = new Date(value ?? "").getTime();
  return Number.isFinite(parsed) ? parsed : 0;
};

const getCategoryCounts = async () => {
  const rows = await Product.aggregate([
    {
      $match: {
        category: { $nin: [null, ""] },
      },
    },
    {
      $group: {
        _id: "$category",
        count: { $sum: 1 },
      },
    },
  ]);

  return new Map(rows.map((row) => [`${row._id ?? ""}`.trim(), Number(row.count) || 0]));
};

const ensureSeedCategories = async () => {
  const categoryCounts = await getCategoryCounts();
  const seededNames = [
    ...DEFAULT_CATEGORY_NAMES,
    ...[...categoryCounts.keys()].filter(Boolean),
  ];

  if (!seededNames.length) {
    return;
  }

  const existingCategories = await Category.find({}, { name: 1 }).lean();
  const existingNamesLower = new Set(
    existingCategories.map((category) => normalizeName(category?.name).toLowerCase()).filter(Boolean)
  );
  const missingNames = [...new Set(seededNames.map((name) => normalizeName(name)).filter(Boolean))].filter(
    (name) => !existingNamesLower.has(name.toLowerCase())
  );

  if (!missingNames.length) {
    return;
  }

  await Category.insertMany(
    missingNames.map((name) => ({
      name,
      description: "",
    })),
    { ordered: false }
  ).catch(() => {});
};

const listCategoriesWithCounts = async () => {
  await ensureSeedCategories();
  const [categories, categoryCounts] = await Promise.all([
    Category.find({}).sort({ createdAt: 1 }).lean(),
    getCategoryCounts(),
  ]);

  return categories.map((category) =>
    mapAdminCategory(category, categoryCounts.get(category.name) ?? 0)
  );
};

const getDashboardSummary = async () => {
  const now = Date.now();
  const newMembersCountPromise = User.find(
    { role: { $ne: "admin" } },
    { createdAt: 1 }
  ).lean();

  const [
    users,
    productAnnouncementsCount,
    successfulExchangesCount,
    pendingKycCount,
    openReportsCount,
  ] = await Promise.all([
    newMembersCountPromise,
    Product.countDocuments({ status: "available" }),
    Product.countDocuments({ status: "sold" }),
    Shop.countDocuments({ kycStatus: "pending" }),
    Report.countDocuments({ status: "open" }),
  ]);

  return mapDashboardSummary({
    newMembersCount: users.filter((user) => now - new Date(user.createdAt ?? 0).getTime() <= THIRTY_DAYS_IN_MS).length,
    productAnnouncementsCount,
    successfulExchangesCount,
    pendingKycCount,
    openReportsCount,
  });
};

const listMembers = async ({ baseUrl } = {}) => {
  const users = await User.find({ role: { $ne: "admin" } }).sort({ createdAt: -1 }).lean();
  const userIds = users.map((user) => user._id);
  const shops = userIds.length ? await Shop.find({ owner: { $in: userIds } }).lean() : [];
  const shopsByOwnerId = new Map(shops.map((shop) => [shop.owner.toString(), shop]));

  return users
    .map((user) => mapAdminMember(user, shopsByOwnerId.get(user._id.toString()) ?? null, baseUrl))
    .sort((left, right) => {
      const leftPending = left?.kycStatus === "pending" ? 1 : 0;
      const rightPending = right?.kycStatus === "pending" ? 1 : 0;
      if (rightPending !== leftPending) {
        return rightPending - leftPending;
      }

      const submittedDiff = toSortableTime(right?.kycSubmittedAt) - toSortableTime(left?.kycSubmittedAt);
      if (submittedDiff !== 0) {
        return submittedDiff;
      }

      return toSortableTime(right?.createdAt) - toSortableTime(left?.createdAt);
    });
};

const reviewMemberDecision = async ({ memberId, action, note = "", shopId = "", baseUrl } = {}) => {
  if (!mongoose.isValidObjectId(memberId)) {
    const error = new Error("Invalid member id");
    error.statusCode = 400;
    throw error;
  }

  const normalizedAction = `${action ?? ""}`.trim().toLowerCase();
  if (!["approve_kyc", "reject_kyc", "ban", "unban"].includes(normalizedAction)) {
    const error = new Error("Invalid member action");
    error.statusCode = 400;
    throw error;
  }

  const user = await User.findOne({ _id: memberId, role: { $ne: "admin" } });
  if (!user) {
    const error = new Error("Member not found");
    error.statusCode = 404;
    throw error;
  }

  const actedAt = new Date();
  const normalizedNote = `${note ?? ""}`.trim();
  let shop = null;

  if (["approve_kyc", "reject_kyc"].includes(normalizedAction)) {
    const shopQuery = mongoose.isValidObjectId(shopId)
      ? { _id: shopId, owner: user._id }
      : { owner: user._id };
    shop = await Shop.findOne(shopQuery);

    if (!shop) {
      const error = new Error("Shop not found for this member");
      error.statusCode = 404;
      throw error;
    }

    if (!shop.citizenId && !shop.parcelQrCodeUrl) {
      const error = new Error("This member does not have KYC data to review");
      error.statusCode = 400;
      throw error;
    }

    if (normalizedAction === "reject_kyc" && !normalizedNote) {
      const error = new Error("กรุณาระบุเหตุผลที่ไม่อนุมัติ KYC");
      error.statusCode = 400;
      throw error;
    }

    shop.kycStatus = normalizedAction === "approve_kyc" ? "approved" : "rejected";
    shop.kycSubmittedAt = shop.kycSubmittedAt ?? actedAt;
    shop.kycReviewedAt = actedAt;
    shop.kycApprovedAt = normalizedAction === "approve_kyc" ? actedAt : null;
    shop.moderationNote =
      normalizedAction === "reject_kyc" ? normalizedNote : "";
    user.reviewedAt = actedAt;
    user.moderationNote = shop.moderationNote;
    await user.save();
    await shop.save();
    await createNotification({
      userId: user._id.toString(),
      type: normalizedAction === "approve_kyc" ? "kyc_approved" : "kyc_rejected",
      title: normalizedAction === "approve_kyc" ? "KYC ของร้านคุณผ่านแล้ว" : "KYC ของร้านคุณไม่ผ่าน",
      message:
        normalizedAction === "approve_kyc"
          ? `ร้าน ${shop.shopName || "ของคุณ"} สามารถเริ่มลงขายสินค้าได้แล้ว`
          : `${shop.shopName || "ร้านของคุณ"} ถูกตีกลับ กรุณาตรวจสอบข้อมูลและส่งใหม่`,
      target: {
        route: "myshop",
        params: {
          shopId: shop._id.toString(),
        },
      },
      metadata: {
        shopId: shop._id.toString(),
        moderationNote: shop.moderationNote ?? "",
      },
    });
  } else {
    user.banStatus = normalizedAction === "ban" ? "banned" : "active";
    user.reviewedAt = actedAt;
    user.moderationNote =
      normalizedNote ||
      (normalizedAction === "ban" ? "Account was banned by an administrator" : "");
    await user.save();
    shop = await Shop.findOne({ owner: user._id });
    await createNotification({
      userId: user._id.toString(),
      type: normalizedAction === "ban" ? "account_banned" : "account_unbanned",
      title: normalizedAction === "ban" ? "บัญชีของคุณถูกระงับ" : "บัญชีของคุณถูกปลดระงับ",
      message:
        normalizedAction === "ban"
          ? "ผู้ดูแลระบบได้ระงับการใช้งานบัญชีของคุณแล้ว"
          : "ผู้ดูแลระบบปลดระงับการใช้งานบัญชีของคุณแล้ว",
      target: {
        route: normalizedAction === "ban" ? "login" : "home",
        params: {},
      },
      metadata: {
        moderationNote: user.moderationNote ?? "",
      },
    });
  }

  return {
    member: mapAdminMember(user.toObject(), shop?.toObject?.() ?? shop ?? null, baseUrl),
    message:
      normalizedAction === "approve_kyc"
        ? "KYC approved successfully"
        : normalizedAction === "reject_kyc"
          ? "KYC rejected successfully"
          : normalizedAction === "ban"
            ? "Member account banned successfully"
            : "Member account unbanned successfully",
  };
};

const listCategories = async () => ({
  categories: await listCategoriesWithCounts(),
});

const listProducts = async ({ baseUrl, search = "" } = {}) => {
  const normalizedSearch = normalizeName(search).toLowerCase();
  const products = await Product.find({}).sort({ createdAt: -1 }).lean();
  const sellerIds = [...new Set(products.map((product) => `${product?.seller?.toString?.() ?? product?.seller ?? ""}`).filter(Boolean))];
  const [users, shops] = await Promise.all([
    sellerIds.length ? User.find({ _id: { $in: sellerIds } }).lean() : [],
    sellerIds.length ? Shop.find({ owner: { $in: sellerIds } }).lean() : [],
  ]);
  const usersById = new Map(users.map((user) => [user._id.toString(), user]));
  const shopsByOwnerId = new Map(shops.map((shop) => [shop.owner.toString(), shop]));

  const mappedProducts = products.map((product) => {
    const sellerId = `${product?.seller?.toString?.() ?? product?.seller ?? ""}`;
    return mapAdminProduct(product, {
      seller: usersById.get(sellerId) ?? null,
      shop: shopsByOwnerId.get(sellerId) ?? null,
      baseUrl,
    });
  });

  const filteredProducts = normalizedSearch
    ? mappedProducts.filter((product) =>
        [
          product.title,
          product.category,
          product.sellerName,
          product.shopName,
          product.status,
        ]
          .filter(Boolean)
          .some((value) => `${value}`.toLowerCase().includes(normalizedSearch))
      )
    : mappedProducts;

  return {
    products: filteredProducts,
    totalCount: filteredProducts.length,
  };
};

const deleteProductByAdmin = async ({ productId, note = "", baseUrl } = {}) => {
  if (!mongoose.isValidObjectId(productId)) {
    const error = new Error("Invalid product id");
    error.statusCode = 400;
    throw error;
  }

  const product = await Product.findById(productId).lean();
  if (!product) {
    const error = new Error("Product not found");
    error.statusCode = 404;
    throw error;
  }

  const sellerId = `${product?.seller?.toString?.() ?? product?.seller ?? ""}`.trim();
  const [seller, shop, cartsWithProduct, openReports] = await Promise.all([
    sellerId ? User.findById(sellerId).lean() : null,
    sellerId ? Shop.findOne({ owner: sellerId }).lean() : null,
    Cart.find({ "items.product": product._id }).lean(),
    Report.find({ productId: product._id, status: "open" }),
  ]);

  if (cartsWithProduct.length) {
    await Promise.all(
      cartsWithProduct.map((cart) =>
        Cart.updateOne(
          { _id: cart._id },
          {
            $pull: {
              items: { product: product._id },
            },
          },
        )
      )
    );
  }

  if (openReports.length) {
    const resolvedAt = new Date();
    await Promise.all(
      openReports.map((report) => {
        report.status = "taken_down";
        report.resolvedAt = resolvedAt;
        report.resolutionNote = normalizeName(note) || "Product removed by administrator";
        return report.save();
      })
    );
  }

  await Product.findByIdAndDelete(product._id);

  const impactedUserIds = [...new Set(
    cartsWithProduct
      .map((cart) => `${cart?.user?.toString?.() ?? cart?.user ?? ""}`.trim())
      .filter(Boolean)
  )];

  if (impactedUserIds.length) {
    await createNotifications(
      impactedUserIds.map((userId) => ({
        userId,
        type: "product_removed_from_cart",
        title: "สินค้าถูกนำออกจากระบบ",
        message: `สินค้า ${product?.title ?? "รายการในตะกร้า"} ถูกลบออกจากระบบและถูกนำออกจากตะกร้าของคุณแล้ว`,
        target: {
          route: "home",
          params: {},
        },
        metadata: {
          productId: product._id.toString(),
        },
      }))
    );
  }

  if (sellerId) {
    await createNotification({
      userId: sellerId,
      type: "admin_product_removed",
      title: "สินค้าของคุณถูกนำออกจากระบบ",
      message: `ผู้ดูแลระบบลบสินค้า ${product?.title ?? "รายการสินค้า"} ออกจากระบบแล้ว${normalizeName(note) ? `: ${normalizeName(note)}` : ""}`,
      target: {
        route: "myshop",
        params: {
          shopId: shop?._id?.toString?.() ?? "",
        },
      },
      metadata: {
        productId: product._id.toString(),
        moderationNote: normalizeName(note),
      },
    });
  }

  return {
    deletedProductId: product._id.toString(),
    product: mapAdminProduct(product, { seller, shop, baseUrl }),
    message: "Product removed successfully",
  };
};

const listPublicCategories = async () => {
  const { categories } = await listCategories();
  return categories;
};

const createCategory = async ({ name, description } = {}) => {
  const normalizedName = normalizeName(name);
  const normalizedDescription = normalizeName(description);

  if (!normalizedName) {
    const error = new Error("Please provide category name");
    error.statusCode = 400;
    throw error;
  }

  const existingCategory = await Category.findOne({
    name: { $regex: `^${escapeRegex(normalizedName)}$`, $options: "i" },
  });
  if (existingCategory) {
    const error = new Error("Category name already exists");
    error.statusCode = 409;
    throw error;
  }

  const category = await Category.create({
    name: normalizedName,
    description: normalizedDescription,
  });

  return {
    category: mapAdminCategory(category.toObject(), 0),
    categories: await listCategoriesWithCounts(),
    message: "Category created successfully",
  };
};

const updateCategory = async ({ categoryId, name, description } = {}) => {
  if (!mongoose.isValidObjectId(categoryId)) {
    const error = new Error("Invalid category id");
    error.statusCode = 400;
    throw error;
  }

  const normalizedName = normalizeName(name);
  const normalizedDescription = normalizeName(description);
  if (!normalizedName) {
    const error = new Error("Please provide category name");
    error.statusCode = 400;
    throw error;
  }

  const category = await Category.findById(categoryId);
  if (!category) {
    const error = new Error("Category not found");
    error.statusCode = 404;
    throw error;
  }

  const duplicatedCategory = await Category.findOne({
    _id: { $ne: category._id },
    name: { $regex: `^${escapeRegex(normalizedName)}$`, $options: "i" },
  });
  if (duplicatedCategory) {
    const error = new Error("Category name already exists");
    error.statusCode = 409;
    throw error;
  }

  const previousName = category.name;
  category.name = normalizedName;
  category.description = normalizedDescription;
  await category.save();

  if (previousName && previousName !== normalizedName) {
    await Promise.all([
      Product.updateMany({ category: previousName }, { $set: { category: normalizedName } }),
      Report.updateMany({ productCategory: previousName }, { $set: { productCategory: normalizedName } }),
    ]);
  }

  return {
    category: mapAdminCategory(category.toObject(), await Product.countDocuments({ category: normalizedName })),
    categories: await listCategoriesWithCounts(),
    message: "Category updated successfully",
  };
};

const deleteCategory = async ({ categoryId } = {}) => {
  if (!mongoose.isValidObjectId(categoryId)) {
    const error = new Error("Invalid category id");
    error.statusCode = 400;
    throw error;
  }

  const category = await Category.findById(categoryId);
  if (!category) {
    const error = new Error("Category not found");
    error.statusCode = 404;
    throw error;
  }

  const productCount = await Product.countDocuments({ category: category.name });
  if (productCount > 0) {
    const error = new Error("This category is still used by products and cannot be deleted");
    error.statusCode = 400;
    throw error;
  }

  await Category.findByIdAndDelete(categoryId);

  return {
    categories: await listCategoriesWithCounts(),
    message: "Category deleted successfully",
  };
};

module.exports = {
  getDashboardSummary,
  listMembers,
  reviewMemberDecision,
  listCategories,
  listPublicCategories,
  listProducts,
  deleteProductByAdmin,
  createCategory,
  updateCategory,
  deleteCategory,
};
