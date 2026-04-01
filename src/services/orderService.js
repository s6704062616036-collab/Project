const mongoose = require("mongoose");

const Cart = require("../models/Cart");
const Order = require("../models/Order");
const Product = require("../models/Product");
const Shop = require("../models/Shop");
const User = require("../models/User");
const { createCheckoutChatsForOrder } = require("./chatService");
const { createNotifications } = require("./notificationService");
const { mapOrder, mapParcelPaymentReview } = require("../utils/orderMapper");
const { saveUploadedFiles } = require("./fileStorageService");
const { composeStructuredAddress } = require("../utils/addressFormatter");

const makeHttpError = (status, message) => {
  const error = new Error(message);
  error.status = status;
  return error;
};

const normalizeShippingMethod = (value) => {
  const normalizedValue = `${value ?? ""}`.trim().toLowerCase();
  return normalizedValue === "parcel" ? "parcel" : "meetup";
};

const normalizePaymentMethod = (value) => {
  const normalizedValue = `${value ?? ""}`.trim().toLowerCase();
  return normalizedValue === "cash_on_delivery" || normalizedValue === "cod"
    ? "cash_on_delivery"
    : normalizedValue === "bank_transfer" || normalizedValue === "bank" || normalizedValue === "transfer"
      ? "bank_transfer"
    : "qr_code";
};

const normalizeShipmentAction = (value) => {
  const normalizedValue = `${value ?? ""}`.trim().toLowerCase();
  return normalizedValue === "ship" || normalizedValue === "shipped" ? "ship" : "prepare";
};

const normalizeTrackingNumber = (value) =>
  `${value ?? ""}`
    .trim()
    .replace(/\s+/g, "")
    .slice(0, 60);

const getApiBaseUrl = (req) => `${req.protocol}://${req.get("host")}`;

const buildFilesByFieldName = async (files = []) => {
  const normalizedFiles = Array.isArray(files) ? files.filter((file) => file?.fieldname) : [];
  if (!normalizedFiles.length) return new Map();

  const uploadedUrls = await saveUploadedFiles(normalizedFiles, {
    folder: "secondhand/orders/receipts",
  });

  return new Map(normalizedFiles.map((file, index) => [file.fieldname, uploadedUrls[index] ?? ""]));
};

const parseCheckoutPayload = (body = {}) => {
  const rawShopOrders = body?.shopOrders;
  const parsedShopOrders =
    typeof rawShopOrders === "string"
      ? JSON.parse(rawShopOrders || "[]")
      : Array.isArray(rawShopOrders)
        ? rawShopOrders
        : [];

  return {
    notes: `${body?.notes ?? ""}`.trim(),
    shopOrders: parsedShopOrders,
  };
};

const normalizeBuyerShippingAddress = (entry = {}, fallback = {}) => {
  const houseNo = `${entry?.houseNo ?? fallback?.houseNo ?? ""}`.trim();
  const village = `${entry?.village ?? fallback?.village ?? ""}`.trim();
  const district = `${entry?.district ?? fallback?.district ?? ""}`.trim();
  const province = `${entry?.province ?? fallback?.province ?? ""}`.trim();
  const postalCode = `${entry?.postalCode ?? fallback?.postalCode ?? ""}`.trim();
  const note = `${entry?.note ?? fallback?.note ?? ""}`.trim();
  const address =
    composeStructuredAddress({
      houseNo,
      village,
      district,
      province,
      postalCode,
      note,
    }) || `${entry?.address ?? fallback?.address ?? ""}`.trim();

  return {
    addressId: `${entry?.addressId ?? fallback?.addressId ?? ""}`.trim(),
    label: `${entry?.label ?? fallback?.label ?? ""}`.trim(),
    name: `${entry?.name ?? fallback?.name ?? ""}`.trim(),
    phone: `${entry?.phone ?? fallback?.phone ?? ""}`.trim(),
    houseNo,
    village,
    district,
    province,
    postalCode,
    note,
    address,
    isDefault: Boolean(entry?.isDefault ?? fallback?.isDefault),
  };
};

