const toAbsoluteUrl = (value, baseUrl) => {
  const normalizedValue = `${value ?? ""}`.trim();
  const normalizedBaseUrl = `${baseUrl ?? ""}`.trim().replace(/\/+$/, "");

  if (!normalizedValue) return "";
  if (/^(?:https?:)?\/\//i.test(normalizedValue)) return normalizedValue;
  if (normalizedValue.startsWith("blob:") || normalizedValue.startsWith("data:")) return normalizedValue;
  if (normalizedValue.startsWith("/")) {
    return normalizedBaseUrl ? `${normalizedBaseUrl}${normalizedValue}` : normalizedValue;
  }
  return normalizedValue;
};

const mapOrderItem = (item, baseUrl) => ({
  itemId: item?._id?.toString?.() ?? "",
  productId: item?.productId?.toString?.() ?? `${item?.productId ?? ""}`,
  name: item?.name ?? "",
  imageUrl: toAbsoluteUrl(item?.imageUrl, baseUrl),
  price: item?.price ?? 0,
  quantity: item?.quantity ?? 1,
});

const mapShopOrder = (shopOrder, baseUrl) => ({
  shopOrderKey: `${shopOrder?.shopOrderKey ?? ""}`.trim(),
  ownerId: shopOrder?.ownerId?.toString?.() ?? `${shopOrder?.ownerId ?? ""}`,
  shopId: shopOrder?.shopId?.toString?.() ?? `${shopOrder?.shopId ?? ""}`,
  shopName: shopOrder?.shopName ?? "",
  shippingMethod: shopOrder?.shippingMethod ?? "meetup",
  status: shopOrder?.status ?? "",
  items: Array.isArray(shopOrder?.items) ? shopOrder.items.map((item) => mapOrderItem(item, baseUrl)) : [],
  subtotal: shopOrder?.subtotal ?? 0,
  meetupProposal: shopOrder?.meetupProposal
    ? {
        location: shopOrder.meetupProposal.location ?? "",
        status: shopOrder.meetupProposal.status ?? "",
        proposedBy: shopOrder.meetupProposal.proposedBy ?? "",
        proposedAt: shopOrder.meetupProposal.proposedAt ?? "",
        responseLocation: shopOrder.meetupProposal.responseLocation ?? "",
        respondedBy: shopOrder.meetupProposal.respondedBy ?? "",
        respondedAt: shopOrder.meetupProposal.respondedAt ?? "",
      }
    : null,
  parcelPayment: shopOrder?.parcelPayment
    ? {
        qrCodeUrl: toAbsoluteUrl(shopOrder.parcelPayment.qrCodeUrl, baseUrl),
        bankName: shopOrder.parcelPayment.bankName ?? "",
        bankAccountName: shopOrder.parcelPayment.bankAccountName ?? "",
        bankAccountNumber: shopOrder.parcelPayment.bankAccountNumber ?? "",
        receiptImageUrl: toAbsoluteUrl(shopOrder.parcelPayment.receiptImageUrl, baseUrl),
        paymentMethod: shopOrder.parcelPayment.paymentMethod ?? "",
        status: shopOrder.parcelPayment.status ?? "",
        submittedAt: shopOrder.parcelPayment.submittedAt ?? "",
        verifiedAt: shopOrder.parcelPayment.verifiedAt ?? "",
        verifiedBy: shopOrder.parcelPayment.verifiedBy ?? "",
      }
    : null,
  parcelShipment: shopOrder?.parcelShipment
    ? {
        trackingNumber: shopOrder.parcelShipment.trackingNumber ?? "",
        carrier: shopOrder.parcelShipment.carrier ?? "",
        status: shopOrder.parcelShipment.status ?? "",
        note: shopOrder.parcelShipment.note ?? "",
        preparedAt: shopOrder.parcelShipment.preparedAt ?? "",
        shippedAt: shopOrder.parcelShipment.shippedAt ?? "",
        updatedAt: shopOrder.parcelShipment.updatedAt ?? "",
      }
    : null,
  buyerShippingAddress: shopOrder?.buyerShippingAddress
    ? {
        addressId: shopOrder.buyerShippingAddress.addressId ?? "",
        label: shopOrder.buyerShippingAddress.label ?? "",
        name: shopOrder.buyerShippingAddress.name ?? "",
        phone: shopOrder.buyerShippingAddress.phone ?? "",
        houseNo: shopOrder.buyerShippingAddress.houseNo ?? "",
        village: shopOrder.buyerShippingAddress.village ?? "",
        subdistrict: shopOrder.buyerShippingAddress.subdistrict ?? "",
        district: shopOrder.buyerShippingAddress.district ?? "",
        province: shopOrder.buyerShippingAddress.province ?? "",
        postalCode: shopOrder.buyerShippingAddress.postalCode ?? "",
        note: shopOrder.buyerShippingAddress.note ?? "",
        address: shopOrder.buyerShippingAddress.address ?? "",
      }
    : null,
  adminReport: shopOrder?.adminReport
    ? {
        reportId: shopOrder.adminReport.reportId ?? "",
        status: shopOrder.adminReport.status ?? "",
        reason: shopOrder.adminReport.reason ?? "",
        createdAt: shopOrder.adminReport.createdAt ?? "",
      }
    : null,
});

const mapOrder = (order, { baseUrl, buyer } = {}) => {
  const normalizedShopOrders = Array.isArray(order?.shopOrders)
    ? order.shopOrders.map((shopOrder) => mapShopOrder(shopOrder, baseUrl))
    : [];

  return {
    id: order?._id?.toString?.() ?? "",
    userId: order?.user?.toString?.() ?? `${order?.user ?? ""}`,
    status: order?.status ?? "",
    notes: order?.notes ?? "",
    totalPrice: order?.totalPrice ?? 0,
    createdAt: order?.createdAt ?? "",
    buyer: buyer
      ? {
          id: buyer._id?.toString?.() ?? "",
          name: buyer.name ?? "",
          email: buyer.email ?? "",
          phone: buyer.phone ?? "",
          avatarUrl: toAbsoluteUrl(buyer.avatarUrl, baseUrl),
        }
      : undefined,
    items: normalizedShopOrders.flatMap((shopOrder) => shopOrder.items ?? []),
    shopOrders: normalizedShopOrders,
  };
};

const mapParcelPaymentReview = (order, shopOrder, { baseUrl, buyer } = {}) => ({
  orderId: order?._id?.toString?.() ?? "",
  shopOrderKey: `${shopOrder?.shopOrderKey ?? ""}`.trim(),
  ownerId: shopOrder?.ownerId?.toString?.() ?? `${shopOrder?.ownerId ?? ""}`,
  shopId: shopOrder?.shopId?.toString?.() ?? `${shopOrder?.shopId ?? ""}`,
  shopName: shopOrder?.shopName ?? "",
  buyerId: buyer?._id?.toString?.() ?? "",
  buyerName: buyer?.name ?? "",
  buyerAvatarUrl: toAbsoluteUrl(buyer?.avatarUrl, baseUrl),
  notes: order?.notes ?? "",
  status: shopOrder?.status ?? "",
  subtotal: shopOrder?.subtotal ?? 0,
  items: Array.isArray(shopOrder?.items) ? shopOrder.items.map((item) => mapOrderItem(item, baseUrl)) : [],
  createdAt: order?.createdAt ?? "",
  submittedAt: shopOrder?.parcelPayment?.submittedAt ?? order?.updatedAt ?? "",
  receiptImageUrl: toAbsoluteUrl(shopOrder?.parcelPayment?.receiptImageUrl, baseUrl),
  paymentMethod: shopOrder?.parcelPayment?.paymentMethod ?? "",
  buyerShippingAddress: shopOrder?.buyerShippingAddress
    ? {
        addressId: shopOrder.buyerShippingAddress.addressId ?? "",
        label: shopOrder.buyerShippingAddress.label ?? "",
        name: shopOrder.buyerShippingAddress.name ?? "",
        phone: shopOrder.buyerShippingAddress.phone ?? "",
        houseNo: shopOrder.buyerShippingAddress.houseNo ?? "",
        village: shopOrder.buyerShippingAddress.village ?? "",
        subdistrict: shopOrder.buyerShippingAddress.subdistrict ?? "",
        district: shopOrder.buyerShippingAddress.district ?? "",
        province: shopOrder.buyerShippingAddress.province ?? "",
        postalCode: shopOrder.buyerShippingAddress.postalCode ?? "",
        note: shopOrder.buyerShippingAddress.note ?? "",
        address: shopOrder.buyerShippingAddress.address ?? "",
      }
    : null,
  adminReport: shopOrder?.adminReport
    ? {
        reportId: shopOrder.adminReport.reportId ?? "",
        status: shopOrder.adminReport.status ?? "",
        reason: shopOrder.adminReport.reason ?? "",
        createdAt: shopOrder.adminReport.createdAt ?? "",
      }
    : null,
  parcelPayment: shopOrder?.parcelPayment
    ? {
        qrCodeUrl: toAbsoluteUrl(shopOrder.parcelPayment.qrCodeUrl, baseUrl),
        bankName: shopOrder.parcelPayment.bankName ?? "",
        bankAccountName: shopOrder.parcelPayment.bankAccountName ?? "",
        bankAccountNumber: shopOrder.parcelPayment.bankAccountNumber ?? "",
        receiptImageUrl: toAbsoluteUrl(shopOrder.parcelPayment.receiptImageUrl, baseUrl),
        paymentMethod: shopOrder.parcelPayment.paymentMethod ?? "",
        status: shopOrder.parcelPayment.status ?? "",
        submittedAt: shopOrder.parcelPayment.submittedAt ?? "",
        verifiedAt: shopOrder.parcelPayment.verifiedAt ?? "",
        verifiedBy: shopOrder.parcelPayment.verifiedBy ?? "",
      }
    : null,
  parcelShipment: shopOrder?.parcelShipment
    ? {
        trackingNumber: shopOrder.parcelShipment.trackingNumber ?? "",
        carrier: shopOrder.parcelShipment.carrier ?? "",
        status: shopOrder.parcelShipment.status ?? "",
        note: shopOrder.parcelShipment.note ?? "",
        preparedAt: shopOrder.parcelShipment.preparedAt ?? "",
        shippedAt: shopOrder.parcelShipment.shippedAt ?? "",
        updatedAt: shopOrder.parcelShipment.updatedAt ?? "",
      }
    : null,
});

module.exports = {
  mapOrder,
  mapParcelPaymentReview,
  toAbsoluteUrl,
};
