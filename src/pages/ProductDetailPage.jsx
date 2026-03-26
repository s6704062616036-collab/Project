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

  componentDidMount() {
    this.syncProductFromDatabase();
  }

  componentDidUpdate(prevProps) {
    const prevProductId = this.getProductId(prevProps.product);
    const nextProductId = this.getProductId(this.props.product);

    if (prevProductId !== nextProductId) {
      this.syncProductFromDatabase();
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

  checkoutCart = async () => {
    if (!this.state.cartItems.length) return;

    this.setState({ checkingOut: true, cartError: "", cartDone: "" });
    try {
      const result = await this.cartService.checkout();
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
    } = this.state;
    const product = this.getResolvedProduct();
    const imageUrls = product.getImageUrls();
    const primaryImage = imageUrls[0] ?? "";
    const hasProductData = Boolean(product?.id || product?.name);
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
                  <div className="aspect-square rounded-2xl bg-zinc-100 overflow-hidden grid place-items-center">
                    {primaryImage ? (
                      <img
                        src={primaryImage}
                        alt={product?.name ?? "product-image"}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-sm text-zinc-400">ไม่มีรูปภาพ</span>
                    )}
                  </div>
                  {imageUrls.length > 1 ? (
                    <div className="grid grid-cols-4 gap-2">
                      {imageUrls.map((url, index) => (
                        <div
                          key={`${product.id || product.name}-preview-${index}`}
                          className="aspect-square rounded-lg border border-zinc-200 overflow-hidden"
                        >
                          <img src={url} alt={`${product.name}-${index + 1}`} className="h-full w-full object-cover" />
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>

                <div className="space-y-3">
                  <div className="text-2xl font-semibold text-zinc-900 break-words">
                    {product?.name || "ไม่ระบุชื่อสินค้า"}
                  </div>
                  <div className="text-xl font-semibold text-zinc-800">{product?.getPriceLabel?.() ?? "฿0.00"}</div>

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
                      disabled={addingToCart}
                    >
                      {addingToCart ? "กำลังเพิ่ม..." : "เพิ่มลงตะกร้า"}
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
            onLogout={this.props.onLogout}
          />
        ) : null}
      </div>
    );
  }
}
