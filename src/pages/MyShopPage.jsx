import React from "react";
import { MyShopService } from "../services/MyShopService";
import { ShopProduct } from "../models/ShopProduct";
import { ProductCategory } from "../models/ProductCategory";
import { ProfilePopup } from "../components/HeaderActionPopups";

export class MyShopPage extends React.Component {
  state = {
    loading: true,
    saving: false,
    error: "",
    done: "",
    products: [],
    showCreatePopup: false,
    showProfilePopup: false,
    draftProduct: ShopProduct.empty(),
    imageFiles: [],
    imagePreviewUrls: [],
  };

  myShopService = MyShopService.instance();

  async componentDidMount() {
    await this.loadProducts();
  }

  componentWillUnmount() {
    this.revokePreviewUrls();
  }

  revokePreviewUrls = () => {
    if (typeof URL === "undefined") return;
    const previewUrls = this.state.imagePreviewUrls ?? [];
    previewUrls.forEach((url) => {
      try {
        URL.revokeObjectURL(url);
      } catch {
        // ignore cleanup error
      }
    });
  };

  loadProducts = async () => {
    this.setState({ loading: true, error: "" });
    try {
      const { products } = await this.myShopService.listProducts();
      this.setState({
        products: products ?? [],
      });
    } catch (e) {
      this.setState({
        error: e?.message ?? "โหลดข้อมูลสินค้าไม่สำเร็จ",
      });
    } finally {
      this.setState({ loading: false });
    }
  };

  openCreatePopup = () => {
    this.revokePreviewUrls();
    this.setState({
      showCreatePopup: true,
      draftProduct: ShopProduct.empty(),
      imageFiles: [],
      imagePreviewUrls: [],
      error: "",
      done: "",
    });
  };

  closeCreatePopup = () => {
    this.revokePreviewUrls();
    this.setState({
      showCreatePopup: false,
      draftProduct: ShopProduct.empty(),
      imageFiles: [],
      imagePreviewUrls: [],
      error: "",
    });
  };

  openProfilePopup = () => {
    this.setState({ showProfilePopup: true });
  };

  closeProfilePopup = () => {
    this.setState({ showProfilePopup: false });
  };

  goMyShop = () => {
    this.setState({ showProfilePopup: false });
    this.props.onGoMyShop?.();
  };

  setDraftField = (key, value) => {
    this.setState((s) => ({
      draftProduct: s.draftProduct.withPatch({ [key]: value }),
      error: "",
      done: "",
    }));
  };

  setImageFiles = (files) => {
    const safeFiles = Array.isArray(files) ? files.filter(Boolean) : [];
    this.revokePreviewUrls();

    const imagePreviewUrls =
      typeof URL === "undefined"
        ? []
        : safeFiles.map((file) => URL.createObjectURL(file));

    this.setState({
      imageFiles: safeFiles,
      imagePreviewUrls,
      error: "",
      done: "",
    });
  };

  submitProduct = async () => {
    const { draftProduct, imageFiles } = this.state;
    const validationError = draftProduct.validate({ imageFiles });
    if (validationError) {
      this.setState({ error: validationError });
      return;
    }

    this.setState({ saving: true, error: "", done: "" });
    try {
      const { product } = await this.myShopService.createProduct(
        draftProduct.toPayload(),
        imageFiles,
      );

      if (product) {
        this.revokePreviewUrls();
        this.setState((s) => ({
          products: [product, ...s.products],
          showCreatePopup: false,
          draftProduct: ShopProduct.empty(),
          imageFiles: [],
          imagePreviewUrls: [],
          done: "ลงขายสินค้าเรียบร้อย",
        }));
      } else {
        const { products } = await this.myShopService.listProducts();
        this.revokePreviewUrls();
        this.setState({
          products: products ?? [],
          showCreatePopup: false,
          draftProduct: ShopProduct.empty(),
          imageFiles: [],
          imagePreviewUrls: [],
          done: "ลงขายสินค้าเรียบร้อย",
        });
      }
    } catch (e) {
      this.setState({ error: e?.message ?? "ลงขายสินค้าไม่สำเร็จ" });
    } finally {
      this.setState({ saving: false });
    }
  };

