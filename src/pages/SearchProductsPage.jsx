import React from "react";
import { MyShopService } from "../services/MyShopService";
import { ProductCategory } from "../models/ProductCategory";
import { CartService } from "../services/CartService";
import { CartPopup, ProfilePopup } from "../components/HeaderActionPopups";

export class SearchProductsPage extends React.Component {
  state = {
    keyword: this.props.initialKeyword ?? "",
    loading: true,
    error: "",
    products: [],
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

  async componentDidMount() {
    await this.searchProducts(this.state.keyword);
  }

  componentDidUpdate(prevProps) {
    const prevKeyword = prevProps.initialKeyword ?? "";
    const nextKeyword = this.props.initialKeyword ?? "";

    if (prevKeyword !== nextKeyword) {
      this.setState({ keyword: nextKeyword });
      this.searchProducts(nextKeyword);
    }
  }

  onKeywordChange = (value) => {
    this.setState({ keyword: value ?? "" });
  };

  onSubmitSearch = async (e) => {
    e.preventDefault();
    await this.searchProducts(this.state.keyword);
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

  getNameSimilarityScore(name, keyword) {
    const source = (name ?? "").toLowerCase().trim();
    const target = (keyword ?? "").toLowerCase().trim();
    if (!target) return 1;
    if (!source) return 0;
    if (source === target) return 1;
    if (source.startsWith(target)) return 0.95;
    if (source.includes(target)) return 0.85 + Math.min(target.length / Math.max(source.length, 1), 0.1);

    const sourceChars = new Set(source.split(""));
    const overlapCount = target.split("").filter((char) => sourceChars.has(char)).length;
    return overlapCount / target.length;
  }

  rankProductsBySimilarity(products, keyword) {
    const target = (keyword ?? "").trim();
    if (!target) return products;

    return products
      .map((product) => ({
        product,
        score: this.getNameSimilarityScore(product?.name, target),
      }))
      .filter((item) => item.score >= 0.35)
      .sort((a, b) => b.score - a.score)
      .map((item) => item.product);
  }

  searchProducts = async (keywordInput) => {
    const keyword = (keywordInput ?? "").trim();
    this.setState({ loading: true, error: "" });
    try {
      const { products } = await this.myShopService.searchMarketplaceProducts(keyword);
      const rankedProducts = this.rankProductsBySimilarity(products ?? [], keyword);
      this.setState({ products: rankedProducts, keyword });
    } catch (e) {
      this.setState({
        error: e?.message ?? "ค้นหาสินค้าไม่สำเร็จ",
      });
    } finally {
      this.setState({ loading: false });
    }
  };

  render() {
    const {
      keyword,
      loading,
      error,
      products,
      showProfilePopup,
      showCartPopup,
      cartLoading,
      cartError,
      cartDone,
      cartItems,
      checkingOut,
    } = this.state;
    const labelKeyword = keyword.trim() ? keyword.trim() : "ทั้งหมด";
    const cartTotalLabel = this.getCartTotalLabel();

    return (
      <div className="min-h-dvh bg-zinc-50">
        <div className="sticky top-0 z-40 bg-[#A4E3D8] border-b border-zinc-200">
          <div className="mx-auto max-w-350 px-4 py-5 flex items-center gap-4">
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

            <form className="flex-1" onSubmit={this.onSubmitSearch}>
              <input
                className="w-full rounded-xl border bg-white border-zinc-200 px-3 py-2 text-sm outline-none"
                placeholder="ค้นหาสินค้า..."
                value={keyword}
                onChange={(e) => this.onKeywordChange(e.target.value)}
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
              className="h-10 w-10 rounded-xl bg-[#F4D03E] text-white grid place-items-center"
              onClick={this.openProfilePopup}
              title="บัญชี"
            >
              👤
            </button>
          </div>
        </div>

        <div className="mx-auto max-w-375 px-4 py-6 space-y-6">
          <div className="rounded-2xl bg-white shadow p-4 md:p-6 space-y-4">
            <div className="text-sm text-zinc-500">
              ผลการค้นหา: <span className="font-semibold text-zinc-800">{labelKeyword}</span>
            </div>

            {loading ? <div className="text-sm text-zinc-500">กำลังค้นหาสินค้าจากฐานข้อมูล...</div> : null}
            {error ? (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            ) : null}

            {!loading && !error && !products.length ? (
              <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-6 text-center text-sm text-zinc-500">
                ไม่พบสินค้าที่คล้ายกับคำค้นหา
              </div>
            ) : null}

            {!loading && !error && products.length ? (
              <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-4">
                {products.map((product, index) => (
                  <SearchProductCard
                    key={product.id || `${product.name}-${index}`}
                    product={product}
                    onOpenProduct={this.props.onOpenProduct}
                  />
                ))}
              </div>
            ) : null}
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

class SearchProductCard extends React.Component {
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
          <div className="font-semibold text-zinc-800 line-clamp-2 break-words">{product?.name || "ไม่ระบุชื่อสินค้า"}</div>
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
