import React from "react";
import { ParcelPaymentMethod } from "../models/ParcelPaymentMethod";
import { ShippingMethod } from "../models/ShippingMethod";
import {
  composeStructuredAddress,
  getAddressFieldLine,
  getAddressLocationLine,
} from "../utils/addressFormatter";

const formatCurrency = (value) =>
  new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);

const normalizeBuyerAddressEntry = (entry = {}, fallback = {}) => {
  const houseNo = `${entry?.houseNo ?? ""}`.trim();
  const village = `${entry?.village ?? ""}`.trim();
  const district = `${entry?.district ?? ""}`.trim();
  const province = `${entry?.province ?? ""}`.trim();
  const postalCode = `${entry?.postalCode ?? ""}`.trim();
  const note = `${entry?.note ?? ""}`.trim();
  const address =
    composeStructuredAddress({ houseNo, village, district, province, postalCode, note }) ||
    `${entry?.address ?? fallback.address ?? ""}`.trim();

  return {
    id: `${entry?.id ?? ""}`.trim() || `${fallback.id ?? ""}`.trim(),
    label: `${entry?.label ?? fallback.label ?? ""}`.trim(),
    name: `${entry?.name ?? entry?.recipientName ?? fallback.name ?? ""}`.trim(),
    phone: `${entry?.phone ?? fallback.phone ?? ""}`.trim(),
    houseNo,
    village,
    district,
    province,
    postalCode,
    note,
    address,
    isDefault: Boolean(entry?.isDefault ?? fallback.isDefault),
  };
};

export class CartPopup extends React.Component {
  state = {
    shopDrafts: {},
    validationError: "",
    checkoutNote: "",
  };

  stop = (e) => e.stopPropagation();

  componentDidMount() {
    this.syncDraftsFromItems(this.props.items);
  }

  componentDidUpdate(prevProps) {
    if (this.getItemsSignature(prevProps.items) !== this.getItemsSignature(this.props.items)) {
      this.syncDraftsFromItems(this.props.items);
    }
  }

  componentWillUnmount() {
    Object.values(this.state.shopDrafts ?? {}).forEach((draft) => {
      this.revokePreviewUrl(draft?.receiptPreviewUrl);
    });
  }

  getItemsSignature(items = []) {
    return (Array.isArray(items) ? items : [])
      .map((item) => `${item?.id ?? item?.productId ?? ""}:${item?.quantity ?? 0}:${item?.ownerId ?? ""}`)
      .join("|");
  }

  revokePreviewUrl(previewUrl) {
    if (!previewUrl || typeof URL === "undefined") return;
    try {
      URL.revokeObjectURL(previewUrl);
    } catch {
      // ignore cleanup error
    }
  }

  getShopGroups(items = []) {
    const groupsMap = new Map();

    (Array.isArray(items) ? items : []).forEach((item) => {
      const shopKey =
        item?.getShopKey?.() ??
        `${item?.shopId ?? item?.ownerId ?? item?.productId ?? item?.id ?? "shop"}`.trim();
      const existing = groupsMap.get(shopKey);

      if (existing) {
        existing.items.push(item);
        existing.subtotal += item?.getLineTotalNumber?.() ?? 0;
        return;
      }

      groupsMap.set(shopKey, {
        shopKey,
        shopId: item?.shopId ?? "",
        ownerId: item?.ownerId ?? "",
        shopName: item?.getShopName?.() ?? item?.shopName ?? "ร้านค้า",
        shopAvatarUrl: item?.shopAvatarUrl ?? "",
        shopParcelQrCodeUrl: item?.shopParcelQrCodeUrl ?? "",
        shopBankName: item?.shopBankName ?? "",
        shopBankAccountName: item?.shopBankAccountName ?? "",
        shopBankAccountNumber: item?.shopBankAccountNumber ?? "",
        items: [item],
        subtotal: item?.getLineTotalNumber?.() ?? 0,
      });
    });

    return Array.from(groupsMap.values());
  }

