import React from "react";
import { SellerStorefront } from "../models/SellerStorefront";
import { ProductCategory } from "../models/ProductCategory";
import { SellerStorefrontService } from "../services/SellerStorefrontService";
import { CartService } from "../services/CartService";
import { ContentReportService } from "../services/ContentReportService";
import { ContentReportModal } from "../components/ContentReportModal";
import { CartPopup, ProfilePopup } from "../components/HeaderActionPopups";

export class SellerStorefrontPage extends React.Component {
  state = {
    loadingStorefront: true,
    storefrontError: "",
    storefrontDone: "",
    storefront: SellerStorefront.empty(),
    searchKeyword: "",
    showProfilePopup: false,
    showCartPopup: false,
    cartLoading: false,
    cartError: "",
    cartDone: "",
    cartItems: [],
    checkingOut: false,
    showReportModal: false,
    reportReason: "",
    reportSubmitting: false,
    reportError: "",
  };

  sellerStorefrontService = SellerStorefrontService.instance();
  cartService = CartService.instance();
  contentReportService = ContentReportService.instance();

  componentDidMount() {
    this.loadStorefront();
  }

  componentDidUpdate(prevProps) {
    const prevOwnerId = `${prevProps.ownerId ?? ""}`.trim();
    const nextOwnerId = `${this.props.ownerId ?? ""}`.trim();

    if (prevOwnerId !== nextOwnerId) {
      this.loadStorefront();
    }
  }

  getOwnerId() {
    return `${this.props.ownerId ?? ""}`.trim();
  }

  loadStorefront = async () => {
    const ownerId = this.getOwnerId();
    if (!ownerId) {
      this.setState({
        loadingStorefront: false,
        storefrontError: "ไม่พบรหัสร้านค้าที่ต้องการเปิด",
        storefrontDone: "",
        storefront: SellerStorefront.empty(),
      });
      return;
    }

    this.setState({
      loadingStorefront: true,
      storefrontError: "",
      storefrontDone: "",
      storefront: SellerStorefront.empty(ownerId),
    });

    try {
      const { storefront } = await this.sellerStorefrontService.getStorefrontByOwnerId(ownerId);
      this.setState({
        storefront: storefront ?? SellerStorefront.empty(ownerId),
      });
    } catch (e) {
      this.setState({
        storefrontError: e?.message ?? "โหลดข้อมูลร้านค้าไม่สำเร็จ",
      });
    } finally {
      this.setState({ loadingStorefront: false });
    }
  };

  onSearchChange = (value) => {
    this.setState({ searchKeyword: value ?? "" });
  };

  onSearchSubmit = (e) => {
    e.preventDefault();
    const keyword = (this.state.searchKeyword ?? "").trim();
    this.props.onSubmitSearch?.(keyword);
  };

  openReportModal = () => {
    this.setState({
      showReportModal: true,
      reportReason: "",
      reportError: "",
    });
  };

  closeReportModal = () => {
    this.setState({
      showReportModal: false,
      reportReason: "",
      reportError: "",
      reportSubmitting: false,
    });
  };

  onChangeReportReason = (reportReason) => {
    this.setState({ reportReason, reportError: "" });
  };

  submitShopReport = async () => {
    const ownerId = this.getOwnerId();
    const reason = `${this.state.reportReason ?? ""}`.trim();

    if (!ownerId) {
      this.setState({ reportError: "ไม่พบร้านค้าที่ต้องการรายงาน" });
      return;
    }
    if (!reason) {
      this.setState({ reportError: "กรุณาระบุปัญหาของร้านค้าที่ต้องการรายงาน" });
      return;
    }

    this.setState({
      reportSubmitting: true,
      reportError: "",
      storefrontError: "",
      storefrontDone: "",
    });
    try {
      const result = await this.contentReportService.submitShopReport({
        ownerId,
        reason,
      });
      this.setState({
        showReportModal: false,
        reportReason: "",
        storefrontDone: result?.message ?? "ส่งรายงานร้านค้าไปให้ผู้ดูแลระบบแล้ว",
      });
    } catch (e) {
      this.setState({
        reportError: e?.message ?? "ส่งรายงานร้านค้าไม่สำเร็จ",
      });
    } finally {
      this.setState({ reportSubmitting: false });
    }
  };

  openProfilePopup = () => {
    this.setState({
      showProfilePopup: true,
      showCartPopup: false,
    });
  };

  closeProfilePopup = () => {
    this.setState({ showProfilePopup: false });
  };

  goMyShop = () => {
    this.setState({ showProfilePopup: false });
    this.props.onGoMyShop?.();
  };

  goMyOrders = () => {
    this.setState({ showProfilePopup: false });
    this.props.onGoMyOrders?.();
  };

  openCartPopup = async () => {
    this.setState({
      showCartPopup: true,
      showProfilePopup: false,
      cartError: "",
      cartDone: "",
    });
    await this.loadCartItems();
  };

  closeCartPopup = () => {
    this.setState({ showCartPopup: false, cartError: "", cartDone: "" });
  };