const deriveOrderStatus = (shopOrders = []) => {
  const statuses = (Array.isArray(shopOrders) ? shopOrders : [])
    .map((shopOrder) => `${shopOrder?.status ?? ""}`.trim().toLowerCase())
    .filter(Boolean);

  if (!statuses.length) return "pending";
  if (statuses.every((status) => status === "completed")) return "completed";
  if (statuses.some((status) => status === "reported_to_admin")) return "reported_to_admin";
  if (statuses.some((status) => status === "rejected_by_buyer")) return "rejected_by_buyer";
  if (statuses.every((status) => status === "cancelled")) return "cancelled";
  if (statuses.every((status) => status === "cancelled_by_seller")) return "cancelled_by_seller";
  if (statuses.some((status) => status === "parcel_in_transit")) return "parcel_in_transit";
  if (statuses.some((status) => status === "preparing_parcel")) return "preparing_parcel";
  if (statuses.some((status) => status === "awaiting_parcel_pickup")) return "awaiting_parcel_pickup";
  if (statuses.some((status) => status === "awaiting_buyer_confirmation")) return "awaiting_buyer_confirmation";
  if (statuses.some((status) => status === "awaiting_meetup")) return "awaiting_meetup";
  if (statuses.some((status) => status === "countered_by_seller")) return "countered_by_seller";
  if (statuses.some((status) => status === "pending_seller_response")) return "pending_seller_response";
  if (statuses.some((status) => status === "pending_payment_verification")) return "pending_payment_verification";
  return statuses[0];
};

const setProductsAvailability = async ({ productIds = [], sold = false, orderId = "" } = {}) => {
  const normalizedProductIds = [...new Set((Array.isArray(productIds) ? productIds : []).filter(Boolean))];
  if (!normalizedProductIds.length) return;

  if (sold) {
    await Product.updateMany(
      { _id: { $in: normalizedProductIds } },
      {
        $set: {
          status: "sold",
          soldAt: new Date(),
          soldOrderId: orderId || "",
        },
      }
    );
    return;
  }

  await Product.updateMany(
    { _id: { $in: normalizedProductIds } },
    {
      $set: {
        status: "available",
        soldAt: null,
        soldOrderId: "",
      },
    }
  );
};

const getOrderWithBuyer = async (orderId) => {
  const order = await Order.findById(orderId).lean();
  if (!order) return null;

  const buyer = await User.findById(order.user).lean();
  return { order, buyer };
};