  syncDraftsFromItems(items = []) {
    const groups = this.getShopGroups(items);
    const buyerSavedAddresses = this.getBuyerSavedAddresses();
    const defaultAddressId =
      buyerSavedAddresses.find((entry) => entry.isDefault)?.id ||
      buyerSavedAddresses[0]?.id ||
      "";

    this.setState((state) => {
      const nextShopDrafts = {};

      groups.forEach((group) => {
        const currentDraft = state.shopDrafts?.[group.shopKey];
        nextShopDrafts[group.shopKey] = {
          shippingMethod: currentDraft?.shippingMethod ?? ShippingMethod.MEETUP,
          parcelPaymentMethod:
            currentDraft?.parcelPaymentMethod ?? ParcelPaymentMethod.QR_CODE,
          meetupLocation: currentDraft?.meetupLocation ?? "",
          selectedAddressId: currentDraft?.selectedAddressId ?? defaultAddressId,
          receiptFile: currentDraft?.receiptFile ?? null,
          receiptPreviewUrl: currentDraft?.receiptPreviewUrl ?? "",
        };
      });

      Object.entries(state.shopDrafts ?? {}).forEach(([shopKey, draft]) => {
        if (!nextShopDrafts[shopKey]) {
          this.revokePreviewUrl(draft?.receiptPreviewUrl);
        }
      });

      return {
        shopDrafts: nextShopDrafts,
      };
    });
  }

  setShopDraft(shopKey, patch = {}) {
    this.setState((state) => ({
      shopDrafts: {
        ...(state.shopDrafts ?? {}),
        [shopKey]: {
          ...(state.shopDrafts?.[shopKey] ?? {}),
          ...patch,
        },
      },
      validationError: "",
    }));
  }

  setShippingMethod = (shopKey, shippingMethod) => {
    const normalizedMethod = ShippingMethod.normalize(shippingMethod);
    this.setShopDraft(shopKey, {
      shippingMethod: normalizedMethod,
    });
  };

  setMeetupLocation = (shopKey, meetupLocation) => {
    this.setShopDraft(shopKey, { meetupLocation });
  };

  setParcelPaymentMethod = (shopKey, parcelPaymentMethod) => {
    this.setShopDraft(shopKey, {
      parcelPaymentMethod: ParcelPaymentMethod.normalize(parcelPaymentMethod),
    });
  };

  getBuyerSavedAddresses() {
    const buyer = this.props.buyer ?? {};
    const savedAddresses = Array.isArray(buyer?.addresses)
      ? buyer.addresses
          .map((entry, index) =>
            normalizeBuyerAddressEntry(
              {
                ...entry,
                id: `${entry?.id ?? ""}`.trim() || `address-${index + 1}`,
                label: `${entry?.label ?? ""}`.trim() || `ที่อยู่ ${index + 1}`,
                recipientName: `${entry?.recipientName ?? buyer?.name ?? ""}`.trim(),
                phone: `${entry?.phone ?? buyer?.phone ?? ""}`.trim(),
              },
              {
                id: `address-${index + 1}`,
                label: `ที่อยู่ ${index + 1}`,
                name: `${buyer?.name ?? ""}`.trim(),
                phone: `${buyer?.phone ?? ""}`.trim(),
              },
            )
          )
          .filter((entry) => entry.address)
      : [];

    if (savedAddresses.length) {
      const defaultIndex = savedAddresses.findIndex((entry) => entry.isDefault);
      return savedAddresses.map((entry, index) => ({
        ...entry,
        isDefault: index === (defaultIndex >= 0 ? defaultIndex : 0),
      }));
    }

    const fallbackAddress = `${buyer?.address ?? ""}`.trim();
    if (!fallbackAddress) return [];

    return [
      normalizeBuyerAddressEntry({
        id: "address-1",
        label: "ที่อยู่หลัก",
        name: `${buyer?.name ?? ""}`.trim(),
        phone: `${buyer?.phone ?? ""}`.trim(),
        address: fallbackAddress,
        isDefault: true,
      }),
    ];
  }

