import React from "react";
import { UserService } from "../services/UserService";
import { MyShopService } from "../services/MyShopService";
import { ProductCategory } from "../models/ProductCategory";

export class HomePage extends React.Component {
  state = {
    showProfilePopup: false,
    showEditModal: false,
    draft: null,
    avatarFile: null,
    saving: false,
    error: "",
    loadingProducts: true,
    productsError: "",
    products: [],
    searchKeyword: "",
    selectedCategory: ProductCategory.ALL,
  };

  userService = UserService.instance();
  myShopService = MyShopService.instance();

  async componentDidMount() {
    await this.loadMarketplaceProducts();
  }

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
    this.setState({
      showProfilePopup: false,
      showEditModal: true,
      draft: { ...(this.props.user ?? {}) },
      avatarFile: null,
      error: "",
    });
  };

  closeEditModal = () => {
    this.setState({
      showEditModal: false,
      draft: null,
      avatarFile: null,
      error: "",
    });
  };

  goMyShop = () => {
    this.setState({ showProfilePopup: false });
    this.props.onGoMyShop?.();
  };

  setDraftField = (key, value) => {
    this.setState((s) => ({
      draft: { ...s.draft, [key]: value },
      error: "",
    }));
  };

  setAvatarFile = (file) => {
    this.setState({ avatarFile: file ?? null, error: "" });
  };

  onSearchChange = (value) => {
    this.setState({ searchKeyword: value ?? "" });
    this.props.onSearch?.(value);
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
    const { draft, avatarFile } = this.state;
    this.setState({ saving: true, error: "" });
    try {
      const editablePayload = {
        name: draft?.name ?? "",
        email: draft?.email ?? "",
        avatarUrl: draft?.avatarUrl ?? "",
        phone: draft?.phone ?? "",
        address: draft?.address ?? "",
      };

      const result = avatarFile
        ? await this.userService.updateMeFormData(editablePayload, avatarFile)
        : await this.userService.updateMe(editablePayload);
      const updated = result?.user;
      if (!updated) throw new Error("อัปเดตไม่สำเร็จ");

      this.props.onUpdatedUser?.(updated);
      this.setState({
        showEditModal: false,
        draft: { ...updated },
        avatarFile: null,
        error: "",
      });
    } catch (e) {
      this.setState({ error: e?.message ?? "เกิดข้อผิดพลาด" });
    } finally {
      this.setState({ saving: false });
    }
  };

  render() {
    const {
      showProfilePopup,
      showEditModal,
      draft,
      saving,
      error,
      avatarFile,
      loadingProducts,
      productsError,
      selectedCategory,
    } = this.state;
    const user = this.props.user ?? {};
    const filteredProducts = this.getFilteredProducts();

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
            <input
              className="flex-1 rounded-xl border bg-white border-zinc-200 px-3 py-2 text-sm outline-none"
              placeholder="ค้นหาสินค้า..."
              onChange={(e) => this.onSearchChange(e.target.value)}
            />

            <button
              className="h-10 w-10 rounded-xl bg-[#F4D03E] border border-zinc-200 grid place-items-center"
              onClick={this.props.onCart}
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

        <div className="mx-auto max-w-7xl px-4 py-6 space-y-6">
          <HomeBanner />
        </div>
        <div className="mx-auto max-w-375 px-4 py-6 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-[15rem_minmax(0,1fr)] gap-6">
            <CategorySidebar
              selectedCategory={selectedCategory}
              onSelectCategory={this.onCategoryChange}
            />

            <div className="rounded-2xl bg-white shadow p-4 md:p-6 space-y-4">
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
                <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-4">
                  {filteredProducts.map((product, index) => (
                    <HomeProductCard key={product.id || `${product.name}-${index}`} product={product} />
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {showProfilePopup ? (
          <ProfilePopup
            user={user}
            onClose={this.closeProfilePopup}
            onEdit={this.openEditModal}
            onGoMyShop={this.goMyShop}
            onLogout={this.props.onLogout}
          />
        ) : null}

        {showEditModal && draft ? (
          <EditProfileModal
            user={draft}
            saving={saving}
            error={error}
            avatarFile={avatarFile}
            onClose={this.closeEditModal}
            onChangeField={this.setDraftField}
            onChangeAvatarFile={this.setAvatarFile}
            onSave={this.saveProfile}
          />
        ) : null}
      </div>
    );
  }
}

class CategorySidebar extends React.Component {
  render() {
    const { selectedCategory, onSelectCategory } = this.props;
    const categories = ProductCategory.listWithAll();

    return (
      <aside className="rounded-2xl bg-white shadow p-3 md:p-4">
        <div className="text-sm font-semibold text-zinc-800 px-2 pb-2">หมวดหมู่</div>
        <div className="space-y-1">
          {categories.map((category) => {
            const active = category === selectedCategory;
            return (
              <button
                key={category}
                type="button"
                className={`w-full rounded-xl px-3 py-2 text-left text-sm transition ${active ? "bg-zinc-900 text-white" : "bg-zinc-50 text-zinc-700 hover:bg-zinc-100"}`}
                onClick={() => onSelectCategory?.(category)}
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

class HomeBanner extends React.Component {
  render() {
    return (
      <section className="rounded-xl bg-gradient-to-r from-cyan-300 via-sky-300 to-emerald-300 p-6 md:p-8 shadow">
        <div className="max-w-xl space-y-20">
          <div className="inline-flex rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-zinc-700">
            Banner โฆษณา
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-zinc-900">พื้นที่แบนเนอร์สำหรับโปรโมชันและกิจกรรมร้านค้า</h1>
          <p className="text-sm md:text-base text-zinc-800/90">
            โครงสำหรับวางภาพโฆษณา, ข้อความโปรโมชัน และลิงก์ไปยังหน้ารายละเอียดแคมเปญ
          </p>
        </div>
      </section>
    );
  }
}

class HomeProductCard extends React.Component {
  render() {
    const { product } = this.props;
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
        </div>
      </article>
    );
  }
}

class ProfilePopup extends React.Component {
  stop = (e) => e.stopPropagation();

  render() {
    const { user, onClose, onEdit, onGoMyShop, onLogout } = this.props;

    return (
      <div className="fixed inset-0 z-50" onClick={onClose}>
        <div className="absolute right-5 top-23 w-[20rem] max-w-[calc(100vw-2rem)]" onClick={this.stop}>
          <div className="absolute -top-1.5 right-19 h-3 w-3 rotate-45 bg-white border-l border-t border-zinc-200" />
          <div className="rounded-3xl border border-zinc-200 bg-white shadow-xl p-4 space-y-4">
            <div className="rounded-2xl bg-zinc-50 p-3">
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
                    <button
                      className="h-7 w-7 rounded-lg bg-zinc-900 text-white grid place-items-center text-xs"
                      onClick={onEdit}
                      title="แก้ไขโปรไฟล์"
                    >
                      ✎
                    </button>
                  </div>
                  <div className="text-xs text-zinc-500 truncate">{user?.email || ""}</div>
                </div>
              </div>
            </div>

            <button
              className="w-full rounded-xl bg-zinc-900 text-white px-3 py-2.5 text-sm font-semibold"
              onClick={onGoMyShop}
            >
              ลงขาย
            </button>

            <button
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

class EditProfileModal extends React.Component {
  stop = (e) => e.stopPropagation();

  render() {
    const { user, saving, error, avatarFile, onClose, onChangeField, onChangeAvatarFile, onSave } = this.props;
    const idCard = user?.idCard ?? {};

    return (
      <div className="fixed inset-0 z-[60] bg-black/40 overflow-y-auto hide-scrollbar p-4" onClick={onClose}>
        <div
          className="mx-auto my-4 w-full max-w-3xl max-h-[calc(100dvh-2rem)] overflow-y-auto hide-scrollbar rounded-3xl bg-white shadow p-4 md:p-6 space-y-6"
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
            <div className="h-16 w-16 rounded-full bg-zinc-200 overflow-hidden grid place-items-center">
              {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt="avatar" className="h-full w-full object-cover" />
              ) : (
                <span className="text-zinc-600">👤</span>
              )}
            </div>
            <div className="text-3xl font-semibold">{user?.name || "User"}</div>
          </div>

          {error ? <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}

          <div className="space-y-3">
            <div className="text-2xl font-semibold text-zinc-800">ข้อมูลบัญชี</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field label="ชื่อที่แสดง" value={user?.name} onChange={(v) => onChangeField("name", v)} />
              <Field label="อีเมล" value={user?.email} onChange={(v) => onChangeField("email", v)} />
              <Field label="เบอร์โทร" value={user?.phone} onChange={(v) => onChangeField("phone", v)} />
              <Field
                label="ลิงก์รูปโปรไฟล์ (URL)"
                value={user?.avatarUrl}
                onChange={(v) => onChangeField("avatarUrl", v)}
              />
              <FileField
                label="อัปโหลดรูปโปรไฟล์ (ไฟล์)"
                value={avatarFile}
                onChange={onChangeAvatarFile}
              />
              <Field label="ที่อยู่" value={user?.address} onChange={(v) => onChangeField("address", v)} full />
            </div>
          </div>

          <div className="space-y-3">
            <div className="text-2xl font-semibold text-zinc-800">ข้อมูลบัตรประชาชน</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field label="เลขบัตรประชาชน" value={idCard.citizenId} disabled />
              <Field label="คำนำหน้า" value={idCard.title} disabled />
              <Field label="ชื่อ" value={idCard.firstName} disabled />
              <Field label="นามสกุล" value={idCard.lastName} disabled />
              <Field label="วันเกิด" value={idCard.dob} disabled />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button
              className="rounded-xl border border-zinc-200 px-4 py-2 font-medium"
              onClick={onClose}
              disabled={saving}
            >
              ยกเลิก
            </button>
            <button
              className="rounded-xl bg-[#F4D03E] text-black px-4 py-2 font-semibold disabled:opacity-60"
              onClick={onSave}
              disabled={saving}
            >
              {saving ? "กำลังบันทึก..." : "บันทึก"}
            </button>
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

class FileField extends React.Component {
  render() {
    const { label, onChange, value } = this.props;
    return (
      <label className="space-y-1">
        <div className="text-sm font-medium text-zinc-600">{label}</div>
        <input
          type="file"
          accept="image/*"
          className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none file:mr-3 file:rounded-lg file:border-0 file:bg-zinc-100 file:px-3 file:py-1.5"
          onChange={(e) => onChange?.(e.target.files?.[0] ?? null)}
        />
        {value ? <div className="text-xs text-zinc-500 truncate">{value.name}</div> : null}
      </label>
    );
  }
}