const buildCheckoutOrder = async ({ userId, payload, filesByFieldName }) => {
  const cart = await Cart.findOne({ user: userId });
  if (!cart || !Array.isArray(cart.items) || !cart.items.length) {
    throw makeHttpError(400, "Cart is empty");
  }

  const buyerUser = await User.findById(userId).lean();
  if (!buyerUser) {
    throw makeHttpError(404, "User not found");
  }

  const savedAddresses = Array.isArray(buyerUser.addresses)
    ? buyerUser.addresses
        .map((entry, index) =>
          normalizeBuyerShippingAddress(
            {
              addressId: `${entry?.id ?? ""}`.trim() || `address-${index + 1}`,
              label: `${entry?.label ?? ""}`.trim(),
              name: `${entry?.recipientName ?? buyerUser?.name ?? ""}`.trim(),
              phone: `${entry?.phone ?? buyerUser?.phone ?? ""}`.trim(),
              houseNo: `${entry?.houseNo ?? ""}`.trim(),
              village: `${entry?.village ?? ""}`.trim(),
              district: `${entry?.district ?? ""}`.trim(),
              province: `${entry?.province ?? ""}`.trim(),
              postalCode: `${entry?.postalCode ?? ""}`.trim(),
              note: `${entry?.note ?? ""}`.trim(),
              address: `${entry?.address ?? ""}`.trim(),
              isDefault: Boolean(entry?.isDefault),
            },
            {}
          )
        )
        .filter((entry) => entry.address)
    : [];
  const savedAddressesById = new Map(savedAddresses.map((entry) => [entry.addressId, entry]));

  if (!Array.isArray(payload.shopOrders) || !payload.shopOrders.length) {
    throw makeHttpError(400, "Please provide shopOrders for checkout");
  }

  const cartItemsById = new Map(cart.items.map((item) => [item._id.toString(), item]));
  const selectedCartItemIds = new Set();
  const selectedProductIds = [];
  const productIds = cart.items.map((item) => item.product).filter(Boolean);
  const products = await Product.find({ _id: { $in: productIds } }).lean();
  const productsById = new Map(products.map((product) => [product._id.toString(), product]));
  const sellerIds = [...new Set(products.map((product) => `${product.seller ?? ""}`).filter(Boolean))];
  const shops = sellerIds.length
    ? await Shop.find({ owner: { $in: sellerIds } }).lean()
    : [];
  const shopsByOwnerId = new Map(shops.map((shop) => [shop.owner.toString(), shop]));

  const nowIso = new Date().toISOString();
  const shopOrders = payload.shopOrders.map((shopOrderInput) => {
    const itemIds = Array.isArray(shopOrderInput?.itemIds)
      ? shopOrderInput.itemIds.map((itemId) => `${itemId ?? ""}`.trim()).filter(Boolean)
      : [];

    if (!itemIds.length) {
      throw makeHttpError(400, "Each shop order must include at least one cart item");
    }

    const sourceCartItems = itemIds.map((itemId) => {
      const sourceCartItem = cartItemsById.get(itemId);
      if (!sourceCartItem) {
        throw makeHttpError(400, "Some cart items are invalid or no longer exist");
      }
      return sourceCartItem;
    });

    sourceCartItems.forEach((cartItem) => {
      const cartItemId = cartItem._id.toString();
      if (selectedCartItemIds.has(cartItemId)) {
        throw makeHttpError(400, "A cart item cannot be checked out more than once");
      }
      selectedCartItemIds.add(cartItemId);
    });

    const referencedProducts = sourceCartItems.map((cartItem) => {
      const product = productsById.get(cartItem.product.toString());
      if (!product) {
        throw makeHttpError(400, "Some products in the cart no longer exist");
      }
      if (`${product.status ?? ""}`.trim().toLowerCase() === "sold") {
        throw makeHttpError(400, "Some products in the cart are no longer available");
      }
      return product;
    });

    const ownerId = referencedProducts[0]?.seller?.toString?.() ?? `${referencedProducts[0]?.seller ?? ""}`;
    if (!ownerId) {
      throw makeHttpError(400, "Could not resolve the seller for the selected products");
    }
    if (ownerId === `${userId}`) {
      throw makeHttpError(400, "You cannot checkout your own products");
    }

    const mixedSeller = referencedProducts.some(
      (product) => (product?.seller?.toString?.() ?? `${product?.seller ?? ""}`) !== ownerId
    );
    if (mixedSeller) {
      throw makeHttpError(400, "Each shop order must contain products from the same seller");
    }

    const shop = shopsByOwnerId.get(ownerId) ?? null;
    const shippingMethod = normalizeShippingMethod(shopOrderInput?.shippingMethod);
    const orderItems = sourceCartItems.map((cartItem) => {
      const product = productsById.get(cartItem.product.toString());
      selectedProductIds.push(product._id.toString());
      return {
        productId: product._id,
        name: product.title,
        imageUrl: Array.isArray(product.images) && product.images.length ? product.images[0] : "",
        price: product.price,
        quantity: cartItem.quantity,
      };
    });
    const subtotal = orderItems.reduce(
      (sum, item) => sum + (Number(item.price) || 0) * (Number(item.quantity) || 0),
      0
    );

    if (shippingMethod === "parcel") {
      const paymentMethod = normalizePaymentMethod(shopOrderInput?.paymentMethod);
      const receiptImageUrl = filesByFieldName.get(`${shopOrderInput?.receiptFileKey ?? ""}`) ?? "";
      if (paymentMethod === "qr_code" && !receiptImageUrl) {
        throw makeHttpError(400, "Receipt image is required for QR code parcel payment");
      }
      if (paymentMethod === "bank_transfer" && !receiptImageUrl) {
        throw makeHttpError(400, "Receipt image is required for bank transfer parcel payment");
      }
      if (paymentMethod === "qr_code" && !shop?.parcelQrCodeUrl) {
        throw makeHttpError(400, "Seller QR code is not available for this shop");
      }
      if (
        paymentMethod === "bank_transfer" &&
        !(`${shop?.bankName ?? ""}`.trim() && `${shop?.bankAccountName ?? ""}`.trim() && `${shop?.bankAccountNumber ?? ""}`.trim())
      ) {
        throw makeHttpError(400, "Seller bank account is not available for this shop");
      }

      const buyerShippingAddressInput =
        shopOrderInput?.buyerShippingAddress && typeof shopOrderInput.buyerShippingAddress === "object"
          ? shopOrderInput.buyerShippingAddress
          : null;
      const requestedAddressId = `${buyerShippingAddressInput?.addressId ?? ""}`.trim();
      const matchedSavedAddress = requestedAddressId ? savedAddressesById.get(requestedAddressId) ?? null : null;
      const fallbackSavedAddress =
        savedAddresses.find((entry) => entry.isDefault) ||
        savedAddresses[0] ||
        null;
      const buyerShippingAddress = matchedSavedAddress
        ? normalizeBuyerShippingAddress(matchedSavedAddress)
        : buyerShippingAddressInput
          ? normalizeBuyerShippingAddress(
              {
                addressId: requestedAddressId,
                label: `${buyerShippingAddressInput.label ?? ""}`.trim(),
                name: `${buyerShippingAddressInput.name ?? ""}`.trim(),
                phone: `${buyerShippingAddressInput.phone ?? ""}`.trim(),
                houseNo: `${buyerShippingAddressInput.houseNo ?? ""}`.trim(),
                village: `${buyerShippingAddressInput.village ?? ""}`.trim(),
                district: `${buyerShippingAddressInput.district ?? ""}`.trim(),
                province: `${buyerShippingAddressInput.province ?? ""}`.trim(),
                postalCode: `${buyerShippingAddressInput.postalCode ?? ""}`.trim(),
                note: `${buyerShippingAddressInput.note ?? ""}`.trim(),
                address: `${buyerShippingAddressInput.address ?? ""}`.trim(),
              },
              fallbackSavedAddress ?? {}
            )
          : fallbackSavedAddress
            ? normalizeBuyerShippingAddress(fallbackSavedAddress)
            : null;

      if (!buyerShippingAddress?.address) {
        throw makeHttpError(400, "Buyer shipping address is required for parcel delivery");
      }

      return {
        shopOrderKey: shop?._id?.toString?.() ?? ownerId,
        ownerId,
        shopId: shop?._id ?? null,
        shopName: shop?.shopName ?? "ร้านค้า",
        shippingMethod,
        status: "pending_payment_verification",
        items: orderItems,
        subtotal,
        parcelPayment: {
          qrCodeUrl: shop?.parcelQrCodeUrl ?? "",
          bankName: shop?.bankName ?? "",
          bankAccountName: shop?.bankAccountName ?? "",
          bankAccountNumber: shop?.bankAccountNumber ?? "",
          receiptImageUrl,
          paymentMethod,
          status: "pending_payment_verification",
          submittedAt: nowIso,
          verifiedAt: "",
          verifiedBy: "",
        },
        parcelShipment: {
          trackingNumber: "",
          carrier: "",
          status: "pending_payment_verification",
          note: "",
          preparedAt: "",
          shippedAt: "",
          updatedAt: nowIso,
        },
        buyerShippingAddress,
      };
    }

    const meetupLocation = `${shopOrderInput?.meetupLocation ?? ""}`.trim();
    if (!meetupLocation) {
      throw makeHttpError(400, "Meetup location is required for meetup orders");
    }

    return {
      shopOrderKey: shop?._id?.toString?.() ?? ownerId,
      ownerId,
      shopId: shop?._id ?? null,
      shopName: shop?.shopName ?? "ร้านค้า",
      shippingMethod,
      status: "pending_seller_response",
      items: orderItems,
      subtotal,
      meetupProposal: {
        location: meetupLocation,
        status: "pending_seller_response",
        proposedBy: `${userId}`,
        proposedAt: nowIso,
        responseLocation: "",
        respondedBy: "",
        respondedAt: "",
      },
      buyerShippingAddress: null,
    };
  });

  const totalPrice = shopOrders.reduce((sum, shopOrder) => sum + (Number(shopOrder.subtotal) || 0), 0);

  return {
    cart,
    selectedCartItemIds,
    selectedProductIds,
    orderData: {
      user: userId,
      notes: payload.notes ?? "",
      totalPrice,
      status: deriveOrderStatus(shopOrders),
      shopOrders,
    },
  };
};