  setSelectedAddressId = (shopKey, selectedAddressId) => {
    this.setShopDraft(shopKey, { selectedAddressId: `${selectedAddressId ?? ""}`.trim() });
  };

  setReceiptFile = (shopKey, receiptFile) => {
    const previousPreviewUrl = this.state.shopDrafts?.[shopKey]?.receiptPreviewUrl ?? "";
    const nextReceiptFile = receiptFile ?? null;
    const nextPreviewUrl =
      nextReceiptFile && typeof URL !== "undefined" ? URL.createObjectURL(nextReceiptFile) : "";

    this.revokePreviewUrl(previousPreviewUrl);
    this.setShopDraft(shopKey, {
      receiptFile: nextReceiptFile,
      receiptPreviewUrl: nextPreviewUrl,
    });
  };

  setCheckoutNote = (checkoutNote) => {
    this.setState({
      checkoutNote: `${checkoutNote ?? ""}`.slice(0, 500),
      validationError: "",
    });
  };

  buildCheckoutPayload() {
    const groups = this.getShopGroups(this.props.items);
    if (!groups.length) return null;

    const buyerName = `${this.props.buyer?.name ?? ""}`.trim();
    const buyerPhone = `${this.props.buyer?.phone ?? ""}`.trim();
    const buyerAddress = `${this.props.buyer?.address ?? ""}`.trim();
    const buyerSavedAddresses = this.getBuyerSavedAddresses();
    const shopOrders = [];

    for (const group of groups) {
      const draft = this.state.shopDrafts?.[group.shopKey] ?? {};
      const shippingMethod = ShippingMethod.normalize(draft.shippingMethod);
      const parcelPaymentMethod = ParcelPaymentMethod.normalize(draft.parcelPaymentMethod);
      const meetupLocation = `${draft?.meetupLocation ?? ""}`.trim();
      const selectedAddressId = `${draft?.selectedAddressId ?? ""}`.trim();
      const receiptFile = draft?.receiptFile ?? null;
      const effectiveReceiptFile = ParcelPaymentMethod.requiresReceipt(parcelPaymentMethod)
        ? receiptFile
        : null;
      const selectedAddress =
        buyerSavedAddresses.find((entry) => entry.id === selectedAddressId) ||
        buyerSavedAddresses.find((entry) => entry.isDefault) ||
        buyerSavedAddresses[0] ||
        null;

      if (ShippingMethod.isMeetup(shippingMethod) && !meetupLocation) {
        this.setState({
          validationError: `กรุณาระบุสถานที่นัดรับสำหรับร้าน ${group.shopName}`,
        });
        return null;
      }

      if (
        ShippingMethod.isParcel(shippingMethod) &&
        ParcelPaymentMethod.requiresSellerQrCode(parcelPaymentMethod) &&
        !group.shopParcelQrCodeUrl
      ) {
        this.setState({
          validationError: `ร้าน ${group.shopName} ยังไม่ได้ตั้งค่า QR code รับชำระ`,
        });
        return null;
      }

      if (
        ShippingMethod.isParcel(shippingMethod) &&
        ParcelPaymentMethod.requiresSellerBankAccount(parcelPaymentMethod) &&
        !(group.shopBankName && group.shopBankAccountName && group.shopBankAccountNumber)
      ) {
        this.setState({
          validationError: `à¸£à¹‰à¸²à¸™ ${group.shopName} à¸¢à¸±à¸‡à¹„à¸¡à¹ˆà¹„à¸”à¹‰à¸•à¸±à¹‰à¸‡à¸„à¹ˆà¸²à¸šà¸±à¸à¸Šà¸µà¸˜à¸™à¸²à¸„à¸²à¸£à¸£à¸±à¸šà¹‚à¸­à¸™`,
        });
        return null;
      }

      if (
        ShippingMethod.isParcel(shippingMethod) &&
        ParcelPaymentMethod.requiresReceipt(parcelPaymentMethod) &&
        !effectiveReceiptFile
      ) {
        this.setState({
          validationError: `กรุณาแนบใบเสร็จสำหรับร้าน ${group.shopName}`,
        });
        return null;
      }

      if (
        ShippingMethod.isParcel(shippingMethod) &&
        !(selectedAddress?.address || buyerAddress)
      ) {
        this.setState({
          validationError: "กรุณากรอกที่อยู่ในโปรไฟล์ก่อนเลือกส่งพัสดุ",
        });
        return null;
      }

      shopOrders.push({
        shopId: group.shopId,
        ownerId: group.ownerId,
        shopName: group.shopName,
        itemIds: group.items.map((item) => item?.id ?? "").filter(Boolean),
        shippingMethod,
        paymentMethod: ShippingMethod.isParcel(shippingMethod) ? parcelPaymentMethod : "",
        meetupLocation,
        receiptFile: effectiveReceiptFile,
        buyerShippingAddress: ShippingMethod.isParcel(shippingMethod)
          ? {
              addressId: selectedAddress?.id ?? "",
              label: selectedAddress?.label ?? "",
              name: selectedAddress?.name ?? buyerName,
              phone: selectedAddress?.phone ?? buyerPhone,
              houseNo: selectedAddress?.houseNo ?? "",
              village: selectedAddress?.village ?? "",
              district: selectedAddress?.district ?? "",
              province: selectedAddress?.province ?? "",
              postalCode: selectedAddress?.postalCode ?? "",
              note: selectedAddress?.note ?? "",
              address: selectedAddress?.address ?? buyerAddress,
            }
          : null,
      });
    }

    return {
      shopOrders,
      notes: `${this.state.checkoutNote ?? ""}`.trim(),
    };
  }

