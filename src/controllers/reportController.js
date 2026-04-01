const mongoose = require("mongoose");

const Cart = require("../models/Cart");
const Product = require("../models/Product");
const Report = require("../models/Report");
const Shop = require("../models/Shop");
const User = require("../models/User");
const {
  notifyAdmins,
  createNotification,
  createNotifications,
} = require("../services/notificationService");
const { mapReport } = require("../utils/reportMapper");

const getApiBaseUrl = (req) => `${req.protocol}://${req.get("host")}`;

const safeText = (value) => `${value ?? ""}`.trim();

const submitProductReport = async (req, res) => {
  try {
    const productId = `${req.params.productId ?? ""}`.trim();
    const reason = `${req.body?.reason ?? ""}`.trim();

    if (!mongoose.isValidObjectId(productId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product id",
      });
    }

    if (!reason) {
      return res.status(400).json({
        success: false,
        message: "Please provide a report reason",
      });
    }

    const product = await Product.findById(productId).lean();
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    const shop = await Shop.findOne({ owner: product.seller }).lean();
    const reporter = await User.findById(req.user.id).lean();

    const report = await Report.create({
      reportType: "product",
      productId: product._id,
      productOwnerId: product.seller,
      productName: product.title,
      productCategory: product.category,
      productImageUrl: Array.isArray(product.images) && product.images.length ? product.images[0] : "",
      shopId: shop?._id ?? null,
      shopOwnerId: product.seller,
      shopName: shop?.shopName ?? "",
      shopAvatarUrl: shop?.avatarUrl ?? "",
      reporterId: req.user.id,
      reporterName: reporter?.name ?? reporter?.username ?? reporter?.email ?? "",
      reason,
      source: `${req.body?.source ?? ""}`.trim(),
    });
    await notifyAdmins({
      type: "report_submitted",
      title: "มีรายงานสินค้าใหม่",
      message: `มีการรายงานสินค้า ${product.title ?? "สินค้า"} เข้ามาใหม่`,
      target: {
        route: "admin",
        params: {
          section: "reports",
          reportId: report._id.toString(),
        },
      },
      metadata: {
        reportId: report._id.toString(),
        productId: product._id.toString(),
        imageUrl: Array.isArray(product.images) && product.images.length ? product.images[0] : "",
      },
    });

    return res.status(201).json({
      success: true,
      message: "ส่งรายงานสินค้าไปให้ผู้ดูแลระบบแล้ว",
      report: mapReport(report.toObject(), getApiBaseUrl(req)),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error while submitting product report",
      error: error.message,
    });
  }
};

const submitShopReport = async (req, res) => {
  try {
    const ownerId = `${req.params.ownerId ?? ""}`.trim();
    const reason = `${req.body?.reason ?? ""}`.trim();

    if (!mongoose.isValidObjectId(ownerId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid owner id",
      });
    }

    if (!reason) {
      return res.status(400).json({
        success: false,
        message: "Please provide a report reason",
      });
    }

    const shop = await Shop.findOne({ owner: ownerId }).lean();
    if (!shop) {
      return res.status(404).json({
        success: false,
        message: "Shop not found",
      });
    }

    const reporter = await User.findById(req.user.id).lean();

    const report = await Report.create({
      reportType: "shop",
      shopId: shop._id,
      shopOwnerId: shop.owner,
      shopName: shop.shopName ?? "",
      shopAvatarUrl: shop.avatarUrl ?? "",
      reporterId: req.user.id,
      reporterName: reporter?.name ?? reporter?.username ?? reporter?.email ?? "",
      reason,
      source: `${req.body?.source ?? ""}`.trim(),
    });
    await notifyAdmins({
      type: "report_submitted",
      title: "มีรายงานร้านค้าใหม่",
      message: `มีการรายงานร้าน ${shop.shopName ?? "ร้านค้า"} เข้ามาใหม่`,
      target: {
        route: "admin",
        params: {
          section: "reports",
          reportId: report._id.toString(),
        },
      },
      metadata: {
        reportId: report._id.toString(),
        shopId: shop._id.toString(),
      },
    });

    return res.status(201).json({
      success: true,
      message: "ส่งรายงานร้านค้าไปให้ผู้ดูแลระบบแล้ว",
      report: mapReport(report.toObject(), getApiBaseUrl(req)),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error while submitting shop report",
      error: error.message,
    });
  }
};

