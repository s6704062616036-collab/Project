import React from "react";
import { SellerStorefront } from "../models/SellerStorefront";
import { ProductCategory } from "../models/ProductCategory";
import { SellerStorefrontService } from "../services/SellerStorefrontService";
import { CartService } from "../services/CartService";
import { ContentReportService } from "../services/ContentReportService";
import { ContentReportModal } from "../components/ContentReportModal";
import { CartPopup, ProfilePopup } from "../components/HeaderActionPopups";
import { NotificationBellButton } from "../components/NotificationBellButton";

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
    this.loadCartItems();
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
      await Promise.all([
        this.loadCartItems(),
        this.loadStorefront(),
      ]);
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
    const shopEmail = `${shop?.email ?? ""}`.trim();
    const shopPhone = `${shop?.phone ?? ""}`.trim();
    const soldProductsCount = Number(shop?.soldProductsCount ?? 0) || 0;
    const availableProductsCount = Number(shop?.availableProductsCount ?? products.length) || products.length;
    const cartTotalLabel = this.getCartTotalLabel();
    const cartBadgeCount = (cartItems ?? []).reduce(
      (sum, item) => sum + (Number(item?.quantity) || 0),
      0,
    );
    const chatUnreadCount = Number(this.props.chatUnreadCount ?? 0) || 0;
    const notificationUnreadCount = Number(this.props.notificationUnreadCount ?? 0) || 0;

    return (
      <div className="min-h-dvh bg-zinc-50">
        <div className="app-topbar-shell sticky top-0 z-40 bg-[#A4E3D8] border-b border-zinc-200">
          <div className="mx-auto max-w-350 px-4 py-5 flex items-center gap-8">
            <button
              type="button"
              onClick={this.props.onGoHome}
              title="กลับหน้าแรก"
              className="app-logo-button shrink-0 rounded-[1.2rem] p-0"
            >
              <img
                src="/App logo.jpg"
                alt="App logo"
                className="h-20 w-20 rounded-xl object-cover"
              />
            </button>
            <form className="flex-1" onSubmit={this.onSearchSubmit}>
              <input
                className="app-search-field"
                placeholder="ค้นหาสินค้า..."
                value={searchKeyword}
                onChange={(e) => this.onSearchChange(e.target.value)}
              />
            </form>

            <button
              className="app-icon-button relative grid h-10 w-10 place-items-center rounded-xl"
              onClick={this.openCartPopup}
              title="ตะกร้า"
            >
              <img src="/cart.svg" alt="ตะกร้า" className="h-5 w-5 object-contain" />
              {cartBadgeCount > 0 ? (
                <span className="absolute -right-1.5 -top-1.5 min-w-[1.25rem] rounded-full bg-zinc-900 px-1 py-0.5 text-[10px] font-bold leading-none text-white">
                  {cartBadgeCount > 99 ? "99+" : cartBadgeCount}
                </span>
              ) : null}
            </button>

            <NotificationBellButton
              unreadCount={notificationUnreadCount}
              onClick={this.props.onGoNotifications}
              className="app-icon-button relative grid h-10 w-10 place-items-center rounded-xl"
            />

            <button
              className="app-icon-button relative grid h-10 w-10 place-items-center rounded-xl"
              onClick={() => this.props.onGoChat?.()}
              data-chat-unread={chatUnreadCount > 0 ? (chatUnreadCount > 99 ? "99+" : `${chatUnreadCount}`) : ""}
              title="แชท"
            >
              <img src="/chat.svg" alt="แชท" className="h-5 w-5 object-contain" />
            </button>

            <button
              className="app-icon-button grid h-10 w-10 place-items-center rounded-xl"
              onClick={this.openProfilePopup}
              title="บัญชี"
            >
              <img src="/account.svg" alt="บัญชี" className="h-5 w-5 object-contain" />
            </button>
          </div>
        </div>

        <div className="mx-auto max-w-375 px-4 py-6">
          <div className="app-page-section app-main-panel rounded-2xl p-4 md:p-6 space-y-6">
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
                      <div className="app-hero-badge inline-flex w-fit rounded-full px-2.5 py-1 text-xs font-semibold">
                          โปรไฟล์ร้านค้า
                        </div>
                        <div className="text-2xl font-semibold text-zinc-900 break-words">
                          {shopName}
                        </div>
                        <div className="flex flex-wrap gap-2 text-sm text-zinc-500">
                          <span>กำลังขาย {availableProductsCount} รายการ</span>
                          <span>ขายแล้ว {soldProductsCount} รายการ</span>
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

                  <p className="app-muted-block rounded-2xl p-4 text-sm text-zinc-700 whitespace-pre-line break-words">
                    {shopDescription || "ร้านนี้ยังไม่มีคำอธิบายร้าน"}
                  </p>

                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="app-soft-panel rounded-2xl px-4 py-3">
                      <div className="text-xs font-medium uppercase tracking-[0.12em] text-zinc-500">เบอร์โทร</div>
                      <div className="mt-1 text-sm font-medium text-zinc-800 break-all">
                        {shopPhone || "ยังไม่ได้ระบุ"}
                      </div>
                    </div>
                    <div className="app-soft-panel rounded-2xl px-4 py-3">
                      <div className="text-xs font-medium uppercase tracking-[0.12em] text-zinc-500">อีเมล</div>
                      <div className="mt-1 text-sm font-medium text-zinc-800 break-all">
                        {shopEmail || "ยังไม่ได้ระบุ"}
                      </div>
                    </div>
                  </div>
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
      <article className="app-product-card rounded-2xl p-3">
        <div className="app-product-media aspect-square rounded-xl grid place-items-center">
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
          <div className="app-chip inline-flex w-fit rounded-full px-2 py-0.5 text-xs">
            {ProductCategory.getLabel(product?.category)}
          </div>
          {product?.getProvinceLabel?.() ? (
            <div className="text-xs text-zinc-500">จังหวัด: {product.getProvinceLabel()}</div>
          ) : null}
          <div className="text-base font-semibold text-zinc-900">{product?.getPriceLabel?.() ?? "฿0.00"}</div>
          <button
            type="button"
            className="app-soft-panel w-full rounded-xl px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
            onClick={() => onOpenProduct?.(product)}
          >
            ดูสินค้า
          </button>
        </div>
      </article>
    );
  }
}