  submitCheckout = () => {
    const payload = this.buildCheckoutPayload();
    if (!payload) return;
    this.props.onCheckout?.(payload);
  };

  render() {
    const {
      items,
      loading,
      error,
      done,
      checkingOut,
      totalLabel,
      onClose,
      onOpenItem,
      onRemoveItem,
    } = this.props;
    const { validationError, shopDrafts, checkoutNote } = this.state;
    const shopGroups = this.getShopGroups(items);
    const buyerSavedAddresses = this.getBuyerSavedAddresses();
    const buyerName = `${this.props.buyer?.name ?? ""}`.trim();
    const buyerPhone = `${this.props.buyer?.phone ?? ""}`.trim();
    const buyerAddress = `${this.props.buyer?.address ?? ""}`.trim();

    return (
      <div className="app-popover-overlay fixed inset-0 z-50" onClick={onClose}>
        <div
          className="app-drawer-panel md:mr-5"
          onClick={this.stop}
        >
          <div className="app-sheet-card app-surface-card hide-scrollbar rounded-3xl p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-base font-semibold text-zinc-900">ตะกร้าสินค้า</div>
              <div className="text-xs text-zinc-500">แยกการจัดส่งตามร้าน</div>
            </div>

            {loading ? <div className="text-sm text-zinc-500">กำลังโหลดตะกร้าสินค้า...</div> : null}
            {error ? (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            ) : null}
            {done ? (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
                {done}
              </div>
            ) : null}
            {validationError ? (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {validationError}
              </div>
            ) : null}

            {!loading && !items?.length ? (
              <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-4 text-center text-sm text-zinc-500">
                ยังไม่มีสินค้าในตะกร้า
              </div>
            ) : null}

            {!loading && shopGroups.length ? (
              <div className="max-h-[70dvh] space-y-3 overflow-y-auto hide-scrollbar pr-1">
                {shopGroups.map((group) => {
                  const shopDraft = shopDrafts?.[group.shopKey] ?? {};
                  const shippingMethod = ShippingMethod.normalize(shopDraft.shippingMethod);
                  const parcelPaymentMethod = ParcelPaymentMethod.normalize(
                    shopDraft?.parcelPaymentMethod,
                  );
                  const selectedAddressId = `${shopDraft?.selectedAddressId ?? ""}`.trim();
                  const selectedAddress =
                    buyerSavedAddresses.find((entry) => entry.id === selectedAddressId) ||
                    buyerSavedAddresses.find((entry) => entry.isDefault) ||
                    buyerSavedAddresses[0] ||
                    null;

                  return (
                    <section key={group.shopKey} className="app-soft-panel rounded-2xl p-3 space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="h-11 w-11 shrink-0 rounded-full bg-zinc-100 overflow-hidden grid place-items-center">
                            {group.shopAvatarUrl ? (
                              <img
                                src={group.shopAvatarUrl}
                                alt={group.shopName}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <span className="text-xs text-zinc-500">ร้าน</span>
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="truncate text-sm font-semibold text-zinc-900">{group.shopName}</div>
                            <div className="text-xs text-zinc-500">{group.items.length} รายการ</div>
                          </div>
                        </div>
                        <div className="text-sm font-semibold text-zinc-800">{formatCurrency(group.subtotal)}</div>
                      </div>

                      <div className="space-y-2">
                        {group.items.map((item, index) => (
                          <div
                            key={item.id || item.productId || `${item.name}-${index}`}
                            className="flex items-center gap-2 rounded-xl border border-zinc-200 p-2"
                          >
                            <button
                              type="button"
                              className="flex flex-1 items-center gap-3 text-left"
                              onClick={() => onOpenItem?.(item)}
                              title="ดูหน้าสินค้า"
                            >
                              <div className="h-14 w-14 shrink-0 rounded-lg bg-zinc-100 overflow-hidden grid place-items-center">
                                {item?.imageUrl ? (
                                  <img
                                    src={item.imageUrl}
                                    alt={item?.name ?? "cart-item"}
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <span className="text-xs text-zinc-400">ไม่มีรูป</span>
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="line-clamp-2 text-sm font-semibold text-zinc-800 break-words">
                                  {item?.name || "ไม่ระบุชื่อสินค้า"}
                                </div>
                                <div className="text-xs text-zinc-500">
                                  {item?.getPriceLabel?.() ?? "฿0.00"} x {item?.quantity ?? 1}
                                </div>
                                <div className="text-sm font-medium text-zinc-700">
                                  {item?.getLineTotalLabel?.() ?? "฿0.00"}
                                </div>
                              </div>
                            </button>

                            <button
                              type="button"
                              className="rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50"
                              onClick={() => onRemoveItem?.(item)}
                            >
                              ลบ
                            </button>
                          </div>
                        ))}
                      </div>

                      <div className="space-y-2">
                        <div className="text-sm font-medium text-zinc-700">วิธีการจัดส่ง</div>
                        <div className="grid grid-cols-2 gap-2">
                          {ShippingMethod.list().map((method) => {
                            const active = shippingMethod === method;
                            return (
                              <button
                                key={`${group.shopKey}-${method}`}
                                type="button"
                      className={`rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                        active
                          ? "border-amber-300 bg-[#F4D03E] text-zinc-900"
                          : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
                      }`}
                      onClick={() => this.setShippingMethod(group.shopKey, method)}
                      aria-pressed={active}
                    >
                                {ShippingMethod.getLabel(method)}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {ShippingMethod.isMeetup(shippingMethod) ? (
                        <div className="app-soft-panel space-y-2 rounded-2xl p-3">
                          <div className="text-sm font-medium text-zinc-800">สถานที่นัดรับ</div>
                          <textarea
                            className="min-h-24 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none"
                            placeholder="เช่น BTS อโศก หน้า exit 3 เวลา 18:00 น."
                            value={shopDraft?.meetupLocation ?? ""}
                            onChange={(e) => this.setMeetupLocation(group.shopKey, e.target.value)}
                          />
                          <div className="text-xs text-zinc-500">
                            ระบบจะส่งข้อเสนอสถานที่นัดรับนี้ไปยังคนขายผ่านแชท เพื่อให้ตอบรับ เสนอเปลี่ยนสถานที่ หรือปฏิเสธ
                          </div>
                        </div>
                      ) : null}

                      {ShippingMethod.isParcel(shippingMethod) ? (
                        <div className="app-soft-panel space-y-3 rounded-2xl p-3">
                          <div className="space-y-2">
                            <div className="text-sm font-medium text-zinc-800">การชำระเงินสำหรับพัสดุ</div>
                            <div className="grid gap-2 sm:grid-cols-2">
                              {ParcelPaymentMethod.list().map((method) => {
                                const active = parcelPaymentMethod === method;
                                return (
                                  <button
                                    key={`${group.shopKey}-${method}`}
                                    type="button"
                          className={`rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                            active
                              ? "border-amber-300 bg-[#F4D03E] text-zinc-900"
                              : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
                          }`}
                          onClick={() => this.setParcelPaymentMethod(group.shopKey, method)}
                          aria-pressed={active}
                        >
                                    {ParcelPaymentMethod.getLabel(method)}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          <div className="rounded-2xl border border-zinc-200 bg-white p-3 space-y-1">
                            <div className="text-sm font-medium text-zinc-800">ที่อยู่จัดส่งของผู้ซื้อ</div>
                            {buyerSavedAddresses.length ? (
                              <>
                                <label className="space-y-1">
                                  <div className="text-xs text-zinc-500">เลือกที่อยู่ปลายทาง</div>
                                  <select
                                    className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none"
                                    value={selectedAddress?.id ?? ""}
                                    onChange={(e) => this.setSelectedAddressId(group.shopKey, e.target.value)}
                                  >
                                    {buyerSavedAddresses.map((entry) => (
                                      <option key={entry.id} value={entry.id}>
                                        {entry.label}
                                        {entry.isDefault ? " (หลัก)" : ""}
                                      </option>
                                    ))}
                                  </select>
                                </label>
                                <div className="text-sm text-zinc-700">
                                  {[selectedAddress?.name || buyerName, selectedAddress?.phone || buyerPhone]
                                    .filter(Boolean)
                                    .join(" | ") || "ยังไม่ได้ระบุชื่อหรือเบอร์โทร"}
                                </div>
                                <div className="text-sm text-zinc-600 whitespace-pre-line break-words">
                                  {selectedAddress?.address ||
                                    buyerAddress ||
                                    "ยังไม่ได้ระบุที่อยู่ในโปรไฟล์ กรุณาไปแก้ไขบัญชีก่อนยืนยันการสั่งซื้อ"}
                                </div>
                              </>
                            ) : (
                              <>
                                <div className="text-sm text-zinc-700">
                                  {buyerName || buyerPhone
                                    ? [buyerName, buyerPhone].filter(Boolean).join(" | ")
                                    : "ยังไม่ได้ระบุชื่อหรือเบอร์โทร"}
                                </div>
                                <div className="text-sm text-zinc-600 whitespace-pre-line break-words">
                                  {buyerAddress ||
                                    "ยังไม่ได้ระบุที่อยู่ในโปรไฟล์ กรุณาไปแก้ไขบัญชีก่อนยืนยันการสั่งซื้อ"}
                                </div>
                              </>
                            )}
                          </div>

                          {ParcelPaymentMethod.requiresSellerQrCode(parcelPaymentMethod) ? (
                            group.shopParcelQrCodeUrl ? (
                              <div className="grid gap-3 sm:grid-cols-[7rem_minmax(0,1fr)] sm:items-start">
                                <div className="aspect-square rounded-2xl border border-zinc-200 bg-white overflow-hidden">
                                  <img
                                    src={group.shopParcelQrCodeUrl}
                                    alt={`qr-${group.shopName}`}
                                    className="h-full w-full object-contain"
                                  />
                                </div>
                                <div className="space-y-2">
                                  {group.shopBankAccountName ? (
                                    <div className="rounded-xl border border-zinc-200 bg-white p-2 text-sm text-zinc-700">
                                      ชื่อบัญชี: <span className="font-semibold text-zinc-900">{group.shopBankAccountName}</span>
                                    </div>
                                  ) : null}
                                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800">
                                    ร้านนี้เปิดรับการชำระแบบ QR แล้ว หลังโอนเงินให้แนบใบเสร็จเพื่อส่งคำสั่งซื้อไปให้คนขายตรวจสอบ
                                  </div>
                                  <label className="space-y-1">
                                    <div className="text-sm text-zinc-700">แนบรูปใบเสร็จ</div>
                                    <input
                                      type="file"
                                      accept="image/*"
                                      className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none file:mr-3 file:rounded-lg file:border-0 file:bg-zinc-100 file:px-3 file:py-1.5"
                                      onChange={(e) => this.setReceiptFile(group.shopKey, e.target.files?.[0] ?? null)}
                                    />
                                  </label>
                                  {shopDraft?.receiptFile ? (
                                    <div className="text-xs text-zinc-500">{shopDraft.receiptFile.name}</div>
                                  ) : null}
                                </div>
                              </div>
                            ) : (
                              <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                                ร้านนี้ยังไม่ได้อัปโหลด QR code รับชำระ จึงยังไม่สามารถเลือกส่งพัสดุได้
                              </div>
                            )
                          ) : ParcelPaymentMethod.requiresSellerBankAccount(parcelPaymentMethod) ? (
                            group.shopBankName && group.shopBankAccountName && group.shopBankAccountNumber ? (
                              <div className="space-y-3">
                                <div className="rounded-2xl border border-zinc-200 bg-white p-3 space-y-1">
                                  <div className="text-sm font-medium text-zinc-800">บัญชีสำหรับรับโอน</div>
                                  <div className="text-sm text-zinc-700">ธนาคาร: {group.shopBankName}</div>
                                  <div className="text-sm text-zinc-700">ชื่อบัญชี: {group.shopBankAccountName}</div>
                                  <div className="text-sm font-semibold text-zinc-900">เลขบัญชี: {group.shopBankAccountNumber}</div>
                                </div>
                                <div className="rounded-xl border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800">
                                  โอนเข้าบัญชีของร้านแล้วแนบสลิปเพื่อส่งคำสั่งซื้อไปให้คนขายตรวจสอบ
                                </div>
                                <label className="space-y-1">
                                  <div className="text-sm text-zinc-700">แนบรูปใบเสร็จ</div>
                                  <input
                                    type="file"
                                    accept="image/*"
                                    className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none file:mr-3 file:rounded-lg file:border-0 file:bg-zinc-100 file:px-3 file:py-1.5"
                                    onChange={(e) => this.setReceiptFile(group.shopKey, e.target.files?.[0] ?? null)}
                                  />
                                </label>
                                {shopDraft?.receiptFile ? (
                                  <div className="text-xs text-zinc-500">{shopDraft.receiptFile.name}</div>
                                ) : null}
                              </div>
                            ) : (
                              <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                                ร้านนี้ยังไม่ได้ตั้งค่าบัญชีธนาคารรับโอน จึงยังไม่สามารถเลือกวิธีนี้ได้
                              </div>
                            )
                          ) : (
                            <div className="rounded-xl border border-sky-200 bg-sky-50 p-3 text-sm text-sky-800">
                              {ParcelPaymentMethod.getDescription(parcelPaymentMethod)}
                            </div>
                          )}

                          {shopDraft?.receiptPreviewUrl &&
                          ParcelPaymentMethod.requiresReceipt(parcelPaymentMethod) ? (
                            <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
                              <img
                                src={shopDraft.receiptPreviewUrl}
                                alt={`receipt-${group.shopName}`}
                                className="max-h-64 w-full object-contain"
                              />
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                    </section>
                  );
                })}
              </div>
            ) : null}

            <div className="app-soft-panel rounded-xl px-3 py-2.5 text-sm text-zinc-700">
              รวมทั้งหมด: <span className="font-semibold text-zinc-900">{totalLabel}</span>
            </div>

            <div className="app-soft-panel rounded-xl px-3 py-2.5 text-xs text-zinc-600">
              การกดสั่งซื้อจะสร้างคำขอแยกตามร้าน และส่งแจ้งเตือนไปยังห้องแชทของร้านค้านั้นอัตโนมัติ
            </div>

            <div className="space-y-1">
              <div className="text-sm font-medium text-zinc-700">หมายเหตุถึงร้านค้า</div>
              <textarea
                className="min-h-24 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none"
                placeholder="เช่น โทรก่อนส่ง ฝากไว้หน้าบ้าน หรือรายละเอียดเพิ่มเติมอื่นๆ"
                value={checkoutNote}
                maxLength={500}
                onChange={(e) => this.setCheckoutNote(e.target.value)}
              />
              <div className="text-right text-xs text-zinc-500">{`${checkoutNote.length}/500`}</div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                className="rounded-xl bg-[#F4D03E] px-4 py-2.5 text-sm font-semibold text-black disabled:opacity-50"
                disabled={checkingOut || !items?.length}
                onClick={this.submitCheckout}
              >
                {checkingOut ? "กำลังส่งคำขอ..." : "ยืนยันคำสั่งซื้อ"}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

export class ProfilePopup extends React.Component {
  stop = (e) => e.stopPropagation();

  render() {
    const {
      user,
      onClose,
      onEdit,
      onGoMyShop,
      onGoMyOrders,
      onLogout,
      showGoMyShopButton = true,
      goMyShopButtonClassName = "w-full rounded-xl bg-[#F4D03E] px-3 py-2.5 text-sm font-semibold text-black",
      goMyOrdersButtonClassName = "w-full rounded-xl bg-[#F4D03E] px-3 py-2.5 text-sm font-semibold text-black",
    } = this.props;

    return (
      <div className="app-popover-overlay fixed inset-0 z-50" onClick={onClose}>
        <div className="app-popover-panel md:mr-5" onClick={this.stop}>
          <div className="app-sheet-card app-surface-card hide-scrollbar rounded-3xl p-4 space-y-4">
            <div className="app-soft-panel rounded-2xl p-3">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-zinc-200 overflow-hidden grid place-items-center">
                  {user?.avatarUrl ? (
                    <img src={user.avatarUrl} alt="avatar" className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-zinc-600">👤</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="font-semibold truncate">{user?.name || "User"}</div>
                    {onEdit ? (
                      <button
                        type="button"
                        className="h-7 w-7 rounded-lg bg-[#F4D03E] text-white grid place-items-center text-xs"
                        onClick={onEdit}
                        title="แก้ไขโปรไฟล์"
                      >
                        <img src="/edit.svg" alt="แก้ไขโปรไฟล์" className="h-3.5 w-3.5" />
                      </button>
                    ) : null}
                  </div>
                  <div className="text-xs text-zinc-500 truncate">{user?.email || ""}</div>
                </div>
              </div>
            </div>

            {showGoMyShopButton && onGoMyShop ? (
              <button
                type="button"
                className={goMyShopButtonClassName}
                onClick={onGoMyShop}
              >
                ลงขาย
              </button>
            ) : null}

            {onGoMyOrders ? (
              <button
                type="button"
                className={goMyOrdersButtonClassName}
                onClick={onGoMyOrders}
              >
                การสั่งซื้อของฉัน
              </button>
            ) : null}

            <button
              type="button"
              className="w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
              onClick={onLogout}
            >
              Log out
            </button>
          </div>
        </div>
      </div>
    );
  }
}