  renderProducts() {
    const { products } = this.state;

    if (!products.length) {
      return (
        <div className="min-h-80 grid place-items-center">
          <button
            className="h-24 w-24 rounded-full border-2 border-dashed border-zinc-300 text-5xl font-light text-zinc-500 hover:bg-zinc-50"
            onClick={this.openCreatePopup}
            title="เพิ่มสินค้า"
          >
            +
          </button>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {products.map((product, index) => (
          <ProductCard key={product.id || `${product.name}-${index}`} product={product} />
        ))}
      </div>
    );
  }

  render() {
    const { user, onBack } = this.props;
    const {
      loading,
      saving,
      error,
      done,
      products,
      showCreatePopup,
      showProfilePopup,
      draftProduct,
      imageFiles,
      imagePreviewUrls,
    } = this.state;

    return (
      <div className="min-h-dvh bg-zinc-50">
        <div className="sticky top-0 z-40 bg-[#A4E3D8] border-b border-zinc-200">
          <div className="mx-auto max-w-6xl px-4 py-6 flex items-center justify-between gap-8">
            <div className="flex items-center gap-3 ">
              <button
                type="button"
                onClick={onBack}
                title="กลับหน้าแรก"
                className="shrink-0 rounded-xl border border-zinc-200 bg-white p-0 -ml-30"
              >
                <img
                  src="/App logo.jpg"
                  alt="App logo"
                  className="h-20 w-20 rounded-xl object-cover"
                />
              </button>
              <div className="font-semibold">สินค้าที่ลงขาย</div>
            </div>

            <div className="flex items-center gap-2">
              {products.length ? (
                <button
                  className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-medium"
                  onClick={this.openCreatePopup}
                >
                  + เพิ่มสินค้า
                </button>
              ) : null}

              <button
                type="button"
                className="h-10 w-10 rounded-xl bg-[#F4D03E] border border-zinc-200 grid place-items-center"
                onClick={() => this.props.onGoChat?.()}
                title="แชท"
              >
                💬
              </button>

              <button
                type="button"
                className="h-10 w-10 rounded-xl bg-[#F4D03E] text-white grid place-items-center"
                onClick={this.openProfilePopup}
                title="บัญชี"
              >
                👤
              </button>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-6xl px-4 py-6">
          <div className="rounded-2xl bg-white shadow p-4 md:p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-zinc-200 overflow-hidden grid place-items-center text-sm">
                {user?.avatarUrl ? (
                  <img src={user.avatarUrl} alt="avatar" className="h-full w-full object-cover" />
                ) : (
                  <span>👤</span>
                )}
              </div>
              <div>
                <div className="text-sm text-zinc-500">เจ้าของร้าน</div>
                <div className="font-semibold">{user?.name ?? "User"}</div>
              </div>
            </div>

            {loading ? <div className="text-sm text-zinc-500">กำลังโหลด...</div> : null}
            {error && !showCreatePopup ? (
              <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div>
            ) : null}
            {done ? <div className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">{done}</div> : null}

            {!loading ? this.renderProducts() : null}
          </div>
        </div>

        {showCreatePopup ? (
          <CreateProductModal
            draftProduct={draftProduct}
            imageFiles={imageFiles}
            imagePreviewUrls={imagePreviewUrls}
            saving={saving}
            error={error}
            onClose={this.closeCreatePopup}
            onChangeField={this.setDraftField}
            onChangeImageFiles={this.setImageFiles}
            onSubmit={this.submitProduct}
          />
        ) : null}

        {showProfilePopup ? (
          <ProfilePopup
            user={user}
            onClose={this.closeProfilePopup}
            onGoMyShop={this.goMyShop}
            onLogout={this.props.onLogout}
          />
        ) : null}
      </div>
    );
  }
}

class ProductCard extends React.Component {
  state = {
    activeImageIndex: 0,
  };

  componentDidUpdate(prevProps) {
    if (prevProps.product?.id !== this.props.product?.id) {
      this.setState({ activeImageIndex: 0 });
    }
  }

  setActiveImageIndex = (index) => {
    this.setState({ activeImageIndex: index });
  };

  render() {
    const { product } = this.props;
    const imageUrls = product?.getImageUrls?.() ?? (product?.imageUrl ? [product.imageUrl] : []);
    const activeImage = imageUrls[this.state.activeImageIndex] ?? imageUrls[0] ?? "";

    return (
      <article className="rounded-2xl border border-zinc-200 p-3">
        <div className="h-44 rounded-xl bg-zinc-100 overflow-hidden grid place-items-center">
          {activeImage ? (
            <img src={activeImage} alt={product.name} className="h-full w-full object-cover" />
          ) : (
            <span className="text-sm text-zinc-400">ไม่มีรูปภาพ</span>
          )}
        </div>

        {imageUrls.length > 1 ? (
          <div className="mt-2 flex items-center gap-2 overflow-x-auto hide-scrollbar">
            {imageUrls.map((url, index) => {
              const active = index === this.state.activeImageIndex;
              return (
                <button
                  key={`${product.id || product.name}-${index}`}
                  type="button"
                  className={`h-12 w-12 shrink-0 overflow-hidden rounded-lg border ${active ? "border-zinc-900" : "border-zinc-200"}`}
                  onClick={() => this.setActiveImageIndex(index)}
                  title={`รูปที่ ${index + 1}`}
                >
                  <img src={url} alt={`${product.name}-${index + 1}`} className="h-full w-full object-cover" />
                </button>
              );
            })}
          </div>
        ) : null}

        <div className="pt-3 space-y-1">
          <div className="font-semibold break-words">{product.name || "ไม่ระบุชื่อสินค้า"}</div>
          <div className="inline-flex w-fit rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-700">
            {ProductCategory.getLabel(product.category)}
          </div>
          <div className="text-sm font-medium text-zinc-700">{product.getPriceLabel()}</div>
          <p className="text-sm text-zinc-500 whitespace-pre-line break-words">
            {product.description || "ไม่มีคำอธิบาย"}
          </p>
        </div>
      </article>
    );
  }
}

class CreateProductModal extends React.Component {
  stop = (e) => e.stopPropagation();

  onSubmit = (e) => {
    e.preventDefault();
    this.props.onSubmit?.();
  };

  render() {
    const {
      draftProduct,
      imageFiles,
      imagePreviewUrls,
      saving,
      error,
      onClose,
      onChangeField,
      onChangeImageFiles,
    } = this.props;

    return (
      <div className="fixed inset-0 z-50 bg-black/40 grid place-items-center p-4" onClick={onClose}>
        <form
          className="w-full max-w-2xl rounded-3xl bg-white shadow p-4 md:p-6 space-y-4"
          onClick={this.stop}
          onSubmit={this.onSubmit}
        >
          <div className="flex items-center justify-between">
            <div className="text-xl md:text-2xl font-semibold">เพิ่มสินค้า</div>
            <button
              type="button"
              className="h-10 w-10 rounded-xl border border-zinc-200 grid place-items-center"
              onClick={onClose}
              title="ปิด"
            >
              ✕
            </button>
          </div>

          {error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
          ) : null}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="space-y-1">
              <div className="text-sm text-zinc-600">ชื่อสินค้า</div>
              <input
                className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none"
                value={draftProduct.name}
                onChange={(e) => onChangeField?.("name", e.target.value)}
              />
            </label>

            <label className="space-y-1">
              <div className="text-sm text-zinc-600">หมวดหมู่สินค้า</div>
              <select
                className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none"
                value={draftProduct.category}
                onChange={(e) => onChangeField?.("category", e.target.value)}
              >
                <option value="">เลือกหมวดหมู่</option>
                {ProductCategory.list().map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1">
              <div className="text-sm text-zinc-600">ราคาสินค้า</div>
              <input
                type="number"
                min="0"
                step="0.01"
                className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none"
                value={draftProduct.price}
                onChange={(e) => onChangeField?.("price", e.target.value)}
              />
            </label>

            <label className="space-y-1 md:col-span-2">
              <div className="text-sm text-zinc-600">รูปภาพสินค้า (เลือกได้หลายรูป)</div>
              <input
                type="file"
                multiple
                accept="image/*"
                className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none file:mr-3 file:rounded-lg file:border-0 file:bg-zinc-100 file:px-3 file:py-1.5"
                onChange={(e) => onChangeImageFiles?.(Array.from(e.target.files ?? []))}
              />
              {imageFiles?.length ? (
                <div className="text-xs text-zinc-500">เลือกแล้ว {imageFiles.length} รูป</div>
              ) : null}

              {imagePreviewUrls?.length ? (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {imagePreviewUrls.map((previewUrl, index) => (
                    <div
                      key={`preview-${index}`}
                      className="aspect-square rounded-lg overflow-hidden border border-zinc-200 bg-zinc-100"
                    >
                      <img src={previewUrl} alt={`preview-${index + 1}`} className="h-full w-full object-cover" />
                    </div>
                  ))}
                </div>
              ) : null}
            </label>

            <label className="space-y-1 md:col-span-2">
              <div className="text-sm text-zinc-600">คำอธิบายสินค้า</div>
              <textarea
                className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none min-h-28"
                value={draftProduct.description}
                onChange={(e) => onChangeField?.("description", e.target.value)}
              />
            </label>
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="rounded-xl border border-zinc-200 px-4 py-2 font-medium"
              onClick={onClose}
              disabled={saving}
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              className="rounded-xl bg-zinc-900 text-white px-4 py-2 font-semibold disabled:opacity-60"
              disabled={saving}
            >
              {saving ? "กำลังลงขาย..." : "ลงขาย"}
            </button>
          </div>
        </form>
      </div>
    );
  }
}
