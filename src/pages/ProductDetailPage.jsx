import React from "react";
import { ShopProduct } from "../models/ShopProduct";
import { ProductCategory } from "../models/ProductCategory";
import { MyShopService } from "../services/MyShopService";
import { CartService } from "../services/CartService";
import { ChatService } from "../services/ChatService";
import { ContentReportService } from "../services/ContentReportService";
import { ContentReportModal } from "../components/ContentReportModal";
import { CartPopup, ProfilePopup } from "../components/HeaderActionPopups";
import { NotificationBellButton } from "../components/NotificationBellButton";

export class ProductDetailPage extends React.Component {
  state = {
    loadingProduct: false,
    productError: "",
    productFromDatabase: null,
    activeImageIndex: 0,
    isDraggingGallery: false,
    searchKeyword: "",
    addingToCart: false,
    openingChat: false,
    actionError: "",
    actionDone: "",
    showProfilePopup: false,
    showCartPopup: false,
    cartLoading: false,
    cartError: "",
    cartDone: "",
    cartItems: [],
    checkingOut: false,
    showReportModal: false,
    showImageViewer: false,
    reportReason: "",
    reportSubmitting: false,
    reportError: "",
  };

  myShopService = MyShopService.instance();
  cartService = CartService.instance();
  chatService = ChatService.instance();
  contentReportService = ContentReportService.instance();
  galleryViewportRef = React.createRef();
  galleryPointerState = {
    pointerId: null,
    startX: 0,
    startScrollLeft: 0,
    didDrag: false,
  };

  componentDidMount() {
    this.syncProductFromDatabase();
    this.loadCartItems();
  }

  componentDidUpdate(prevProps) {
    const prevProductId = this.getProductId(prevProps.product);
    const nextProductId = this.getProductId(this.props.product);

    if (prevProductId !== nextProductId) {
      this.resetGallery();
      this.syncProductFromDatabase();
      return;
    }

    const imageCount = this.getResolvedProduct()?.getImageUrls?.().length ?? 0;
    if (imageCount > 0 && this.state.activeImageIndex > imageCount - 1) {
      this.setState({ activeImageIndex: imageCount - 1 });
    }
  }

  getProductId(productInput) {
    if (!productInput) return "";
    if (productInput instanceof ShopProduct) return `${productInput.id ?? ""}`;
    return `${productInput?.id ?? productInput?._id ?? ""}`;
  }

  toProduct() {
    const { product } = this.props;
    if (!product) return ShopProduct.empty();
    if (product instanceof ShopProduct) return product;
    return ShopProduct.fromJSON(product);
  }

  getResolvedProduct() {
    return this.state.productFromDatabase ?? this.toProduct();
  }

  resetGallery = () => {
    this.galleryPointerState = {
      pointerId: null,
      startX: 0,
      startScrollLeft: 0,
      didDrag: false,
    };

    this.setState({ activeImageIndex: 0, isDraggingGallery: false }, () => {
      if (typeof window !== "undefined" && typeof window.requestAnimationFrame === "function") {
        window.requestAnimationFrame(() => this.scrollGalleryToIndex(0, "auto"));
        return;
      }
      this.scrollGalleryToIndex(0, "auto");
    });
  };

  scrollGalleryToIndex = (index, behavior = "smooth") => {
    const viewport = this.galleryViewportRef.current;
    if (!viewport) return;

    const safeIndex = Math.max(0, index);
    viewport.scrollTo({
      left: viewport.clientWidth * safeIndex,
      behavior,
    });
  };

  selectGalleryImage = (index) => {
    this.setState({ activeImageIndex: index }, () => {
      this.scrollGalleryToIndex(index, "smooth");
    });
  };

  openImageViewer = (index = this.state.activeImageIndex) => {
    const imageUrls = this.getResolvedProduct()?.getImageUrls?.() ?? [];
    if (!imageUrls.length) return;

    const safeIndex = Math.max(0, Math.min(index, imageUrls.length - 1));
    this.setState({ showImageViewer: true, activeImageIndex: safeIndex });
  };

  closeImageViewer = () => {
    this.setState({ showImageViewer: false });
  };

