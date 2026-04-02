import React from "react";
import { UserService } from "../services/UserService";
import { MyShopService } from "../services/MyShopService";
import { ProductCategory } from "../models/ProductCategory";
import { CartService } from "../services/CartService";
import { CategoryService } from "../services/CategoryService";
import {
  CartPopup as HeaderCartPopup,
  ProfilePopup as HeaderProfilePopup,
} from "../components/HeaderActionPopups";
import { NotificationBellButton } from "../components/NotificationBellButton";
import { SavedAddressesEditor } from "../components/SavedAddressesEditor";

export class HomePage extends React.Component {
  state = {
    showProfilePopup: false,
    showCartPopup: false,
    showEditModal: false,
    draft: null,
    avatarFile: null,
    avatarPreviewUrl: "",
    saving: false,
    deletingAccount: false,
    error: "",
    cartLoading: false,
    cartError: "",
    cartDone: "",
    cartItems: [],
    checkingOut: false,
    loadingProducts: true,
    productsError: "",
    products: [],
    categories: ProductCategory.list(),
    searchKeyword: "",
    selectedCategory: ProductCategory.ALL,
  };

  userService = UserService.instance();
  myShopService = MyShopService.instance();
  cartService = CartService.instance();
  categoryService = CategoryService.instance();

  async componentDidMount() {
    await Promise.all([this.loadCategories(), this.loadMarketplaceProducts(), this.loadCartItems()]);
  }

  componentWillUnmount() {
    this.revokePreviewUrl(this.state.avatarPreviewUrl);
  }

  revokePreviewUrl = (previewUrl) => {
    if (!previewUrl || typeof URL === "undefined") return;
    try {
      URL.revokeObjectURL(previewUrl);
    } catch {
      // ignore cleanup error
    }
  };

  loadMarketplaceProducts = async () => {
    this.setState({ loadingProducts: true, productsError: "" });
    try {
      const { products } = await this.myShopService.listMarketplaceProducts();
      this.setState({ products: products ?? [] });
    } catch (e) {
      this.setState({
        productsError: e?.message ?? "โหลดสินค้าหน้าแรกไม่สำเร็จ",
      });
    } finally {
      this.setState({ loadingProducts: false });
    }
  };

  openProfilePopup = () => {
    this.setState({
      showProfilePopup: true,
      showCartPopup: false,
      showEditModal: false,
      draft: { ...(this.props.user ?? {}) },
      avatarFile: null,
      error: "",
    });
  };

  closeProfilePopup = () => {
    this.setState({ showProfilePopup: false, error: "" });
  };

  openEditModal = () => {
    this.revokePreviewUrl(this.state.avatarPreviewUrl);
    this.setState({
      showProfilePopup: false,
      showEditModal: true,
      draft: { ...(this.props.user ?? {}) },
      avatarFile: null,
      avatarPreviewUrl: "",
      error: "",
    });
  };

  loadCategories = async () => {
    try {
      const { categories } = await this.categoryService.listCategories();
      this.setState((state) => ({
        categories: categories ?? ProductCategory.list(),
        selectedCategory:
          state.selectedCategory === ProductCategory.ALL || (categories ?? []).includes(state.selectedCategory)
            ? state.selectedCategory
            : ProductCategory.ALL,
      }));
    } catch {
      this.setState({ categories: ProductCategory.list() });
    }
  };