const createOrderFromCartCheckout = async ({ req, userId, body, files }) => {
  let payload;
  try {
    payload = parseCheckoutPayload(body);
  } catch {
    throw makeHttpError(400, "Invalid checkout payload");
  }

  const filesByFieldName = await buildFilesByFieldName(files);
  const { cart, selectedCartItemIds, selectedProductIds, orderData } = await buildCheckoutOrder({
    userId,
    payload,
    filesByFieldName,
  });

  const order = await Order.create(orderData);
  await setProductsAvailability({
    productIds: selectedProductIds,
    sold: true,
    orderId: order._id.toString(),
  });
  await createCheckoutChatsForOrder({
    buyerId: userId,
    order,
  });
  await createNotifications(
    (order.shopOrders ?? [])
      .map((shopOrder) => {
        const ownerId = `${shopOrder?.ownerId?.toString?.() ?? shopOrder?.ownerId ?? ""}`.trim();
        if (!ownerId) return null;

        return {
          userId: ownerId,
          type: "order_created",
          title: "มีคำสั่งซื้อใหม่",
          message: `${shopOrder?.shopName ?? "ร้านค้าของคุณ"} มีคำสั่งซื้อใหม่ ${Array.isArray(shopOrder?.items) ? `(${shopOrder.items.length} รายการ)` : ""}`.trim(),
          target: {
            route: "myshop",
            params: {
              orderId: order._id.toString(),
              shopOrderKey: `${shopOrder?.shopOrderKey ?? ""}`.trim(),
            },
          },
          metadata: {
            orderId: order._id.toString(),
            shopOrderKey: `${shopOrder?.shopOrderKey ?? ""}`.trim(),
            shippingMethod: `${shopOrder?.shippingMethod ?? ""}`.trim(),
          },
        };
      })
      .filter(Boolean)
  );

  cart.items = (cart.items ?? []).filter((item) => !selectedCartItemIds.has(item._id.toString()));
  await cart.save();

  const createdOrder = await getOrderWithBuyer(order._id);
  return {
    order: mapOrder(createdOrder.order, {
      baseUrl: getApiBaseUrl(req),
      buyer: createdOrder.buyer,
    }),
    message: "สร้างคำสั่งซื้อเรียบร้อย",
  };
};

