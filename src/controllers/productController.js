const Product = require("../models/Product");
const mongoose = require("mongoose");
const { getApprovedShopOwnerIds, isApprovedShopKyc } = require("../services/shopKycService");
const Shop = require("../models/Shop");
const { assertApprovedShopForSelling } = require("../services/shopKycService");
const { deleteUploadedFiles } = require("../services/fileStorageService");

const toSellerId = (value) => value?._id?.toString?.() ?? value?.toString?.() ?? `${value ?? ""}`;
const pickFirstNonEmpty = (...values) => {
  for (const value of values) {
    const normalizedValue = `${value ?? ""}`.trim();
    if (normalizedValue) return normalizedValue;
  }

  return "";
};

const areStringArraysEqual = (left = [], right = []) => {
  if (!Array.isArray(left) || !Array.isArray(right)) return false;
  if (left.length !== right.length) return false;
  return left.every((value, index) => `${value ?? ""}` === `${right[index] ?? ""}`);
};

const mapMarketplaceProduct = (product, shop = null) => {
  if (!product) return null;

  const source = typeof product.toObject === "function" ? product.toObject() : product;
  const sellerId = toSellerId(source?.seller);
  const sellerAvatarUrl = source?.seller?.avatarUrl ?? "";
  const publicSeller =
    source?.seller && typeof source.seller === "object"
      ? {
          id: sellerId,
          avatarUrl: sellerAvatarUrl,
        }
      : sellerId;

  return {
    ...source,
    id: source?._id?.toString?.() ?? source?.id ?? "",
    ownerId: sellerId,
    shopId: shop?._id?.toString?.() ?? "",
    shopName: shop?.shopName ?? source?.shopName ?? "",
    province: shop?.province ?? source?.province ?? "",
    shopAvatarUrl: pickFirstNonEmpty(shop?.avatarUrl, source?.shopAvatarUrl, sellerAvatarUrl),
    name: source?.title ?? source?.name ?? "",
    imageUrl:
      Array.isArray(source?.images) && source.images.length
        ? source.images[0]
        : source?.imageUrl ?? "",
    imageUrls: Array.isArray(source?.images) ? source.images : source?.imageUrls ?? [],
    saleStatus: source?.status ?? source?.saleStatus ?? "available",
    seller: publicSeller,
  };
};

// create product
const createProduct = async (req, res) => {
  try {
    await assertApprovedShopForSelling(req.user.id);

    const { title, description, price, category, images } = req.body;

    if (!title || !description || !price || !category) {
      return res.status(400).json({
        success: false,
        message: "Please provide title, description, price and category"
      });
    }

    const product = new Product({
      title,
      description,
      price,
      category,
      images: images || [],
      seller: req.user.id
    });

    await product.save();

    return res.status(201).json({
      success: true,
      message: "Product created successfully",
      data: product
    });
  } catch (error) {
    if (error.status === 403) {
      return res.status(403).json({
        success: false,
        code: error.code ?? "SHOP_KYC_REQUIRED",
        message: error.message
      });
    }

    return res.status(500).json({
      success: false,
      message: "Server error while creating product",
      error: error.message
    });
  }
};

// get all products
const getAllProducts = async (req, res) => {
  try {
    const keyword = `${req.query.keyword ?? ""}`.trim();
    const approvedSellerIds = await getApprovedShopOwnerIds();
    const query = {
      ...(keyword
      ? {
          $or: [
            { title: { $regex: keyword, $options: "i" } },
            { description: { $regex: keyword, $options: "i" } },
            { category: { $regex: keyword, $options: "i" } }
          ]
        }
      : {}),
      seller: { $in: approvedSellerIds },
      status: "available",
    };

    const products = await Product.find(query)
      .populate("seller", "username avatarUrl")
      .sort({ createdAt: -1 });
    const shops = approvedSellerIds.length
      ? await Shop.find({ owner: { $in: approvedSellerIds } }).lean()
      : [];
    const shopsByOwnerId = new Map(
      shops.map((shop) => [`${shop?.owner?.toString?.() ?? shop?.owner ?? ""}`, shop]),
    );
    const mappedProducts = products.map((product) =>
      mapMarketplaceProduct(
        product,
        shopsByOwnerId.get(toSellerId(product?.seller)) ?? null,
      ),
    );

    return res.status(200).json({
      success: true,
      count: mappedProducts.length,
      data: mappedProducts,
      products: mappedProducts
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error while fetching products",
      error: error.message
    });
  }
};

// get single product
const getProductById = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product id"
      });
    }

    const product = await Product.findById(req.params.id).populate("seller", "username avatarUrl");

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }

    const sellerShop = await Shop.findOne({ owner: product.seller?._id ?? product.seller }).lean();
    if (!isApprovedShopKyc(sellerShop)) {
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }

    const mappedProduct = mapMarketplaceProduct(product, sellerShop);

    return res.status(200).json({
      success: true,
      data: mappedProduct,
      product: mappedProduct
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error while fetching product",
      error: error.message
    });
  }
};

// get my products
const getMyProducts = async (req, res) => {
  try {
    const products = await Product.find({ seller: req.user.id }).sort({
      createdAt: -1
    });

    return res.status(200).json({
      success: true,
      count: products.length,
      data: products
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error while fetching your products",
      error: error.message
    });
  }
};

// update product
const updateProduct = async (req, res) => {
  try {
    await assertApprovedShopForSelling(req.user.id);

    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product id"
      });
    }

    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }

    if (product.seller.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to update this product"
      });
    }

    const previousImages = Array.isArray(product.images) ? [...product.images] : [];
    product.title = req.body.title ?? product.title;
    product.description = req.body.description ?? product.description;
    product.price = req.body.price ?? product.price;
    product.category = req.body.category ?? product.category;
    product.images = req.body.images ?? product.images;
    product.status = req.body.status ?? product.status;

    await product.save();

    if (
      Array.isArray(req.body.images) &&
      req.body.images.length &&
      !areStringArraysEqual(previousImages, req.body.images)
    ) {
      await deleteUploadedFiles(previousImages);
    }

    return res.status(200).json({
      success: true,
      message: "Product updated successfully",
      data: product
    });
  } catch (error) {
    if (error.status === 403) {
      return res.status(403).json({
        success: false,
        code: error.code ?? "SHOP_KYC_REQUIRED",
        message: error.message
      });
    }

    return res.status(500).json({
      success: false,
      message: "Server error while updating product",
      error: error.message
    });
  }
};

// delete product
const deleteProduct = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product id"
      });
    }

    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }

    if (product.seller.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to delete this product"
      });
    }

    const productImages = Array.isArray(product.images) ? [...product.images] : [];
    await Product.findByIdAndDelete(req.params.id);
    await deleteUploadedFiles(productImages);

    return res.status(200).json({
      success: true,
      message: "Product deleted successfully"
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error while deleting product",
      error: error.message
    });
  }
};

module.exports = {
  createProduct,
  getAllProducts,
  getProductById,
  getMyProducts,
  updateProduct,
  deleteProduct
};