  showPreviousGalleryImage = () => {
    const imageUrls = this.getResolvedProduct()?.getImageUrls?.() ?? [];
    if (imageUrls.length <= 1) return;

    const nextIndex =
      (Math.max(0, this.state.activeImageIndex) - 1 + imageUrls.length) % imageUrls.length;
    this.selectGalleryImage(nextIndex);
  };

  showNextGalleryImage = () => {
    const imageUrls = this.getResolvedProduct()?.getImageUrls?.() ?? [];
    if (imageUrls.length <= 1) return;

    const nextIndex = (Math.max(0, this.state.activeImageIndex) + 1) % imageUrls.length;
    this.selectGalleryImage(nextIndex);
  };

  onGalleryScroll = (e) => {
    const viewport = e.currentTarget;
    if (!viewport?.clientWidth) return;

    const nextIndex = Math.max(0, Math.round(viewport.scrollLeft / viewport.clientWidth));
    if (nextIndex !== this.state.activeImageIndex) {
      this.setState({ activeImageIndex: nextIndex });
    }
  };

  onGalleryPointerDown = (e) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;

    const viewport = this.galleryViewportRef.current;
    if (!viewport) return;

    this.galleryPointerState = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startScrollLeft: viewport.scrollLeft,
      didDrag: false,
    };

    try {
      viewport.setPointerCapture?.(e.pointerId);
    } catch {
      // ignore unsupported pointer capture
    }

    this.setState({ isDraggingGallery: true });
  };

  onGalleryPointerMove = (e) => {
    const viewport = this.galleryViewportRef.current;
    if (!viewport || this.galleryPointerState.pointerId !== e.pointerId) return;

    const deltaX = e.clientX - this.galleryPointerState.startX;
    if (Math.abs(deltaX) > 4) {
      this.galleryPointerState.didDrag = true;
      e.preventDefault();
    }

    viewport.scrollLeft = this.galleryPointerState.startScrollLeft - deltaX;
  };

  onGalleryImageClick = (index) => {
    if (this.galleryPointerState.didDrag) return;
    this.openImageViewer(index);
  };

  onGalleryViewportClick = () => {
    const imageUrls = this.getResolvedProduct()?.getImageUrls?.() ?? [];
    if (!imageUrls.length) return;
    if (this.galleryPointerState.didDrag) return;
    this.openImageViewer(this.state.activeImageIndex);
  };

  finishGalleryPointerDrag = (e) => {
    const activePointerId = this.galleryPointerState.pointerId;
    if (activePointerId == null) return;
    if (typeof e?.pointerId === "number" && e.pointerId !== activePointerId) return;

    const viewport = this.galleryViewportRef.current;

    if (viewport) {
      try {
        viewport.releasePointerCapture?.(activePointerId);
      } catch {
        // ignore unsupported pointer capture
      }
    }

    const nextIndex =
      viewport?.clientWidth
        ? Math.max(0, Math.round(viewport.scrollLeft / viewport.clientWidth))
        : 0;

    this.galleryPointerState = {
      pointerId: null,
      startX: 0,
      startScrollLeft: 0,
      didDrag: false,
    };

    this.setState({ activeImageIndex: nextIndex, isDraggingGallery: false }, () => {
      this.scrollGalleryToIndex(nextIndex, "smooth");
    });
  };

  syncProductFromDatabase = async () => {
    const fallbackProduct = this.toProduct();
    const productId = `${fallbackProduct?.id ?? ""}`.trim();

    if (!productId) {
      this.setState({
        loadingProduct: false,
        productError: "",
        productFromDatabase: null,
      });
      return;
    }

    this.setState({ loadingProduct: true, productError: "", productFromDatabase: null });

    try {
      const { product } = await this.myShopService.getMarketplaceProductById(productId);
      this.setState({
        productFromDatabase: product ?? null,
      });
    } catch (e) {
      this.setState({
        productError: e?.message ?? "โหลดข้อมูลสินค้าจากฐานข้อมูลไม่สำเร็จ",
        productFromDatabase: null,
      });
    } finally {
      this.setState({ loadingProduct: false });
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

  onAddToCart = async () => {
    const product = this.getResolvedProduct();
    const currentUserId = `${this.props.user?.id ?? ""}`.trim();
    const ownerId = `${product?.ownerId ?? ""}`.trim();
    if (!product?.id) {
      this.setState({ actionError: "ไม่พบรหัสสินค้า จึงยังเพิ่มลงตะกร้าไม่ได้", actionDone: "" });
      return;
    }
    if (currentUserId && ownerId && currentUserId === ownerId) {
      this.setState({ actionError: "ไม่สามารถเพิ่มสินค้าของร้านตัวเองลงตะกร้าได้", actionDone: "" });
      return;
    }
    if (product?.isSold?.()) {
      this.setState({ actionError: "สินค้านี้ขายออกแล้ว", actionDone: "" });
      return;
    }

    this.setState({
      addingToCart: true,
      actionError: "",
      actionDone: "",
    });

    try {
      await this.cartService.addItem({ productId: product.id, quantity: 1 });
      this.setState({
        actionDone: "เพิ่มสินค้าลงตะกร้าแล้ว",
      });
    } catch (e) {
      this.setState({
        actionError: e?.message ?? "เพิ่มสินค้าลงตะกร้าไม่สำเร็จ",
      });
    } finally {
      this.setState({ addingToCart: false });
    }
  };

  onChatSeller = async () => {
    const product = this.getResolvedProduct();
    if (!product?.id) {
      this.setState({ actionError: "ไม่พบรหัสสินค้า จึงยังเริ่มแชทไม่ได้", actionDone: "" });
      return;
    }

    this.setState({
      openingChat: true,
      actionError: "",
      actionDone: "",
    });

    let nextChatId = "";
    try {
      const result = await this.chatService.startChat({
        productId: product.id,
        ownerId: product.ownerId,
        message: `สนใจสินค้า ${product?.name ?? ""}`.trim(),
      });

      if (result?.chatId) {
        nextChatId = result.chatId;
      } else {
        this.setState({
          actionDone: "สร้างห้องแชทกับร้านค้าแล้ว",
        });
      }
    } catch (e) {
      this.setState({
        actionError: e?.message ?? "เริ่มแชทกับร้านค้าไม่สำเร็จ",
      });
    } finally {
      this.setState({ openingChat: false }, () => {
        if (nextChatId) {
          this.props.onGoChat?.({ chatId: nextChatId });
        }
      });
    }
  };

  onOpenSellerProfile = () => {
    const product = this.getResolvedProduct();
    const ownerId = `${product?.ownerId ?? ""}`.trim();

    if (!ownerId) {
      this.setState({ actionError: "ไม่พบข้อมูลร้านค้าของผู้ขาย", actionDone: "" });
      return;
    }

    this.props.onOpenSellerProfile?.(ownerId);
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

  submitProductReport = async () => {
    const product = this.getResolvedProduct();
    const productId = `${product?.id ?? ""}`.trim();
    const reason = `${this.state.reportReason ?? ""}`.trim();

    if (!productId) {
      this.setState({ reportError: "ไม่พบสินค้าที่ต้องการรายงาน" });
      return;
    }
    if (!reason) {
      this.setState({ reportError: "กรุณาระบุปัญหาของสินค้าที่ต้องการรายงาน" });
      return;
    }

    this.setState({ reportSubmitting: true, reportError: "", actionError: "", actionDone: "" });
    try {
      const result = await this.contentReportService.submitProductReport({
        productId,
        reason,
      });
      this.setState({
        showReportModal: false,
        reportReason: "",
        actionDone: result?.message ?? "ส่งรายงานสินค้าไปให้ผู้ดูแลระบบแล้ว",
      });
    } catch (e) {
      this.setState({
        reportError: e?.message ?? "ส่งรายงานสินค้าไม่สำเร็จ",
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
        this.syncProductFromDatabase(),
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

  render() {
    const {
      loadingProduct,
      productError,
      searchKeyword,
      addingToCart,
      openingChat,
      actionError,
      actionDone,
      showProfilePopup,
      showCartPopup,
      cartLoading,
      cartError,
      cartDone,
      cartItems,
      checkingOut,
      activeImageIndex,
      isDraggingGallery,
      showReportModal,
      showImageViewer,
      reportReason,
      reportSubmitting,
      reportError,
    } = this.state;
    const product = this.getResolvedProduct();
    const imageUrls = product.getImageUrls();
    const safeActiveImageIndex =
      imageUrls.length > 0 ? Math.min(activeImageIndex, imageUrls.length - 1) : 0;
    const hasMultipleImages = imageUrls.length > 1;
    const exchangeItem = `${product?.exchangeItem ?? ""}`.trim();
    const hasProductData = Boolean(product?.id || product?.name);
    const cartTotalLabel = this.getCartTotalLabel();
    const cartBadgeCount = (cartItems ?? []).reduce(
      (sum, item) => sum + (Number(item?.quantity) || 0),
      0,
    );
    const chatUnreadCount = Number(this.props.chatUnreadCount ?? 0) || 0;
    const notificationUnreadCount = Number(this.props.notificationUnreadCount ?? 0) || 0;
    const isSold = product?.isSold?.() ?? false;
    const isOwnProduct =
      `${this.props.user?.id ?? ""}`.trim() &&
      `${product?.ownerId ?? ""}`.trim() &&
      `${this.props.user?.id ?? ""}`.trim() === `${product?.ownerId ?? ""}`.trim();
    const sellerName = product?.getShopDisplayName?.() ?? "ร้านค้าผู้ขาย";
    const sellerAvatarUrl = `${product?.shopAvatarUrl ?? ""}`.trim();
    const canOpenSellerProfile = Boolean(`${product?.ownerId ?? ""}`.trim());
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
          <div className="app-page-section app-main-panel rounded-2xl p-4 md:p-6 space-y-4">
            {loadingProduct ? <div className="text-sm text-zinc-500">กำลังโหลดข้อมูลสินค้าจากฐานข้อมูล...</div> : null}
            {productError ? (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {productError}
              </div>
            ) : null}
            {actionError ? (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {actionError}
              </div>
            ) : null}
            {actionDone ? (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
                {actionDone}
              </div>
            ) : null}

            {!hasProductData ? (
              <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-6 text-center text-sm text-zinc-500">
                ยังไม่มีข้อมูลสินค้า
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-[22rem_minmax(0,1fr)]">
                <div className="space-y-3">
                  <div
                    ref={this.galleryViewportRef}
                    className={`flex aspect-square overflow-x-auto hide-scrollbar rounded-2xl bg-zinc-100 snap-x snap-mandatory select-none ${
                      hasMultipleImages
                        ? isDraggingGallery
                          ? "cursor-grabbing"
                          : "cursor-grab"
                        : imageUrls.length
                          ? "cursor-zoom-in"
                          : ""
                    }`}
                    onScroll={hasMultipleImages ? this.onGalleryScroll : undefined}
                    onPointerDown={hasMultipleImages ? this.onGalleryPointerDown : undefined}
                    onPointerMove={hasMultipleImages ? this.onGalleryPointerMove : undefined}
                    onPointerUp={hasMultipleImages ? this.finishGalleryPointerDrag : undefined}
                    onPointerCancel={hasMultipleImages ? this.finishGalleryPointerDrag : undefined}
                    onClick={this.onGalleryViewportClick}
                    style={{ touchAction: hasMultipleImages ? "pan-y" : "auto" }}
                  >
                    {imageUrls.length ? (
                      imageUrls.map((url, index) => (
                        <div
                          key={`${product.id || product.name}-image-${index}`}
                          className="grid h-full w-full shrink-0 snap-center place-items-center overflow-hidden"
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              this.onGalleryImageClick(index);
                            }
                          }}
                        >
                          <img
                            src={url}
                            alt={`${product?.name ?? "product-image"}-${index + 1}`}
                            className="pointer-events-none h-full w-full object-cover"
                            draggable={false}
                          />
                        </div>
                      ))
                    ) : (
                      <div className="grid h-full w-full shrink-0 place-items-center">
                        <span className="text-sm text-zinc-400">ไม่มีรูปภาพ</span>
                      </div>
                    )}
                  </div>
                  {hasMultipleImages ? (
                    <div className="flex items-center justify-between gap-2 text-xs text-zinc-500">
                      <div>ลากเพื่อเลื่อนดูรูปสินค้า</div>
                      <div className="ml-auto flex items-center gap-2">
                        <button
                          type="button"
                          className="grid h-8 w-8 place-items-center rounded-full border border-zinc-200 bg-white text-base font-semibold text-zinc-700 hover:bg-zinc-50"
                          onClick={this.showPreviousGalleryImage}
                          aria-label="ดูรูปก่อนหน้า"
                        >
                          ‹
                        </button>
                        <button
                          type="button"
                          className="grid h-8 w-8 place-items-center rounded-full border border-zinc-200 bg-white text-base font-semibold text-zinc-700 hover:bg-zinc-50"
                          onClick={this.showNextGalleryImage}
                          aria-label="ดูรูปถัดไป"
                        >
                          ›
                        </button>
                        <div>
                          {safeActiveImageIndex + 1}/{imageUrls.length}
                        </div>
                      </div>
                    </div>
                  ) : null}
                  {hasMultipleImages ? (
                    <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
                      {imageUrls.map((url, index) => (
                        <button
                          type="button"
                          key={`${product.id || product.name}-preview-${index}`}
                          className={`h-20 w-20 shrink-0 overflow-hidden rounded-lg border-2 bg-white ${
                            index === safeActiveImageIndex
                              ? "border-zinc-900"
                              : "border-zinc-200"
                          }`}
                          onClick={() => this.selectGalleryImage(index)}
                          aria-label={`ดูรูปที่ ${index + 1}`}
                          aria-pressed={index === safeActiveImageIndex}
                        >
                          <img
                            src={url}
                            alt={`${product.name}-${index + 1}`}
                            className="h-full w-full object-cover"
                            draggable={false}
                          />
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>

                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="text-2xl font-semibold text-zinc-900 break-words">
                      {product?.name || "ไม่ระบุชื่อสินค้า"}
                    </div>
                    <button
                      type="button"
                      className="app-soft-panel grid h-10 w-10 shrink-0 place-items-center rounded-xl hover:bg-zinc-50"
                      onClick={this.openReportModal}
                      title="รายงานสินค้า"
                    >
                      <img src="/report.svg" alt="รายงานสินค้า" className="h-5 w-5" />
                    </button>
                  </div>
                  <div
                    className={`inline-flex w-fit rounded-full px-2.5 py-1 text-xs font-semibold ${
                      isSold ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"
                    }`}
                  >
                    {product?.getSaleStatusLabel?.() ?? "พร้อมขาย"}
                  </div>
                  <div className="text-2xl font-semibold text-zinc-900">{product?.getPriceLabel?.() ?? "฿0.00"}</div>
                  {product?.getProvinceLabel?.() ? (
                    <div className="inline-flex w-fit rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-xs font-medium text-sky-700">
                      จังหวัด: {product.getProvinceLabel()}
                    </div>
                  ) : null}
                  <button
                    type="button"
                    className="app-seller-card flex w-full max-w-md items-center gap-3 rounded-2xl p-3 text-left transition hover:border-zinc-300 hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                    onClick={this.onOpenSellerProfile}
                    disabled={!canOpenSellerProfile}
                  >
                    <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-full bg-white">
                      {sellerAvatarUrl ? (
                        <img
                          src={sellerAvatarUrl}
                          alt={sellerName}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="text-sm font-semibold text-zinc-500">
                          {(sellerName ?? "ร").trim().charAt(0) || "ร"}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-medium uppercase tracking-[0.12em] text-zinc-500">
                        Seller Profile
                      </div>
                      <div className="truncate text-base font-semibold text-zinc-900">
                        {sellerName}
                      </div>
                      <div className="text-sm text-zinc-500">
                        กดเพื่อดูโปรไฟล์ร้านและสินค้าที่ลงขาย
                      </div>
                    </div>
                  </button>
                  {exchangeItem ? (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-zinc-700 break-words">
                      ต้องการแลกกับ: <span className="font-medium text-zinc-900">{exchangeItem}</span>
                    </div>
                  ) : null}

                  <div className="grid max-w-md grid-cols-2 gap-2">
                    <button
                      type="button"
                      className="app-soft-panel rounded-xl px-3 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-60"
                      onClick={this.onChatSeller}
                      disabled={openingChat}
                    >
                      {openingChat ? "กำลังสร้างแชท..." : "คุยกับร้านค้า"}
                    </button>
                    <button
                      type="button"
                      className="rounded-xl bg-zinc-900 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
                      onClick={this.onAddToCart}
                      disabled={addingToCart || isSold || isOwnProduct}
                    >
                      {addingToCart
                        ? "กำลังเพิ่ม..."
                        : isOwnProduct
                          ? "สินค้าของคุณ"
                          : isSold
                            ? "ขายออกแล้ว"
                            : "เพิ่มลงตะกร้า"}
                    </button>
                  </div>

                  <div className="app-chip inline-flex rounded-full px-2.5 py-1 text-xs">
                    {ProductCategory.getLabel(product?.category)}
                  </div>
                  <p className="app-muted-block rounded-xl p-3 text-sm text-zinc-700 whitespace-pre-line break-words">
                    {product?.description || "ยังไม่มีคำอธิบายสินค้า"}
                  </p>
                </div>
              </div>
            )}
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
            title="รายงานสินค้า"
            subjectLabel={product?.name || "ไม่ระบุชื่อสินค้า"}
            reason={reportReason}
            submitting={reportSubmitting}
            error={reportError}
            onClose={this.closeReportModal}
            onChangeReason={this.onChangeReportReason}
            onSubmit={this.submitProductReport}
          />
        ) : null}
        {showImageViewer && imageUrls.length ? (
          <div
            className="fixed inset-0 z-[80] bg-black/80 px-4 py-6"
            onClick={this.closeImageViewer}
          >
            <div className="mx-auto flex h-full max-w-6xl flex-col">
              <div className="mb-4 flex items-center justify-between gap-3 text-white">
                <div className="min-w-0">
                  <div className="truncate text-base font-semibold">
                    {product?.name || "Product image"}
                  </div>
                  <div className="text-sm text-white/75">
                    {safeActiveImageIndex + 1}/{imageUrls.length}
                  </div>
                </div>
                <button
                  type="button"
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-white/20 bg-white/10 text-xl text-white hover:bg-white/20"
                  onClick={(e) => {
                    e.stopPropagation();
                    this.closeImageViewer();
                  }}
                  aria-label="Close image viewer"
                >
                  ×
                </button>
              </div>

              <div
                className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-3xl border border-white/10 bg-black/30"
                onClick={(e) => e.stopPropagation()}
              >
                <div
                  className="mx-auto aspect-square w-full overflow-hidden rounded-2xl bg-white/95 p-4"
                  style={{ maxWidth: "min(78vw, 78vh)" }}
                >
                  <img
                    src={imageUrls[safeActiveImageIndex]}
                    alt={`${product?.name ?? "product-image"}-full-${safeActiveImageIndex + 1}`}
                    className="h-full w-full object-contain"
                  />
                </div>

                {hasMultipleImages ? (
                  <div className="absolute bottom-4 right-4 flex items-center gap-2">
                    <button
                      type="button"
                      className="grid h-12 w-12 place-items-center rounded-full border border-white/15 bg-black/45 text-2xl font-semibold text-white hover:bg-black/60"
                      onClick={this.showPreviousGalleryImage}
                      aria-label="Previous image"
                    >
                      ‹
                    </button>
                    <button
                      type="button"
                      className="grid h-12 w-12 place-items-center rounded-full border border-white/15 bg-black/45 text-2xl font-semibold text-white hover:bg-black/60"
                      onClick={this.showNextGalleryImage}
                      aria-label="Next image"
                    >
                      ›
                    </button>
                  </div>
                ) : null}
              </div>

              {hasMultipleImages ? (
                <div
                  className="mt-4 flex gap-2 overflow-x-auto pb-1"
                  onClick={(e) => e.stopPropagation()}
                >
                  {imageUrls.map((url, index) => (
                    <button
                      type="button"
                      key={`${product.id || product.name}-viewer-preview-${index}`}
                      className={`h-20 w-20 shrink-0 overflow-hidden rounded-xl border-2 transition ${
                        index === safeActiveImageIndex
                          ? "border-white"
                          : "border-transparent opacity-70 hover:opacity-100"
                      }`}
                      onClick={() => this.selectGalleryImage(index)}
                      aria-label={`View image ${index + 1}`}
                    >
                      <img
                        src={url}
                        alt={`${product?.name ?? "product-image"}-preview-${index + 1}`}
                        className="h-full w-full object-cover"
                        draggable={false}
                      />
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
      </div>
    );
  }
}