const listOrdersForBuyer = async ({ req, userId }) => {
  const orders = await Order.find({ user: userId }).sort({ createdAt: -1 }).lean();
  const buyer = await User.findById(userId).lean();
  const baseUrl = getApiBaseUrl(req);

  return orders.map((order) =>
    mapOrder(order, {
      baseUrl,
      buyer,
    })
  );
};

const findShopOrderIndex = (order, shopOrderKey) =>
  (order.shopOrders ?? []).findIndex((shopOrder) => {
    const identityKey =
      `${shopOrder?.shopOrderKey ?? ""}`.trim() ||
      `${shopOrder?.shopId?.toString?.() ?? shopOrder?.shopId ?? ""}`.trim() ||
      `${shopOrder?.ownerId?.toString?.() ?? shopOrder?.ownerId ?? ""}`.trim();
    return identityKey === `${shopOrderKey ?? ""}`.trim();
  });

const updateBuyerShopOrderDecision = async ({ req, userId, orderId, shopOrderKey, action }) => {
  if (!mongoose.isValidObjectId(orderId)) {
    throw makeHttpError(400, "Invalid order id");
  }

  const normalizedAction = `${action ?? ""}`.trim().toLowerCase();
  if (!["receive", "reject"].includes(normalizedAction)) {
    throw makeHttpError(400, "Invalid order action");
  }

  const order = await Order.findOne({ _id: orderId, user: userId });
  if (!order) {
    throw makeHttpError(404, "Order not found");
  }

  const shopOrderIndex = findShopOrderIndex(order, shopOrderKey);
  if (shopOrderIndex < 0) {
    throw makeHttpError(404, "Shop order not found");
  }

  const shopOrder = order.shopOrders[shopOrderIndex];
  const productIds = (shopOrder.items ?? []).map((item) => item.productId).filter(Boolean);

  if (normalizedAction === "receive") {
    shopOrder.status = "completed";
    if (shopOrder.parcelPayment) {
      shopOrder.parcelPayment.status = "completed";
    }
    if (shopOrder.meetupProposal) {
      shopOrder.meetupProposal.status = "completed";
      shopOrder.meetupProposal.respondedBy = `${userId}`;
      shopOrder.meetupProposal.respondedAt = new Date().toISOString();
    }
  } else {
    shopOrder.status = "rejected_by_buyer";
    if (shopOrder.parcelPayment) {
      shopOrder.parcelPayment.status = "rejected_by_buyer";
    }
    if (shopOrder.meetupProposal) {
      shopOrder.meetupProposal.status = "rejected_by_buyer";
      shopOrder.meetupProposal.respondedBy = `${userId}`;
      shopOrder.meetupProposal.respondedAt = new Date().toISOString();
    }
    await setProductsAvailability({ productIds, sold: false });
  }

  order.status = deriveOrderStatus(order.shopOrders);
  await order.save();
  await createNotifications([
    {
      userId: `${shopOrder?.ownerId?.toString?.() ?? shopOrder?.ownerId ?? ""}`.trim(),
      type: normalizedAction === "receive" ? "buyer_received_order" : "buyer_rejected_order",
      title: normalizedAction === "receive" ? "ผู้ซื้อยืนยันรับสินค้าแล้ว" : "ผู้ซื้อปฏิเสธสินค้า",
      message:
        normalizedAction === "receive"
          ? `${shopOrder?.shopName ?? "ร้านค้าของคุณ"} มีคำสั่งซื้อที่ผู้ซื้อยืนยันรับของแล้ว`
          : `${shopOrder?.shopName ?? "ร้านค้าของคุณ"} มีคำสั่งซื้อที่ผู้ซื้อปฏิเสธสินค้า`,
      target: {
        route: "myshop",
        params: {
          orderId: order._id.toString(),
          shopOrderKey: `${shopOrder?.shopOrderKey ?? ""}`.trim(),
        },
      },
      metadata: {
        orderId: order._id.toString(),
        shopOrderKey: `${shopOrder?.shopOrderKey ?? ""}`.trim(),
      },
    },
  ]);

  const updatedOrder = await getOrderWithBuyer(order._id);
  return {
    order: mapOrder(updatedOrder.order, {
      baseUrl: getApiBaseUrl(req),
      buyer: updatedOrder.buyer,
    }),
    message: normalizedAction === "receive" ? "ยืนยันรับสินค้าแล้ว" : "ปฏิเสธสินค้าแล้ว",
  };
};