  closeEditModal = () => {
    this.revokePreviewUrl(this.state.avatarPreviewUrl);
    this.setState({
      showEditModal: false,
      draft: null,
      avatarFile: null,
      avatarPreviewUrl: "",
      error: "",
    });
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
    this.props.onCart?.();
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
        this.loadMarketplaceProducts(),
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

  setDraftField = (key, value) => {
    this.setState((s) => ({
      draft: { ...s.draft, [key]: value },
      error: "",
    }));
  };

  setAvatarFile = (file) => {
    this.revokePreviewUrl(this.state.avatarPreviewUrl);
    const nextFile = file ?? null;
    const avatarPreviewUrl =
      nextFile && typeof URL !== "undefined" ? URL.createObjectURL(nextFile) : "";

    this.setState({ avatarFile: nextFile, avatarPreviewUrl, error: "" });
  };

  onSearchChange = (value) => {
    this.setState({ searchKeyword: value ?? "" });
    this.props.onSearch?.(value);
  };

  onSearchSubmit = (e) => {
    e.preventDefault();
    const keyword = (this.state.searchKeyword ?? "").trim();
    this.props.onSubmitSearch?.(keyword);
  };

  onCategoryChange = (category) => {
    this.setState({ selectedCategory: category });
    this.props.onPickCategory?.(category);
  };

  getFilteredProducts() {
    const { products, searchKeyword, selectedCategory } = this.state;
    const keyword = (searchKeyword ?? "").trim().toLowerCase();

    return products.filter((product) => {
      const text = `${product?.name ?? ""} ${product?.description ?? ""}`.toLowerCase();
      const matchKeyword = !keyword || text.includes(keyword);
      const matchCategory =
        ProductCategory.isAll(selectedCategory) ||
        ProductCategory.normalize(product?.category) === selectedCategory;

      return matchKeyword && matchCategory;
    });
  }

  saveProfile = async () => {
    const { draft, avatarFile, avatarPreviewUrl } = this.state;
    this.setState({ saving: true, error: "" });
    try {
      const editablePayload = {
        name: draft?.name ?? "",
        firstName: draft?.firstName ?? "",
        lastName: draft?.lastName ?? "",
        email: draft?.email ?? "",
        phone: draft?.phone ?? "",
        address: draft?.address ?? "",
        addresses: Array.isArray(draft?.addresses) ? draft.addresses : [],
      };

      const result = avatarFile
        ? await this.userService.updateMeFormData(editablePayload, avatarFile)
        : await this.userService.updateMe(editablePayload);
      const updated = result?.user;
      if (!updated) throw new Error("อัปเดตไม่สำเร็จ");

      this.props.onUpdatedUser?.(updated);
      this.revokePreviewUrl(avatarPreviewUrl);
      this.setState({
        showEditModal: false,
        draft: { ...updated },
        avatarFile: null,
        avatarPreviewUrl: "",
        error: "",
      });
    } catch (e) {
      this.setState({ error: e?.message ?? "เกิดข้อผิดพลาด" });
    } finally {
      this.setState({ saving: false });
    }
  };

  deleteAccount = async () => {
    if (typeof window !== "undefined") {
      const confirmed = window.confirm("ยืนยันลบบัญชีนี้? การดำเนินการนี้ไม่สามารถย้อนกลับได้");
      if (!confirmed) return;
    }

    const { avatarPreviewUrl } = this.state;
    this.setState({ deletingAccount: true, error: "" });
    try {
      await this.userService.deleteMe();
      this.revokePreviewUrl(avatarPreviewUrl);
      this.props.onDeletedAccount?.();
    } catch (e) {
      this.setState({
        deletingAccount: false,
        error: e?.message ?? "ลบบัญชีไม่สำเร็จ",
      });
    }
  };

  render() {
    const {
      showProfilePopup,
      showCartPopup,
      showEditModal,
      draft,
      saving,
      deletingAccount,
      error,
      avatarFile,
      avatarPreviewUrl,
      cartLoading,
      cartError,
      cartDone,
      cartItems,
      checkingOut,
      loadingProducts,
      productsError,
      searchKeyword,
      categories,
      selectedCategory,
    } = this.state;
    const user = this.props.user ?? {};
    const filteredProducts = this.getFilteredProducts();
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

        <div className="mx-auto max-w-375 px-4 py-6 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-[15rem_minmax(0,1fr)] gap-6">
            <CategorySidebar
              categories={categories}
              selectedCategory={selectedCategory}
              onSelectCategory={this.onCategoryChange}
            />

            <div className="app-page-section app-main-panel rounded-2xl p-4 md:p-6 space-y-4">
              {loadingProducts ? <div className="text-sm text-zinc-500">กำลังโหลดสินค้าจากฐานข้อมูล...</div> : null}
              {productsError ? (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  {productsError}
                </div>
              ) : null}

              {!loadingProducts && !filteredProducts.length ? (
                <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-6 text-center text-sm text-zinc-500">
                  ยังไม่มีสินค้าที่ลงขาย
                </div>
              ) : null}

              {!loadingProducts && filteredProducts.length ? (
                <div className="grid grid-cols-[repeat(auto-fill,minmax(170px,1fr))] gap-4">
                  {filteredProducts.map((product, index) => (
                    <HomeProductCard
                      key={product.id || `${product.name}-${index}`}
                      product={product}
                      onOpenProduct={this.props.onOpenProduct}
                    />
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {showCartPopup ? (
          <HeaderCartPopup
            items={cartItems}
            buyer={user}
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
          <HeaderProfilePopup
            user={user}
            onClose={this.closeProfilePopup}
            onEdit={this.openEditModal}
            onGoMyShop={this.goMyShop}
            onGoMyOrders={this.goMyOrders}
            onLogout={this.props.onLogout}
          />
        ) : null}

        {showEditModal && draft ? (
          <MultiAddressEditProfileModal
            user={draft}
            saving={saving}
            error={error}
            avatarFile={avatarFile}
            avatarPreviewUrl={avatarPreviewUrl}
            onClose={this.closeEditModal}
            onChangeField={this.setDraftField}
            onChangeAvatarFile={this.setAvatarFile}
            onSave={this.saveProfile}
            onDelete={this.deleteAccount}
            deleting={deletingAccount}
          />
        ) : null}
      </div>
    );
  }
}

class CategorySidebar extends React.Component {
  render() {
    const { categories, selectedCategory, onSelectCategory } = this.props;
    const categoryOptions = [ProductCategory.ALL, ...(categories ?? [])];

    return (
      <aside className="app-side-panel rounded-2xl p-3 md:p-4">
        <div className="text-sm font-semibold text-zinc-800 px-2 pb-2">หมวดหมู่</div>
        <div className="space-y-1">
          {categoryOptions.map((category) => {
            const active = category === selectedCategory;
            return (
              <button
                key={category}
                type="button"
                className={`w-full rounded-xl px-3 py-2 text-left text-sm transition ${active ? "border border-amber-300 bg-[#F4D03E] text-zinc-900" : "app-soft-panel text-zinc-700 hover:bg-zinc-100"}`}
                onClick={() => onSelectCategory?.(category)}
                aria-pressed={active}
              >
                {ProductCategory.getLabel(category)}
              </button>
            );
          })}
        </div>
      </aside>
    );
  }
}

class HomeProductCard extends React.Component {
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
          <div className="font-semibold text-zinc-800 line-clamp-2 break-words">{product?.name || "ไม่ระบุชื่อสินค้า"}</div>
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

class EditProfileModal extends React.Component {
  stop = (e) => e.stopPropagation();

  render() {
    const {
      user,
      saving,
      deleting,
      error,
      avatarFile,
      avatarPreviewUrl,
      onClose,
      onChangeField,
      onChangeAvatarFile,
      onSave,
      onDelete,
    } = this.props;
    const displayAvatarUrl = avatarPreviewUrl || user?.avatarUrl || "";

    return (
      <div className="app-modal-overlay fixed inset-0 z-[60] bg-black/40 hide-scrollbar" onClick={onClose}>
        <div
          className="app-modal-card hide-scrollbar w-full max-w-3xl rounded-3xl bg-white shadow p-4 md:p-6 space-y-6"
          onClick={this.stop}
        >
          <div className="flex items-center justify-between">
            <div className="text-2xl font-semibold">บัญชีของฉัน</div>
            <button
              className="h-10 w-10 rounded-xl border border-zinc-200 grid place-items-center"
              onClick={onClose}
              title="ปิด"
            >
              ✕
            </button>
          </div>

          <div className="flex items-center gap-4">
            <label className="group relative block h-20 w-20 cursor-pointer overflow-hidden rounded-full bg-zinc-200 ring-4 ring-white">
              {displayAvatarUrl ? (
                <img src={displayAvatarUrl} alt="avatar" className="h-full w-full object-cover" />
              ) : (
                <span className="grid h-full w-full place-items-center text-zinc-600">👤</span>
              )}
              <div className="absolute inset-0 grid place-items-center bg-black/45 text-center text-[11px] font-semibold text-white opacity-0 transition group-hover:opacity-100">
                กดเพื่อเปลี่ยนรูป
              </div>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => onChangeAvatarFile?.(e.target.files?.[0] ?? null)}
              />
            </label>
            <div className="space-y-1">
              <div className="text-3xl font-semibold">{user?.name || "User"}</div>
              <div className="text-sm text-zinc-500">
                กดที่รูปเพื่ออัปโหลดและแก้ไขรูปโปรไฟล์
              </div>
              {avatarFile ? <div className="text-xs text-zinc-500">{avatarFile.name}</div> : null}
            </div>
          </div>

          {error ? <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}

          <div className="space-y-3">
            <div className="text-2xl font-semibold text-zinc-800">ข้อมูลบัญชี</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field label="ชื่อจริง" value={user?.firstName} onChange={(v) => onChangeField("firstName", v)} />
              <Field label="นามสกุล" value={user?.lastName} onChange={(v) => onChangeField("lastName", v)} />
              <Field label="ชื่อแสดง (สาธารณะ)" value={user?.name} onChange={(v) => onChangeField("name", v)} />
              <Field label="อีเมล" value={user?.email} onChange={(v) => onChangeField("email", v)} />
              <Field label="เบอร์โทร" value={user?.phone} onChange={(v) => onChangeField("phone", v)} />
              <Field label="ที่อยู่" value={user?.address} onChange={(v) => onChangeField("address", v)} full />
            </div>
          </div>

          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            ชื่อจริงและนามสกุลไม่แสดงต่อสาธารณะ ใช้สำหรับ KYC และตรวจสอบความตรงกันกับชื่อบัญชีธนาคารเท่านั้น
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <button
              className="rounded-xl border border-red-200 px-4 py-2 font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60"
              onClick={onDelete}
              disabled={saving || deleting}
            >
              {deleting ? "กำลังลบบัญชี..." : "ลบบัญชี"}
            </button>
            <div className="flex gap-2">
              <button
                className="rounded-xl border border-zinc-200 px-4 py-2 font-medium"
                onClick={onClose}
                disabled={saving || deleting}
              >
                ยกเลิก
              </button>
              <button
                className="rounded-xl bg-[#F4D03E] text-black px-4 py-2 font-semibold disabled:opacity-60"
                onClick={onSave}
                disabled={saving || deleting}
              >
                {saving ? "กำลังบันทึก..." : "บันทึก"}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

class MultiAddressEditProfileModal extends React.Component {
  stop = (e) => e.stopPropagation();

  render() {
    const {
      user,
      saving,
      deleting,
      error,
      avatarFile,
      avatarPreviewUrl,
      onClose,
      onChangeField,
      onChangeAvatarFile,
      onSave,
      onDelete,
    } = this.props;
    const displayAvatarUrl = avatarPreviewUrl || user?.avatarUrl || "";

    return (
      <div className="app-modal-overlay fixed inset-0 z-[60] bg-black/40 hide-scrollbar" onClick={onClose}>
        <div
          className="app-modal-card hide-scrollbar w-full max-w-4xl rounded-3xl bg-white shadow p-4 md:p-6 space-y-6"
          onClick={this.stop}
        >
          <div className="flex items-center justify-between">
            <div className="text-2xl font-semibold">บัญชีของฉัน</div>
            <button
              className="grid h-10 w-10 place-items-center rounded-xl border border-zinc-200"
              onClick={onClose}
              title="ปิด"
            >
              ×
            </button>
          </div>

          <div className="flex items-center gap-4">
            <label className="group relative block h-20 w-20 cursor-pointer overflow-hidden rounded-full bg-zinc-200 ring-4 ring-white">
              {displayAvatarUrl ? (
                <img src={displayAvatarUrl} alt="avatar" className="h-full w-full object-cover" />
              ) : (
                <span className="grid h-full w-full place-items-center text-zinc-600">👤</span>
              )}
              <div className="absolute inset-0 grid place-items-center bg-black/45 text-center text-[11px] font-semibold text-white opacity-0 transition group-hover:opacity-100">
                กดเพื่อเปลี่ยนรูป
              </div>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => onChangeAvatarFile?.(e.target.files?.[0] ?? null)}
              />
            </label>
            <div className="space-y-1">
              <div className="text-3xl font-semibold">{user?.name || "User"}</div>
              <div className="text-sm text-zinc-500">กดที่รูปเพื่ออัปโหลดและแก้ไขรูปโปรไฟล์</div>
              {avatarFile ? <div className="text-xs text-zinc-500">{avatarFile.name}</div> : null}
            </div>
          </div>

          {error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
          ) : null}

          <div className="space-y-3">
            <div className="text-2xl font-semibold text-zinc-800">ข้อมูลบัญชี</div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <Field label="ชื่อจริง" value={user?.firstName} onChange={(v) => onChangeField("firstName", v)} />
              <Field label="นามสกุล" value={user?.lastName} onChange={(v) => onChangeField("lastName", v)} />
              <Field label="ชื่อแสดง (สาธารณะ)" value={user?.name} onChange={(v) => onChangeField("name", v)} />
              <Field label="อีเมล" value={user?.email} onChange={(v) => onChangeField("email", v)} />
              <Field label="เบอร์โทร" value={user?.phone} onChange={(v) => onChangeField("phone", v)} />
            </div>
          </div>

          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            ชื่อจริงและนามสกุลไม่แสดงต่อสาธารณะ ใช้สำหรับ KYC และตรวจสอบความตรงกันกับชื่อบัญชีธนาคารเท่านั้น
          </div>

          <SavedAddressesEditor
            addresses={user?.addresses}
            defaultName={user?.getPrivateFullName?.() || user?.name}
            defaultPhone={user?.phone}
            onChange={(nextAddresses) => {
              onChangeField("addresses", nextAddresses);
              const primaryAddress =
                (nextAddresses ?? []).find((entry) => entry?.isDefault)?.address ||
                nextAddresses?.[0]?.address ||
                "";
              onChangeField("address", primaryAddress);
            }}
          />

          <div className="flex flex-wrap items-center justify-between gap-3">
            <button
              className="rounded-xl border border-red-200 px-4 py-2 font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60"
              onClick={onDelete}
              disabled={saving || deleting}
            >
              {deleting ? "กำลังลบบัญชี..." : "ลบบัญชี"}
            </button>
            <div className="flex gap-2">
              <button
                className="rounded-xl border border-zinc-200 px-4 py-2 font-medium"
                onClick={onClose}
                disabled={saving || deleting}
              >
                ยกเลิก
              </button>
              <button
                className="rounded-xl bg-[#F4D03E] px-4 py-2 font-semibold text-black disabled:opacity-60"
                onClick={onSave}
                disabled={saving || deleting}
              >
                {saving ? "กำลังบันทึก..." : "บันทึก"}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

class Field extends React.Component {
  render() {
    const { label, value, disabled, onChange, full } = this.props;
    return (
      <label className={`space-y-1 ${full ? "md:col-span-2" : ""}`}>
        <div className="text-sm font-medium text-zinc-600">{label}</div>
        <input
          className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none disabled:bg-zinc-100"
          value={value ?? ""}
          disabled={disabled}
          onChange={(e) => onChange?.(e.target.value)}
        />
      </label>
    );
  }
}
