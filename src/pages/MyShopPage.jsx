import React from "react";
import { MyShopService } from "../services/MyShopService";
import { UserService } from "../services/UserService";
import { ShopProduct } from "../models/ShopProduct";
import { ShopProfile } from "../models/ShopProfile";
import { ProductCategory } from "../models/ProductCategory";
import { ProfilePopup } from "../components/HeaderActionPopups";
import {
  ShopParcelPaymentVerificationModal,
  ShopParcelPaymentVerificationPanel,
} from "../components/ShopParcelPaymentVerification";

export class MyShopPage extends React.Component {
  state = {
    loading: true,
    saving: false,
    deleting: false,
    error: "",
    done: "",
    products: [],
    showCreatePopup: false,
    showEditPopup: false,
    showDeleteConfirmPopup: false,
    showProfilePopup: false,
    showEditModal: false,
    draftProduct: ShopProduct.empty(),
    editDraftProduct: ShopProduct.empty(),
    deletingProduct: null,
    imageFiles: [],
    imagePreviewUrls: [],
    editImageFiles: [],
    editImagePreviewUrls: [],
    shopLoading: true,
    shopDraft: ShopProfile.empty(),
    shopQrFile: null,
    shopQrPreviewUrl: "",
    shopSaving: false,
    shopError: "",
    shopDone: "",
    paymentReviewsLoading: true,
    paymentReviewsError: "",
    paymentReviewsDone: "",
    paymentReviews: [],
    showPaymentReviewModal: false,
    selectedPaymentReview: null,
    paymentReviewSubmitting: false,
    profileDraft: null,
    profileAvatarFile: null,
    profileAvatarPreviewUrl: "",
    profileSaving: false,
    profileDeleting: false,
    profileError: "",
  };

  myShopService = MyShopService.instance();
  userService = UserService.instance();

  async componentDidMount() {
    await Promise.all([this.loadProducts(), this.loadShopProfile(), this.loadPaymentReviews()]);
  }

  componentWillUnmount() {
    this.revokePreviewUrls(this.state.imagePreviewUrls);
    this.revokePreviewUrls(this.state.editImagePreviewUrls);
    this.revokePreviewUrls([this.state.shopQrPreviewUrl].filter(Boolean));
    this.revokePreviewUrls([this.state.profileAvatarPreviewUrl].filter(Boolean));
  }