const listSellerParcelPaymentReviews = async ({ req, ownerId }) => {
  const orders = await Order.find({
    "shopOrders.ownerId": ownerId,
    "shopOrders.shippingMethod": "parcel",
  })
    .sort({ createdAt: -1 })
    .lean();

  const buyerIds = [...new Set(orders.map((order) => `${order.user ?? ""}`).filter(Boolean))];
  const buyers = buyerIds.length
    ? await User.find({ _id: { $in: buyerIds } }).lean()
    : [];
  const buyersById = new Map(buyers.map((buyer) => [buyer._id.toString(), buyer]));
  const baseUrl = getApiBaseUrl(req);

  return orders.flatMap((order) =>
    (order.shopOrders ?? [])
      .filter(
        (shopOrder) =>
          `${shopOrder?.ownerId?.toString?.() ?? shopOrder?.ownerId ?? ""}` === `${ownerId}` &&
          `${shopOrder?.shippingMethod ?? ""}`.trim() === "parcel"
      )
      .map((shopOrder) =>
        mapParcelPaymentReview(order, shopOrder, {
          baseUrl,
          buyer: buyersById.get(`${order.user ?? ""}`) ?? null,
        })
      )
  );
};

const updateSellerParcelPaymentReviewDecision = async ({
  req,
  ownerId,
  orderId,
  shopOrderKey,
  action,
  note,
}) => {
  if (!mongoose.isValidObjectId(orderId)) {
    throw makeHttpError(400, "Invalid order id");
  }

  const normalizedAction = `${action ?? ""}`.trim().toLowerCase();
  if (!["approve", "cancel", "report"].includes(normalizedAction)) {
    throw makeHttpError(400, "Invalid review action");
  }

  const order = await Order.findById(orderId);
  if (!order) {
    throw makeHttpError(404, "Order not found");
  }

  const shopOrderIndex = findShopOrderIndex(order, shopOrderKey);
  if (shopOrderIndex < 0) {
    throw makeHttpError(404, "Shop order not found");
  }

  const shopOrder = order.shopOrders[shopOrderIndex];
  const shopOwnerId = `${shopOrder?.ownerId?.toString?.() ?? shopOrder?.ownerId ?? ""}`;
  if (shopOwnerId !== `${ownerId}`) {
    throw makeHttpError(403, "You are not allowed to manage this shop order");
  }

  const productIds = (shopOrder.items ?? []).map((item) => item.productId).filter(Boolean);
  const nowIso = new Date().toISOString();

  if (normalizedAction === "approve") {
    shopOrder.status = "preparing_parcel";
    if (shopOrder.parcelPayment) {
      shopOrder.parcelPayment.status = "preparing_parcel";
      shopOrder.parcelPayment.verifiedAt = nowIso;
      shopOrder.parcelPayment.verifiedBy = `${ownerId}`;
    }
    shopOrder.parcelShipment = {
      trackingNumber: `${shopOrder?.parcelShipment?.trackingNumber ?? ""}`.trim(),
      carrier: `${shopOrder?.parcelShipment?.carrier ?? ""}`.trim(),
      status: "preparing_parcel",
      note: `${shopOrder?.parcelShipment?.note ?? ""}`.trim(),
      preparedAt: `${shopOrder?.parcelShipment?.preparedAt ?? nowIso}`.trim() || nowIso,
      shippedAt: `${shopOrder?.parcelShipment?.shippedAt ?? ""}`.trim(),
      updatedAt: nowIso,
    };
  } else if (normalizedAction === "cancel") {
    shopOrder.status = "cancelled";
    if (shopOrder.parcelPayment) {
      shopOrder.parcelPayment.status = "cancelled";
      shopOrder.parcelPayment.verifiedAt = nowIso;
      shopOrder.parcelPayment.verifiedBy = `${ownerId}`;
    }
    await setProductsAvailability({ productIds, sold: false });
  } else {
    shopOrder.status = "reported_to_admin";
    if (shopOrder.parcelPayment) {
      shopOrder.parcelPayment.status = "reported_to_admin";
      shopOrder.parcelPayment.verifiedAt = nowIso;
      shopOrder.parcelPayment.verifiedBy = `${ownerId}`;
    }
    shopOrder.adminReport = {
      reportId: `${Date.now()}`,
      status: "reported_to_admin",
      reason: `${note ?? ""}`.trim(),
      createdAt: nowIso,
    };
  }

  order.status = deriveOrderStatus(order.shopOrders);
  await order.save();
  await createNotifications([
    {
      userId: `${order?.user?.toString?.() ?? order?.user ?? ""}`.trim(),
      type:
        normalizedAction === "approve"
          ? "parcel_order_approved"
          : normalizedAction === "cancel"
            ? "parcel_order_cancelled"
            : "parcel_order_reported",
      title:
        normalizedAction === "approve"
          ? "คำสั่งซื้อของคุณได้รับการอนุมัติแล้ว"
          : normalizedAction === "cancel"
            ? "คำสั่งซื้อของคุณถูกยกเลิก"
            : "คำสั่งซื้อของคุณถูกรายงานถึงผู้ดูแลระบบ",
      message:
        normalizedAction === "approve"
          ? `${shopOrder?.shopName ?? "ร้านค้า"} ยืนยันคำสั่งซื้อและเตรียมจัดส่งแล้ว`
          : normalizedAction === "cancel"
            ? `${shopOrder?.shopName ?? "ร้านค้า"} ยกเลิกคำสั่งซื้อของคุณแล้ว`
            : `${shopOrder?.shopName ?? "ร้านค้า"} แจ้งผู้ดูแลระบบให้ตรวจสอบคำสั่งซื้อของคุณ`,
      target: {
        route: "orders",
        params: {
          orderId: order._id.toString(),
          shopOrderKey: `${shopOrder?.shopOrderKey ?? ""}`.trim(),
        },
      },
      metadata: {
        orderId: order._id.toString(),
        shopOrderKey: `${shopOrder?.shopOrderKey ?? ""}`.trim(),
      },
    },
  ]);

  const updatedOrder = await getOrderWithBuyer(order._id);
  return {
    order: mapOrder(updatedOrder.order, {
      baseUrl: getApiBaseUrl(req),
      buyer: updatedOrder.buyer,
    }),
    message:
      normalizedAction === "approve"
        ? "ยืนยันคำสั่งซื้อแล้ว"
        : normalizedAction === "cancel"
          ? "ยกเลิกคำสั่งซื้อแล้ว"
          : "รายงานคำสั่งซื้อให้ Admin แล้ว",
  };
};

