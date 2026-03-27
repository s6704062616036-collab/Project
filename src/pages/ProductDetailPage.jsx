import React from "react";
import { ShopProduct } from "../models/ShopProduct";
import { ProductCategory } from "../models/ProductCategory";
import { MyShopService } from "../services/MyShopService";
import { CartService } from "../services/CartService";
import { ChatService } from "../services/ChatService";
import { CartPopup, ProfilePopup } from "../components/HeaderActionPopups";

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
  };

  myShopService = MyShopService.instance();
  cartService = CartService.instance();
  chatService = ChatService.instance();
  galleryViewportRef = React.createRef();
  galleryPointerState = {
    pointerId: null,
    startX: 0,
    startScrollLeft: 0,
    didDrag: false,
  };

  componentDidMount() {
    this.syncProductFromDatabase();
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
    if (!product?.id) {
      this.setState({ actionError: "ไม่พบรหัสสินค้า จึงยังเพิ่มลงตะกร้าไม่ได้", actionDone: "" });
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
    } = this.state;
    const product = this.getResolvedProduct();
    const imageUrls = product.getImageUrls();
    const safeActiveImageIndex =
      imageUrls.length > 0 ? Math.min(activeImageIndex, imageUrls.length - 1) : 0;
    const hasMultipleImages = imageUrls.length > 1;
    const exchangeItem = `${product?.exchangeItem ?? ""}`.trim();
    const hasProductData = Boolean(product?.id || product?.name);
    const cartTotalLabel = this.getCartTotalLabel();
    const isSold = product?.isSold?.() ?? false;

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
              🛒
            </button>

            <button
              className="h-10 w-10 rounded-xl bg-[#F4D03E] border border-zinc-200 grid place-items-center"
              onClick={() => this.props.onGoChat?.()}
              title="แชท"
            >
              💬
            </button>

            <button
              className="h-10 w-10 rounded-xl bg-[#F4D03E] text-white grid place-items-center"
              onClick={this.openProfilePopup}
              title="บัญชี"
            >
              👤
            </button>
          </div>
        </div>

        <div className="mx-auto max-w-375 px-4 py-6">
          <div className="rounded-2xl bg-white shadow p-4 md:p-6 space-y-4">
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
                        : ""
                    }`}
                    onScroll={hasMultipleImages ? this.onGalleryScroll : undefined}
                    onPointerDown={hasMultipleImages ? this.onGalleryPointerDown : undefined}
                    onPointerMove={hasMultipleImages ? this.onGalleryPointerMove : undefined}
                    onPointerUp={hasMultipleImages ? this.finishGalleryPointerDrag : undefined}
                    onPointerCancel={hasMultipleImages ? this.finishGalleryPointerDrag : undefined}
                    style={{ touchAction: hasMultipleImages ? "pan-y" : "auto" }}
                  >
                    {imageUrls.length ? (
                      imageUrls.map((url, index) => (
                        <div
                          key={`${product.id || product.name}-image-${index}`}
                          className="grid h-full w-full shrink-0 snap-center place-items-center overflow-hidden"
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
                      <div>
                        {safeActiveImageIndex + 1}/{imageUrls.length}
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
                  <div className="text-2xl font-semibold text-zinc-900 break-words">
                    {product?.name || "ไม่ระบุชื่อสินค้า"}
                  </div>
                  <div
                    className={`inline-flex w-fit rounded-full px-2.5 py-1 text-xs font-semibold ${
                      isSold ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"
                    }`}
                  >
                    {product?.getSaleStatusLabel?.() ?? "พร้อมขาย"}
                  </div>
                  <div className="text-xl font-semibold text-zinc-800">{product?.getPriceLabel?.() ?? "฿0.00"}</div>
                  {exchangeItem ? (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-zinc-700 break-words">
                      ต้องการแลกกับ: <span className="font-medium text-zinc-900">{exchangeItem}</span>
                    </div>
                  ) : null}

                  <div className="grid max-w-md grid-cols-2 gap-2">
                    <button
                      type="button"
                      className="rounded-xl border border-zinc-200 px-3 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-60"
                      onClick={this.onChatSeller}
                      disabled={openingChat}
                    >
                      {openingChat ? "กำลังสร้างแชท..." : "คุยกับร้านค้า"}
                    </button>
                    <button
                      type="button"
                      className="rounded-xl bg-zinc-900 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
                      onClick={this.onAddToCart}
                      disabled={addingToCart || isSold}
                    >
                      {addingToCart ? "กำลังเพิ่ม..." : isSold ? "ขายออกแล้ว" : "เพิ่มลงตะกร้า"}
                    </button>
                  </div>

                  <div className="inline-flex rounded-full bg-zinc-100 px-2.5 py-1 text-xs text-zinc-700">
                    {ProductCategory.getLabel(product?.category)}
                  </div>
                  <p className="rounded-xl bg-zinc-50 p-3 text-sm text-zinc-700 whitespace-pre-line break-words">
                    {product?.description || "ยังไม่มีคำอธิบายสินค้า"}
                  </p>
                </div>
              </div>
            )}
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
      </div>
    );
  }
}