const listReports = async (req, res) => {
  try {
    const reports = await Report.find({}).sort({ createdAt: -1 }).lean();
    const productIds = [...new Set(reports.map((report) => `${report?.productId ?? ""}`).filter(Boolean))];
    const shopIds = [...new Set(reports.map((report) => `${report?.shopId ?? ""}`).filter(Boolean))];

    const [products, shops] = await Promise.all([
      productIds.length ? Product.find({ _id: { $in: productIds } }).lean() : [],
      shopIds.length ? Shop.find({ _id: { $in: shopIds } }).lean() : [],
    ]);

    const productsById = new Map(products.map((product) => [product._id.toString(), product]));
    const shopsById = new Map(shops.map((shop) => [shop._id.toString(), shop]));
    const enrichedReports = reports.map((report) => {
      const product = productsById.get(`${report?.productId ?? ""}`) ?? null;
      const shop = shopsById.get(`${report?.shopId ?? ""}`) ?? null;

      return {
        ...report,
        productName: report?.productName || product?.title || "",
        productCategory: report?.productCategory || product?.category || "",
        productImageUrl:
          report?.productImageUrl ||
          (Array.isArray(product?.images) && product.images.length ? product.images[0] : ""),
        shopName: report?.shopName || shop?.shopName || "",
        shopAvatarUrl: report?.shopAvatarUrl || shop?.avatarUrl || "",
      };
    });

    return res.status(200).json({
      success: true,
      reports: enrichedReports.map((report) => mapReport(report, getApiBaseUrl(req))),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error while fetching reports",
      error: error.message,
    });
  }
};

const reviewReport = async (req, res) => {
  try {
    const reportId = `${req.params.reportId ?? ""}`.trim();
    const action = `${req.body?.action ?? ""}`.trim().toLowerCase();
    const note = `${req.body?.note ?? ""}`.trim();

    if (!mongoose.isValidObjectId(reportId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid report id",
      });
    }

    if (!["dismiss", "take_down"].includes(action)) {
      return res.status(400).json({
        success: false,
        message: "Invalid report action",
      });
    }

    const report = await Report.findById(reportId);
    if (!report) {
      return res.status(404).json({
        success: false,
        message: "Report not found",
      });
    }

    report.status = action === "take_down" ? "taken_down" : "dismissed";
    report.resolutionNote = note;
    report.resolvedAt = new Date();
    await report.save();

    if (action === "take_down" && report.reportType === "product" && report.productId) {
      const productId = report.productId;
      const product = await Product.findById(productId).lean();
      const cartsWithProduct = await Cart.find({ "items.product": productId }).lean();

      if (cartsWithProduct.length) {
        await Promise.all(
          cartsWithProduct.map((cart) =>
            Cart.updateOne(
              { _id: cart._id },
              {
                $pull: {
                  items: { product: productId },
                },
              },
            )
          )
        );

        const impactedUserIds = [...new Set(
          cartsWithProduct
            .map((cart) => safeText(cart?.user?.toString?.() ?? cart?.user))
            .filter(Boolean)
        )];

        await createNotifications(
          impactedUserIds.map((userId) => ({
            userId,
            type: "product_removed_from_cart",
            title: "สินค้าถูกนำออกจากระบบ",
            message: `สินค้า ${product?.title ?? report.productName ?? "รายการที่อยู่ในตะกร้า"} ถูกนำออกจากระบบและถูกลบออกจากตะกร้าของคุณแล้ว`,
            target: {
              route: "home",
              params: {},
            },
            metadata: {
              productId: safeText(productId?.toString?.() ?? productId),
              reportId: report._id.toString(),
            },
          }))
        );
      }

      await Product.findByIdAndDelete(productId);
    }
    const ownerId =
      `${report?.shopOwnerId?.toString?.() ?? report?.shopOwnerId ?? ""}`.trim() ||
      `${report?.productOwnerId?.toString?.() ?? report?.productOwnerId ?? ""}`.trim();
    if (ownerId) {
      await createNotification({
        userId: ownerId,
        type: action === "take_down" ? "report_taken_down" : "report_dismissed",
        title: action === "take_down" ? "มีการนำเนื้อหาของคุณออกจากระบบ" : "รายงานเกี่ยวกับเนื้อหาของคุณถูกปิดแล้ว",
        message:
          action === "take_down"
            ? `ผู้ดูแลระบบนำ ${report.reportType === "shop" ? "ร้านค้า" : "สินค้า"} ของคุณออกจากระบบแล้ว`
            : `ผู้ดูแลระบบตรวจสอบรายงานเกี่ยวกับ${report.reportType === "shop" ? "ร้านค้า" : "สินค้า"}ของคุณแล้ว`,
        target: {
          route: "myshop",
          params: {},
        },
        metadata: {
          reportId: report._id.toString(),
          resolutionNote: note,
        },
      });
    }

    return res.status(200).json({
      success: true,
      message: action === "take_down" ? "ดำเนินการกับรายงานแล้ว" : "ปิดรายงานแล้ว",
      report: mapReport(report.toObject(), getApiBaseUrl(req)),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error while reviewing report",
      error: error.message,
    });
  }
};

module.exports = {
  submitProductReport,
  submitShopReport,
  listReports,
  reviewReport,
};