  loadCartItems = async () => {
    this.setState({ cartLoading: true, cartError: "" });
    try {
      const { items } = await this.cartService.listMyCart();
      this.setState({ cartItems: items ?? [] });
    } catch (e) {
      this.setState({ cartError: e?.message ?? "โหลดตะกร้าสินค้าไม่สำเร็จ" });
    } finally {
      this.setState({ cartLoading: false });
    }
  };

  removeCartItem = async (item) => {
    try {
      await this.cartService.removeItem({
        itemId: item?.id,
        productId: item?.productId,
      });
      await this.loadCartItems();
      this.setState({ cartDone: "ลบสินค้าออกจากตะกร้าแล้ว" });
    } catch (e) {
      this.setState({ cartError: e?.message ?? "ลบสินค้าออกจากตะกร้าไม่สำเร็จ" });
    }
  };

  openCartItem = (item) => {
    this.setState({ showCartPopup: false });
    this.props.onOpenProduct?.(item?.toProductPayload?.() ?? null);
  };

  checkoutCart = async (checkoutPayload = {}) => {
    if (!this.state.cartItems.length) return;

    this.setState({ checkingOut: true, cartError: "", cartDone: "" });
    try {
      const result = await this.cartService.checkout(checkoutPayload);
      await this.loadCartItems();
      this.setState({
        cartDone: result?.message ?? "สั่งซื้อเรียบร้อย",
      });
    } catch (e) {
      this.setState({ cartError: e?.message ?? "สั่งซื้อไม่สำเร็จ" });
    } finally {
      this.setState({ checkingOut: false });
    }
  };

  getCartTotalLabel() {
    const total = (this.state.cartItems ?? []).reduce(
      (sum, item) => sum + (item?.getLineTotalNumber?.() ?? 0),
      0,
    );

    return new Intl.NumberFormat("th-TH", {
      style: "currency",
      currency: "THB",
      maximumFractionDigits: 2,
    }).format(total);
  }

  renderShopAvatar(shopName, avatarUrl) {
    if (avatarUrl) {
      return <img src={avatarUrl} alt={shopName} className="h-full w-full object-cover" />;
    }

    return (
      <span className="text-2xl font-semibold text-zinc-500">
        {(shopName ?? "ร").trim().charAt(0) || "ร"}
      </span>
    );
  }