const updateSellerParcelShipment = async ({
  req,
  ownerId,
  orderId,
  shopOrderKey,
  action,
  trackingNumber,
  carrier,
  note,
}) => {
  if (!mongoose.isValidObjectId(orderId)) {
    throw makeHttpError(400, "Invalid order id");
  }

  const normalizedAction = normalizeShipmentAction(action);
  const normalizedTrackingNumber = normalizeTrackingNumber(trackingNumber);
  const normalizedCarrier = `${carrier ?? ""}`.trim().slice(0, 80);
  const normalizedNote = `${note ?? ""}`.trim().slice(0, 300);

  const order = await Order.findById(orderId);
  if (!order) {
    throw makeHttpError(404, "Order not found");
  }

  const shopOrderIndex = findShopOrderIndex(order, shopOrderKey);
  if (shopOrderIndex < 0) {
    throw makeHttpError(404, "Shop order not found");
  }

  const shopOrder = order.shopOrders[shopOrderIndex];
  const shopOwnerId = `${shopOrder?.ownerId?.toString?.() ?? shopOrder?.ownerId ?? ""}`.trim();
  if (shopOwnerId !== `${ownerId}`) {
    throw makeHttpError(403, "You are not allowed to manage this shop order");
  }

  if (`${shopOrder?.shippingMethod ?? ""}`.trim().toLowerCase() !== "parcel") {
    throw makeHttpError(400, "This shop order is not a parcel delivery");
  }

  const currentStatus = `${shopOrder?.status ?? ""}`.trim().toLowerCase();

  if (["cancelled", "completed", "rejected_by_buyer", "reported_to_admin"].includes(currentStatus)) {
    throw makeHttpError(400, "This shop order can no longer be updated");
  }

  if (currentStatus === "parcel_in_transit") {
    throw makeHttpError(400, "Shipped parcel details can no longer be updated");
  }

  const nowIso = new Date().toISOString();
  const currentShipment = shopOrder?.parcelShipment ?? {};
  const nextTrackingNumber = normalizedTrackingNumber || `${currentShipment?.trackingNumber ?? ""}`.trim();

  if (normalizedAction === "ship" && !nextTrackingNumber) {
    throw makeHttpError(400, "Tracking number is required before marking the parcel as shipped");
  }

  const nextStatus = normalizedAction === "ship" ? "parcel_in_transit" : "preparing_parcel";

  shopOrder.parcelShipment = {
    trackingNumber: nextTrackingNumber,
    carrier: normalizedCarrier || `${currentShipment?.carrier ?? ""}`.trim(),
    status: nextStatus,
    note: normalizedNote || `${currentShipment?.note ?? ""}`.trim(),
    preparedAt:
      `${currentShipment?.preparedAt ?? ""}`.trim() ||
      (nextStatus === "preparing_parcel" || nextStatus === "parcel_in_transit" ? nowIso : ""),
    shippedAt:
      nextStatus === "parcel_in_transit"
        ? `${currentShipment?.shippedAt ?? ""}`.trim() || nowIso
        : `${currentShipment?.shippedAt ?? ""}`.trim(),
    updatedAt: nowIso,
  };
  shopOrder.status = nextStatus;
  if (shopOrder.parcelPayment) {
    shopOrder.parcelPayment.status = nextStatus;
  }

  order.status = deriveOrderStatus(order.shopOrders);
  await order.save();
  await createNotifications([
    {
      userId: `${order?.user?.toString?.() ?? order?.user ?? ""}`.trim(),
      type: normalizedAction === "ship" ? "parcel_shipped" : "parcel_preparing",
      title:
        normalizedAction === "ship"
          ? "ร้านค้าได้จัดส่งพัสดุแล้ว"
          : "ร้านค้ากำลังเตรียมจัดส่งพัสดุ",
      message:
        normalizedAction === "ship"
          ? `${shopOrder?.shopName ?? "ร้านค้า"} จัดส่งพัสดุแล้ว${nextTrackingNumber ? ` (เลขพัสดุ ${nextTrackingNumber})` : ""}`
          : `${shopOrder?.shopName ?? "ร้านค้า"} กำลังเตรียมจัดส่งพัสดุของคุณ`,
      target: {
        route: "orders",
        params: {
          orderId: order._id.toString(),
          shopOrderKey: `${shopOrder?.shopOrderKey ?? ""}`.trim(),
        },
      },
      metadata: {
        orderId: order._id.toString(),
        shopOrderKey: `${shopOrder?.shopOrderKey ?? ""}`.trim(),
        trackingNumber: nextTrackingNumber,
        shippingStatus: nextStatus,
      },
    },
  ]);

  const updatedOrder = await getOrderWithBuyer(order._id);
  return {
    order: mapOrder(updatedOrder.order, {
      baseUrl: getApiBaseUrl(req),
      buyer: updatedOrder.buyer,
    }),
    message:
      normalizedAction === "ship"
        ? "อัปเดตเลขพัสดุและแจ้งจัดส่งเรียบร้อย"
        : "อัปเดตสถานะเป็นกำลังเตรียมจัดส่งแล้ว",
  };
};

module.exports = {
  createOrderFromCartCheckout,
  listOrdersForBuyer,
  updateBuyerShopOrderDecision,
  listSellerParcelPaymentReviews,
  updateSellerParcelPaymentReviewDecision,
  updateSellerParcelShipment,
};