  revokePreviewUrls = (previewUrls = []) => {
    if (typeof URL === "undefined") return;
    (Array.isArray(previewUrls) ? previewUrls : []).forEach((url) => {
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

  loadShopProfile = async () => {
    this.setState({ shopLoading: true, shopError: "" });
    try {
      const { shop } = await this.myShopService.me();
      this.setState({
        shopDraft: shop ?? ShopProfile.empty(),
      });
    } catch (e) {
      this.setState({
        shopError: e?.message ?? "โหลดข้อมูลร้านค้าไม่สำเร็จ",
      });
    } finally {
      this.setState({ shopLoading: false });
    }
  };

  loadPaymentReviews = async () => {
    this.setState({ paymentReviewsLoading: true, paymentReviewsError: "" });
    try {
      const { reviews } = await this.myShopService.listParcelPaymentReviews();
      this.setState({
        paymentReviews: reviews ?? [],
      });
    } catch (e) {
      this.setState({
        paymentReviewsError: e?.message ?? "โหลดรายการตรวจสอบการชำระไม่สำเร็จ",
      });
    } finally {
      this.setState({ paymentReviewsLoading: false });
    }
  };

  openPaymentReviewModal = (review) => {
    this.setState({
      showPaymentReviewModal: true,
      selectedPaymentReview: review ?? null,
      paymentReviewsError: "",
      paymentReviewsDone: "",
    });
  };

  closePaymentReviewModal = () => {
    this.setState({
      showPaymentReviewModal: false,
      selectedPaymentReview: null,
      paymentReviewsError: "",
      paymentReviewSubmitting: false,
    });
  };

  syncPaymentReviewToState = (updatedReview) => {
    if (!updatedReview?.orderId || !updatedReview?.shopOrderKey) return false;

    const currentReviews = Array.isArray(this.state.paymentReviews) ? this.state.paymentReviews : [];
    const hasTargetReview = currentReviews.some(
      (review) =>
        review?.orderId === updatedReview.orderId &&
        review?.shopOrderKey === updatedReview.shopOrderKey,
    );
    if (!hasTargetReview) return false;

    this.setState({
      paymentReviews: currentReviews.map((review) =>
        review?.orderId === updatedReview.orderId &&
        review?.shopOrderKey === updatedReview.shopOrderKey
          ? updatedReview
          : review,
      ),
      selectedPaymentReview: updatedReview,
    });
    return true;
  };

  submitPaymentReviewDecision = async ({ action, note } = {}) => {
    const review = this.state.selectedPaymentReview;
    const orderId = `${review?.orderId ?? ""}`.trim();
    const shopOrderKey = `${review?.shopOrderKey ?? ""}`.trim();
    const normalizedAction = `${action ?? ""}`.trim();
    const productIds = (review?.items ?? []).map((item) => item?.productId).filter(Boolean);

    if (!orderId || !shopOrderKey || !normalizedAction) return;

    if (typeof window !== "undefined") {
      const confirmed = window.confirm(
        normalizedAction === "approve"
          ? "ยืนยันการสั่งซื้อและเปลี่ยนสถานะเป็นรอรับพัสดุใช่ไหม?"
          : "ยืนยันว่าต้องการรายงานรายการนี้ไปยัง Admin ใช่ไหม?",
      );
      if (!confirmed) return;
    }

    this.setState({
      paymentReviewSubmitting: true,
      paymentReviewsError: "",
      paymentReviewsDone: "",
    });
    try {
      const result = await this.myShopService.updateParcelPaymentReviewDecision({
        orderId,
        shopOrderKey,
        action: normalizedAction,
        note,
        productIds,
        changedBy: this.props.user?.id,
      });
      let nextReviews = Array.isArray(this.state.paymentReviews) ? this.state.paymentReviews : [];
      let refreshedReview = result?.review ?? null;

      try {
        const { reviews } = await this.myShopService.listParcelPaymentReviews();
        nextReviews = reviews ?? [];
        refreshedReview =
          nextReviews.find(
            (item) => item?.orderId === orderId && item?.shopOrderKey === shopOrderKey,
          ) ??
          refreshedReview;
      } catch {
        if (refreshedReview) {
          const exists = nextReviews.some(
            (item) => item?.orderId === orderId && item?.shopOrderKey === shopOrderKey,
          );
          nextReviews = exists
            ? nextReviews.map((item) =>
                item?.orderId === orderId && item?.shopOrderKey === shopOrderKey
                  ? refreshedReview
                  : item,
              )
            : [refreshedReview, ...nextReviews];
        }
      }

      this.setState({
        paymentReviews: nextReviews,
        selectedPaymentReview: refreshedReview,
        paymentReviewsDone:
          result?.message ??
          (normalizedAction === "approve"
            ? "ยืนยันคำสั่งซื้อแล้ว สถานะเปลี่ยนเป็นรอรับพัสดุ"
            : "รายงานรายการนี้ไปยัง Admin แล้ว"),
      });
    } catch (e) {
      this.setState({
        paymentReviewsError: e?.message ?? "อัปเดตรายการตรวจสอบการชำระไม่สำเร็จ",
      });
    } finally {
      this.setState({ paymentReviewSubmitting: false });
    }
  };

  openCreatePopup = () => {
    this.revokePreviewUrls(this.state.imagePreviewUrls);
    this.setState({
      showCreatePopup: true,
      showEditPopup: false,
      draftProduct: ShopProduct.empty(),
      imageFiles: [],
      imagePreviewUrls: [],
      error: "",
      done: "",
    });
  };

  closeCreatePopup = () => {
    this.revokePreviewUrls(this.state.imagePreviewUrls);
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

  openEditModal = () => {
    this.revokePreviewUrls([this.state.profileAvatarPreviewUrl].filter(Boolean));
    this.setState({
      showProfilePopup: false,
      showEditModal: true,
      profileDraft: { ...(this.props.user ?? {}) },
      profileAvatarFile: null,
      profileAvatarPreviewUrl: "",
      profileError: "",
    });
  };

  closeEditModal = () => {
    this.revokePreviewUrls([this.state.profileAvatarPreviewUrl].filter(Boolean));
    this.setState({
      showEditModal: false,
      profileDraft: null,
      profileAvatarFile: null,
      profileAvatarPreviewUrl: "",
      profileError: "",
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

  setProfileDraftField = (key, value) => {
    this.setState((s) => ({
      profileDraft: { ...s.profileDraft, [key]: value },
      profileError: "",
    }));
  };

  setProfileAvatarFile = (file) => {
    this.revokePreviewUrls([this.state.profileAvatarPreviewUrl].filter(Boolean));
    const nextFile = file ?? null;
    const profileAvatarPreviewUrl =
      nextFile && typeof URL !== "undefined" ? URL.createObjectURL(nextFile) : "";

    this.setState({ profileAvatarFile: nextFile, profileAvatarPreviewUrl, profileError: "" });
  };

  setShopDraftField = (key, value) => {
    this.setState((state) => ({
      shopDraft: state.shopDraft.withPatch({ [key]: value }),
      shopError: "",
      shopDone: "",
    }));
  };

  setShopQrFile = (file) => {
    this.revokePreviewUrls([this.state.shopQrPreviewUrl].filter(Boolean));
    const nextFile = file ?? null;
    const shopQrPreviewUrl =
      nextFile && typeof URL !== "undefined" ? URL.createObjectURL(nextFile) : "";

    this.setState({
      shopQrFile: nextFile,
      shopQrPreviewUrl,
      shopError: "",
      shopDone: "",
    });
  };

  saveShopProfile = async () => {
    const { shopDraft, shopQrFile } = this.state;
    this.setState({ shopSaving: true, shopError: "", shopDone: "" });
    try {
      const result = await this.myShopService.upsert(shopDraft.toPayload(), {
        parcelQrFile: shopQrFile,
      });
      const updatedShop = result?.shop ?? ShopProfile.empty();

      this.revokePreviewUrls([this.state.shopQrPreviewUrl].filter(Boolean));
      this.setState({
        shopDraft: updatedShop,
        shopQrFile: null,
        shopQrPreviewUrl: "",
        shopDone: "บันทึกข้อมูลร้านและ QR code เรียบร้อย",
      });
    } catch (e) {
      this.setState({ shopError: e?.message ?? "บันทึกข้อมูลร้านไม่สำเร็จ" });
    } finally {
      this.setState({ shopSaving: false });
    }
  };

  saveProfile = async () => {
    const { profileDraft, profileAvatarFile, profileAvatarPreviewUrl } = this.state;
    this.setState({ profileSaving: true, profileError: "" });
    try {
      const editablePayload = {
        name: profileDraft?.name ?? "",
        email: profileDraft?.email ?? "",
        phone: profileDraft?.phone ?? "",
        address: profileDraft?.address ?? "",
      };

      const result = profileAvatarFile
        ? await this.userService.updateMeFormData(editablePayload, profileAvatarFile)
        : await this.userService.updateMe(editablePayload);
      const updated = result?.user;
      if (!updated) throw new Error("อัปเดตไม่สำเร็จ");

      this.props.onUpdatedUser?.(updated);
      this.revokePreviewUrls([profileAvatarPreviewUrl].filter(Boolean));
      this.setState({
        showEditModal: false,
        profileDraft: { ...updated },
        profileAvatarFile: null,
        profileAvatarPreviewUrl: "",
        profileError: "",
      });
    } catch (e) {
      this.setState({ profileError: e?.message ?? "เกิดข้อผิดพลาด" });
    } finally {
      this.setState({ profileSaving: false });
    }
  };

  deleteAccount = async () => {
    if (typeof window !== "undefined") {
      const confirmed = window.confirm("ยืนยันลบบัญชีนี้? การดำเนินการนี้ไม่สามารถย้อนกลับได้");
      if (!confirmed) return;
    }

    const { profileAvatarPreviewUrl } = this.state;
    this.setState({ profileDeleting: true, profileError: "" });
    try {
      await this.userService.deleteMe();
      this.revokePreviewUrls([profileAvatarPreviewUrl].filter(Boolean));
      this.props.onDeletedAccount?.();
    } catch (e) {
      this.setState({
        profileDeleting: false,
        profileError: e?.message ?? "ลบบัญชีไม่สำเร็จ",
      });
    }
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
    this.revokePreviewUrls(this.state.imagePreviewUrls);

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

  openEditPopup = (productInput) => {
    const product =
      productInput instanceof ShopProduct
        ? productInput
        : ShopProduct.fromJSON(productInput ?? {});

    this.revokePreviewUrls(this.state.editImagePreviewUrls);
    this.setState({
      showEditPopup: true,
      showCreatePopup: false,
      editDraftProduct: product,
      editImageFiles: [],
      editImagePreviewUrls: [],
      error: "",
      done: "",
    });
  };

  closeEditPopup = () => {
    this.revokePreviewUrls(this.state.editImagePreviewUrls);
    this.setState({
      showEditPopup: false,
      editDraftProduct: ShopProduct.empty(),
      editImageFiles: [],
      editImagePreviewUrls: [],
      error: "",
    });
  };

  setEditDraftField = (key, value) => {
    this.setState((s) => ({
      editDraftProduct: s.editDraftProduct.withPatch({ [key]: value }),
      error: "",
      done: "",
    }));
  };

  setEditImageFiles = (files) => {
    const safeFiles = Array.isArray(files) ? files.filter(Boolean) : [];
    this.revokePreviewUrls(this.state.editImagePreviewUrls);

    const editImagePreviewUrls =
      typeof URL === "undefined"
        ? []
        : safeFiles.map((file) => URL.createObjectURL(file));

    this.setState({
      editImageFiles: safeFiles,
      editImagePreviewUrls,
      error: "",
      done: "",
    });
  };

  submitEditProduct = async () => {
    const { editDraftProduct, editImageFiles } = this.state;
    const validationError = editDraftProduct.validate({ imageFiles: editImageFiles });
    if (validationError) {
      this.setState({ error: validationError });
      return;
    }

    this.setState({ saving: true, error: "", done: "" });
    try {
      const { product } = await this.myShopService.updateProduct(
        editDraftProduct.id,
        editDraftProduct.toPayload(),
        editImageFiles,
      );

      this.revokePreviewUrls(this.state.editImagePreviewUrls);
      if (product) {
        this.setState((s) => ({
          products: s.products.map((item) => (item.id === product.id ? product : item)),
          showEditPopup: false,
          editDraftProduct: ShopProduct.empty(),
          editImageFiles: [],
          editImagePreviewUrls: [],
          done: "แก้ไขสินค้าเรียบร้อย",
        }));
      } else {
        const { products } = await this.myShopService.listProducts();
        this.setState({
          products: products ?? [],
          showEditPopup: false,
          editDraftProduct: ShopProduct.empty(),
          editImageFiles: [],
          editImagePreviewUrls: [],
          done: "แก้ไขสินค้าเรียบร้อย",
        });
      }
    } catch (e) {
      this.setState({ error: e?.message ?? "แก้ไขสินค้าไม่สำเร็จ" });
    } finally {
      this.setState({ saving: false });
    }
  };

  openDeleteConfirmPopup = (productInput) => {
    const product =
      productInput instanceof ShopProduct
        ? productInput
        : ShopProduct.fromJSON(productInput ?? {});

    this.setState({
      deletingProduct: product,
      showDeleteConfirmPopup: true,
      error: "",
      done: "",
    });
  };

  closeDeleteConfirmPopup = () => {
    this.setState({
      deletingProduct: null,
      showDeleteConfirmPopup: false,
    });
  };

  confirmDeleteProduct = async () => {
    const deletingProductId = `${this.state.deletingProduct?.id ?? ""}`.trim();
    if (!deletingProductId) {
      this.closeDeleteConfirmPopup();
      return;
    }

    this.setState({ deleting: true, error: "", done: "" });
    try {
      await this.myShopService.deleteProduct(deletingProductId);
      this.setState((s) => ({
        products: s.products.filter((item) => item.id !== deletingProductId),
        deletingProduct: null,
        showDeleteConfirmPopup: false,
        done: "ลบสินค้าเรียบร้อย",
      }));
    } catch (e) {
      this.setState({ error: e?.message ?? "ลบสินค้าไม่สำเร็จ" });
    } finally {
      this.setState({ deleting: false });
    }
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
        this.revokePreviewUrls(this.state.imagePreviewUrls);
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
        this.revokePreviewUrls(this.state.imagePreviewUrls);
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
          <ProductCard
            key={product.id || `${product.name}-${index}`}
            product={product}
            onEditProduct={this.openEditPopup}
            onDeleteProduct={this.openDeleteConfirmPopup}
          />
        ))}
      </div>
    );
  }

  render() {
    const { user, onBack } = this.props;
    const {
      loading,
      saving,
      deleting,
      error,
      done,
      products,
      showCreatePopup,
      showEditPopup,
      showDeleteConfirmPopup,
      showProfilePopup,
      showEditModal,
      draftProduct,
      editDraftProduct,
      deletingProduct,
      imageFiles,
      imagePreviewUrls,
      editImageFiles,
      editImagePreviewUrls,
      shopLoading,
      shopDraft,
      shopQrFile,
      shopQrPreviewUrl,
      shopSaving,
      shopError,
      shopDone,
      paymentReviewsLoading,
      paymentReviewsError,
      paymentReviewsDone,
      paymentReviews,
      showPaymentReviewModal,
      selectedPaymentReview,
      paymentReviewSubmitting,
      profileDraft,
      profileAvatarFile,
      profileAvatarPreviewUrl,
      profileSaving,
      profileDeleting,
      profileError,
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

            <ShopSettingsCard
              shop={shopDraft}
              loading={shopLoading}
              saving={shopSaving}
              error={shopError}
              done={shopDone}
              qrFile={shopQrFile}
              qrPreviewUrl={shopQrPreviewUrl}
              onChangeField={this.setShopDraftField}
              onChangeQrFile={this.setShopQrFile}
              onSave={this.saveShopProfile}
            />

            <ShopParcelPaymentVerificationPanel
              reviews={paymentReviews}
              loading={paymentReviewsLoading}
              error={paymentReviewsError}
              done={paymentReviewsDone}
              onRefresh={this.loadPaymentReviews}
              onOpenReview={this.openPaymentReviewModal}
            />

            {loading ? <div className="text-sm text-zinc-500">กำลังโหลด...</div> : null}
            {error && !showCreatePopup && !showEditPopup ? (
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

        {showEditPopup ? (
          <EditProductModal
            draftProduct={editDraftProduct}
            imageFiles={editImageFiles}
            imagePreviewUrls={editImagePreviewUrls}
            saving={saving}
            error={error}
            onClose={this.closeEditPopup}
            onChangeField={this.setEditDraftField}
            onChangeImageFiles={this.setEditImageFiles}
            onSubmit={this.submitEditProduct}
          />
        ) : null}

        {showDeleteConfirmPopup ? (
          <DeleteProductConfirmModal
            product={deletingProduct}
            deleting={deleting}
            onCancel={this.closeDeleteConfirmPopup}
            onConfirmDelete={this.confirmDeleteProduct}
          />
        ) : null}

        {showPaymentReviewModal && selectedPaymentReview ? (
          <ShopParcelPaymentVerificationModal
            review={selectedPaymentReview}
            submitting={paymentReviewSubmitting}
            error={paymentReviewsError}
            onClose={this.closePaymentReviewModal}
            onSubmitDecision={this.submitPaymentReviewDecision}
          />
        ) : null}

        {showProfilePopup ? (
          <ProfilePopup
            user={user}
            onClose={this.closeProfilePopup}
            onEdit={this.openEditModal}
            showGoMyShopButton={false}
            onGoMyOrders={this.goMyOrders}
            onLogout={this.props.onLogout}
          />
        ) : null}

        {showEditModal && profileDraft ? (
          <EditProfileModal
            user={profileDraft}
            saving={profileSaving}
            error={profileError}
            avatarFile={profileAvatarFile}
            avatarPreviewUrl={profileAvatarPreviewUrl}
            onClose={this.closeEditModal}
            onChangeField={this.setProfileDraftField}
            onChangeAvatarFile={this.setProfileAvatarFile}
            onSave={this.saveProfile}
            onDelete={this.deleteAccount}
            deleting={profileDeleting}
          />
        ) : null}
      </div>
    );
  }
}

class ShopSettingsCard extends React.Component {
  render() {
    const {
      shop,
      loading,
      saving,
      error,
      done,
      qrFile,
      qrPreviewUrl,
      onChangeField,
      onChangeQrFile,
      onSave,
    } = this.props;

    const qrImageUrl = qrPreviewUrl || shop?.parcelQrCodeUrl || "";

    return (
      <section className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-base font-semibold text-zinc-900">ข้อมูลร้านและการรับชำระ</div>
            <div className="text-sm text-zinc-500">
              ใช้เป็นโครงสำหรับการส่งพัสดุ โดย popup ตะกร้าจะดึง QR code ของร้านจากส่วนนี้
            </div>
          </div>
          <button
            type="button"
            className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            onClick={onSave}
            disabled={saving || loading}
          >
            {saving ? "กำลังบันทึก..." : "บันทึกข้อมูลร้าน"}
          </button>
        </div>

        {loading ? <div className="text-sm text-zinc-500">กำลังโหลดข้อมูลร้าน...</div> : null}
        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
        ) : null}
        {done ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{done}</div>
        ) : null}

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="space-y-1">
              <div className="text-sm text-zinc-600">ชื่อร้าน</div>
              <input
                className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none"
                value={shop?.shopName ?? ""}
                onChange={(e) => onChangeField?.("shopName", e.target.value)}
              />
            </label>

            <label className="space-y-1">
              <div className="text-sm text-zinc-600">ช่องทางติดต่อ</div>
              <input
                className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none"
                value={shop?.contact ?? ""}
                onChange={(e) => onChangeField?.("contact", e.target.value)}
              />
            </label>

            <label className="space-y-1 md:col-span-2">
              <div className="text-sm text-zinc-600">คำอธิบายร้าน</div>
              <textarea
                className="min-h-24 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none"
                value={shop?.description ?? ""}
                onChange={(e) => onChangeField?.("description", e.target.value)}
              />
            </label>

            <label className="space-y-1 md:col-span-2">
              <div className="text-sm text-zinc-600">อัปโหลด QR code สำหรับรับชำระแบบส่งพัสดุ</div>
              <input
                type="file"
                accept="image/*"
                className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none file:mr-3 file:rounded-lg file:border-0 file:bg-zinc-100 file:px-3 file:py-1.5"
                onChange={(e) => onChangeQrFile?.(e.target.files?.[0] ?? null)}
              />
              <div className="text-xs text-zinc-500">
                {qrFile ? `ไฟล์ใหม่: ${qrFile.name}` : "ถ้ายังไม่อัปโหลด ผู้ซื้อจะไม่สามารถเลือกส่งพัสดุได้"}
              </div>
            </label>
          </div>

          <div className="space-y-2">
            <div className="text-sm font-medium text-zinc-700">ตัวอย่าง QR code ร้าน</div>
            <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
              {qrImageUrl ? (
                <img src={qrImageUrl} alt="shop-qr-code" className="aspect-square w-full object-contain" />
              ) : (
                <div className="grid aspect-square place-items-center px-4 text-center text-sm text-zinc-400">
                  ยังไม่มี QR code สำหรับการส่งพัสดุ
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
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
    const { product, onEditProduct, onDeleteProduct } = this.props;
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
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-1">
              <div className="font-semibold break-words">{product.name || "ไม่ระบุชื่อสินค้า"}</div>
              <div
                className={`inline-flex w-fit rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                  product?.isSold?.() ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"
                }`}
              >
                {product?.getSaleStatusLabel?.() ?? "พร้อมขาย"}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                className="h-8 w-8 shrink-0 rounded-lg border border-zinc-200 bg-white grid place-items-center hover:bg-zinc-50"
                onClick={() => onEditProduct?.(product)}
                title="แก้ไขสินค้า"
              >
                <img src="/edit.svg" alt="edit" className="h-4 w-4 object-contain" />
              </button>
              <button
                type="button"
                className="h-8 w-8 shrink-0 rounded-lg border border-red-200 bg-white grid place-items-center hover:bg-red-50"
                onClick={() => onDeleteProduct?.(product)}
                title="ลบสินค้า"
              >
                <img src="/delete.svg" alt="delete" className="h-4 w-4 object-contain" />
              </button>
            </div>
          </div>
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

            <label className="space-y-1">
              <div className="text-sm text-zinc-600">ของที่ต้องการแลกเปลี่ยน (ไม่บังคับ)</div>
              <input
                className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none"
                placeholder="เช่น หนังสือการ์ตูน, ต้นไม้, อุปกรณ์ไอที"
                value={draftProduct.exchangeItem}
                onChange={(e) => onChangeField?.("exchangeItem", e.target.value)}
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

class EditProductModal extends React.Component {
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

    const existingImageUrls = draftProduct?.getImageUrls?.() ?? [];

    return (
      <div className="fixed inset-0 z-50 bg-black/40 grid place-items-center p-4" onClick={onClose}>
        <form
          className="w-full max-w-2xl rounded-3xl bg-white shadow p-4 md:p-6 space-y-4"
          onClick={this.stop}
          onSubmit={this.onSubmit}
        >
          <div className="flex items-center justify-between">
            <div className="text-xl md:text-2xl font-semibold">แก้ไขสินค้า</div>
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

            <label className="space-y-1">
              <div className="text-sm text-zinc-600">ของที่ต้องการแลกเปลี่ยน (ไม่บังคับ)</div>
              <input
                className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none"
                placeholder="เช่น หนังสือการ์ตูน, ต้นไม้, อุปกรณ์ไอที"
                value={draftProduct.exchangeItem}
                onChange={(e) => onChangeField?.("exchangeItem", e.target.value)}
              />
            </label>

            <label className="space-y-1 md:col-span-2">
              <div className="text-sm text-zinc-600">เปลี่ยนรูปภาพสินค้า (ไม่เลือก = ใช้รูปเดิม)</div>
              <input
                type="file"
                multiple
                accept="image/*"
                className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none file:mr-3 file:rounded-lg file:border-0 file:bg-zinc-100 file:px-3 file:py-1.5"
                onChange={(e) => onChangeImageFiles?.(Array.from(e.target.files ?? []))}
              />
              {imageFiles?.length ? (
                <div className="text-xs text-zinc-500">เลือกแล้ว {imageFiles.length} รูป (จะแทนที่รูปเดิม)</div>
              ) : null}

              {!imageFiles?.length && existingImageUrls.length ? (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {existingImageUrls.map((url, index) => (
                    <div
                      key={`existing-${index}`}
                      className="aspect-square rounded-lg overflow-hidden border border-zinc-200 bg-zinc-100"
                    >
                      <img src={url} alt={`existing-${index + 1}`} className="h-full w-full object-cover" />
                    </div>
                  ))}
                </div>
              ) : null}

              {imagePreviewUrls?.length ? (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {imagePreviewUrls.map((previewUrl, index) => (
                    <div
                      key={`preview-edit-${index}`}
                      className="aspect-square rounded-lg overflow-hidden border border-zinc-200 bg-zinc-100"
                    >
                      <img src={previewUrl} alt={`preview-edit-${index + 1}`} className="h-full w-full object-cover" />
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
              {saving ? "กำลังบันทึก..." : "บันทึกการแก้ไข"}
            </button>
          </div>
        </form>
      </div>
    );
  }
}

class DeleteProductConfirmModal extends React.Component {
  stop = (e) => e.stopPropagation();

  render() {
    const { product, deleting, onCancel, onConfirmDelete } = this.props;

    return (
      <div className="fixed inset-0 z-50 bg-black/40 grid place-items-center p-4" onClick={onCancel}>
        <div
          className="w-full max-w-md rounded-3xl bg-white shadow p-5 space-y-4"
          onClick={this.stop}
        >
          <div className="text-lg font-semibold text-zinc-900">ยืนยันการลบสินค้า</div>
          <div className="text-sm text-zinc-600">
            จะลบสินค้านี้จริงๆ ใช่ไหม
          </div>
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-700 break-words">
            {product?.name || "ไม่ระบุชื่อสินค้า"}
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="rounded-xl border border-zinc-200 px-4 py-2 text-sm font-medium"
              onClick={onCancel}
              disabled={deleting}
            >
              ยกเลิก
            </button>
            <button
              type="button"
              className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              onClick={onConfirmDelete}
              disabled={deleting}
            >
              {deleting ? "กำลังลบ..." : "ลบ"}
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

          {error ? <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}

          <div className="space-y-3">
            <div className="text-2xl font-semibold text-zinc-800">ข้อมูลบัญชี</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field label="ชื่อที่แสดง" value={user?.name} onChange={(v) => onChangeField("name", v)} />
              <Field label="อีเมล" value={user?.email} onChange={(v) => onChangeField("email", v)} />
              <Field label="เบอร์โทร" value={user?.phone} onChange={(v) => onChangeField("phone", v)} />
              <Field label="ที่อยู่" value={user?.address} onChange={(v) => onChangeField("address", v)} full />
            </div>
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