  render() {
    const {
      loadingStorefront,
      storefrontError,
      storefrontDone,
      storefront,
      searchKeyword,
      showProfilePopup,
      showCartPopup,
      cartLoading,
      cartError,
      cartDone,
      cartItems,
      checkingOut,
      showReportModal,
      reportReason,
      reportSubmitting,
      reportError,
    } = this.state;
    const shop = storefront?.shop;
    const products = storefront?.getProducts?.() ?? [];
    const hasStorefrontData = storefront?.hasShop?.() ?? false;
    const shopName = shop?.getDisplayName?.() ?? "ร้านค้าผู้ขาย";
    const shopDescription = `${shop?.description ?? ""}`.trim();
    const shopAvatarUrl = `${shop?.avatarUrl ?? ""}`.trim();
    const cartTotalLabel = this.getCartTotalLabel();

    return (
      <div className="min-h-dvh bg-zinc-50">
        <div className="sticky top-0 z-40 bg-[#A4E3D8] border-b border-zinc-200">
          <div className="mx-auto max-w-350 px-4 py-5 flex items-center gap-8">
            <button
              type="button"
              onClick={this.props.onGoHome}
              title="กลับหน้าแรก"
              className="shrink-0 rounded-xl border border-zinc-200 bg-white p-0"
            >
              <img
                src="/App logo.jpg"
                alt="App logo"
                className="h-20 w-20 rounded-xl object-cover"
              />
            </button>
            <form className="flex-1" onSubmit={this.onSearchSubmit}>
              <input
                className="w-full rounded-xl border bg-white border-zinc-200 px-3 py-2 text-sm outline-none"
                placeholder="ค้นหาสินค้า..."
                value={searchKeyword}
                onChange={(e) => this.onSearchChange(e.target.value)}
              />
            </form>

            <button
              className="h-10 w-10 rounded-xl bg-[#F4D03E] border border-zinc-200 grid place-items-center"
              onClick={this.openCartPopup}
              title="ตะกร้า"
            >
              <img src="/cart.svg" alt="ตะกร้า" className="h-5 w-5 object-contain" />
            </button>

            <button
              className="h-10 w-10 rounded-xl bg-[#F4D03E] border border-zinc-200 grid place-items-center"
              onClick={() => this.props.onGoChat?.()}
              title="แชท"
            >
              <img src="/chat.svg" alt="แชท" className="h-5 w-5 object-contain" />
            </button>

            <button
              className="h-10 w-10 rounded-xl bg-[#F4D03E] text-white grid place-items-center"
              onClick={this.openProfilePopup}
              title="บัญชี"
            >
              <img src="/account.svg" alt="บัญชี" className="h-5 w-5 object-contain" />
            </button>
          </div>
        </div>

        <div className="mx-auto max-w-375 px-4 py-6">
          <div className="rounded-2xl bg-white shadow p-4 md:p-6 space-y-6">
            {loadingStorefront ? (
              <div className="text-sm text-zinc-500">กำลังโหลดข้อมูลหน้าร้านจากฐานข้อมูล...</div>
            ) : null}
            {storefrontError ? (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {storefrontError}
              </div>
            ) : null}
            {storefrontDone ? (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
                {storefrontDone}
              </div>
            ) : null}

            {!loadingStorefront && !storefrontError && !hasStorefrontData ? (
              <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-6 text-center text-sm text-zinc-500">
                ยังไม่พบข้อมูลร้านค้านี้
              </div>
            ) : null}

            {!loadingStorefront && hasStorefrontData ? (
              <>
                <section className="space-y-4">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center gap-4">
                      <div className="grid h-24 w-24 shrink-0 place-items-center overflow-hidden rounded-full bg-zinc-100 ring-4 ring-white shadow">
                        {this.renderShopAvatar(shopName, shopAvatarUrl)}
                      </div>
                      <div className="space-y-2">
                        <div className="inline-flex w-fit rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                          โปรไฟล์ร้านค้า
                        </div>
                        <div className="text-2xl font-semibold text-zinc-900 break-words">
                          {shopName}
                        </div>
                        <div className="text-sm text-zinc-500">
                          สินค้าที่กำลังลงขาย {products.length} รายการ
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50"
                      onClick={this.openReportModal}
                      title="รายงานร้านค้า"
                    >
                      <img src="/report.svg" alt="รายงานร้านค้า" className="h-5 w-5" />
                    </button>
                  </div>

                  <p className="rounded-2xl bg-zinc-50 p-4 text-sm text-zinc-700 whitespace-pre-line break-words">
                    {shopDescription || "ร้านนี้ยังไม่มีคำอธิบายร้าน"}
                  </p>
                </section>

                <section className="space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-lg font-semibold text-zinc-900">สินค้าจากร้านนี้</div>
                    <div className="text-sm text-zinc-500">{products.length} รายการ</div>
                  </div>

                  {!products.length ? (
                    <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-6 text-center text-sm text-zinc-500">
                      ร้านนี้ยังไม่มีสินค้าที่เปิดขายอยู่
                    </div>
                  ) : (
                    <div className="grid grid-cols-[repeat(auto-fill,minmax(190px,1fr))] gap-4">
                      {products.map((product, index) => (
                        <StorefrontProductCard
                          key={product.id || `${product.name}-${index}`}
                          product={product}
                          onOpenProduct={this.props.onOpenProduct}
                        />
                      ))}
                    </div>
                  )}
                </section>
              </>
            ) : null}
          </div>
        </div>

        {showCartPopup ? (
          <CartPopup
            items={cartItems}
            buyer={this.props.user}
            loading={cartLoading}
            error={cartError}
            done={cartDone}
            checkingOut={checkingOut}
            totalLabel={cartTotalLabel}
            onClose={this.closeCartPopup}
            onOpenItem={this.openCartItem}
            onRemoveItem={this.removeCartItem}
            onCheckout={this.checkoutCart}
          />
        ) : null}

        {showProfilePopup ? (
          <ProfilePopup
            user={this.props.user}
            onClose={this.closeProfilePopup}
            onGoMyShop={this.goMyShop}
            onGoMyOrders={this.goMyOrders}
            onLogout={this.props.onLogout}
          />
        ) : null}

        {showReportModal ? (
          <ContentReportModal
            title="รายงานร้านค้า"
            subjectLabel={shopName}
            reason={reportReason}
            submitting={reportSubmitting}
            error={reportError}
            onClose={this.closeReportModal}
            onChangeReason={this.onChangeReportReason}
            onSubmit={this.submitShopReport}
          />
        ) : null}
      </div>
    );
  }
}

class StorefrontProductCard extends React.Component {
  render() {
    const { product, onOpenProduct } = this.props;
    return (
      <article className="rounded-2xl border border-zinc-200 p-3 bg-white">
        <div className="aspect-square rounded-xl bg-zinc-100 overflow-hidden grid place-items-center">
          {product?.imageUrl ? (
            <img src={product.imageUrl} alt={product?.name ?? "product"} className="h-full w-full object-cover" />
          ) : (
            <span className="text-sm text-zinc-400">ไม่มีรูปภาพ</span>
          )}
        </div>
        <div className="pt-3 space-y-1">
          <div className="font-semibold text-zinc-800 line-clamp-2 break-words">
            {product?.name || "ไม่ระบุชื่อสินค้า"}
          </div>
          <div className="inline-flex w-fit rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-700">
            {ProductCategory.getLabel(product?.category)}
          </div>
          <div className="text-sm font-medium text-zinc-700">{product?.getPriceLabel?.() ?? "฿0.00"}</div>
          <button
            type="button"
            className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
            onClick={() => onOpenProduct?.(product)}
          >
            ดูสินค้า
          </button>
        </div>
      </article>
    );
  }
}
