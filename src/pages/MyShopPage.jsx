import React from "react";
import { MyShopService } from "../services/MyShopService";
import { UserService } from "../services/UserService";
import { ShopProduct } from "../models/ShopProduct";
import { ShopProfile } from "../models/ShopProfile";
import { ProductCategory } from "../models/ProductCategory";
import { CategoryService } from "../services/CategoryService";
import { ProfilePopup } from "../components/HeaderActionPopups";
import { SavedAddressesEditor } from "../components/SavedAddressesEditor";
import { NotificationBellButton } from "../components/NotificationBellButton";
import {
  ShopParcelPaymentVerificationModal,
  ShopParcelPaymentVerificationPanel,
} from "../components/ShopParcelPaymentVerification";

const BANK_OPTIONS = [
  "",
  "กสิกรไทย (KBANK)",
  "ไทยพาณิชย์ (SCB)",
  "กรุงเทพ (BBL)",
  "กรุงไทย (KTB)",
  "กรุงศรี (BAY)",
  "ทหารไทยธนชาต (TTB)",
  "ออมสิน (GSB)",
  "ธ.ก.ส. (BAAC)",
  "ซีไอเอ็มบีไทย (CIMB)",
  "พร้อมเพย์ (PromptPay)",
];

const PROVINCE_OPTIONS = [
  "",
  "กรุงเทพมหานคร",
  "กระบี่",
  "กาญจนบุรี",
  "กาฬสินธุ์",
  "กำแพงเพชร",
  "ขอนแก่น",
  "จันทบุรี",
  "ฉะเชิงเทรา",
  "ชลบุรี",
  "ชัยนาท",
  "ชัยภูมิ",
  "ชุมพร",
  "เชียงราย",
  "เชียงใหม่",
  "ตรัง",
  "ตราด",
  "ตาก",
  "นครนายก",
  "นครปฐม",
  "นครพนม",
  "นครราชสีมา",
  "นครศรีธรรมราช",
  "นครสวรรค์",
  "นนทบุรี",
  "นราธิวาส",
  "น่าน",
  "บึงกาฬ",
  "บุรีรัมย์",
  "ปทุมธานี",
  "ประจวบคีรีขันธ์",
  "ปราจีนบุรี",
  "ปัตตานี",
  "พระนครศรีอยุธยา",
  "พังงา",
  "พัทลุง",
  "พิจิตร",
  "พิษณุโลก",
  "เพชรบุรี",
  "เพชรบูรณ์",
  "แพร่",
  "พะเยา",
  "ภูเก็ต",
  "มหาสารคาม",
  "มุกดาหาร",
  "แม่ฮ่องสอน",
  "ยะลา",
  "ยโสธร",
  "ร้อยเอ็ด",
  "ระนอง",
  "ระยอง",
  "ราชบุรี",
  "ลพบุรี",
  "ลำปาง",
  "ลำพูน",
  "เลย",
  "ศรีสะเกษ",
  "สกลนคร",
  "สงขลา",
  "สตูล",
  "สมุทรปราการ",
  "สมุทรสงคราม",
  "สมุทรสาคร",
  "สระแก้ว",
  "สระบุรี",
  "สิงห์บุรี",
  "สุโขทัย",
  "สุพรรณบุรี",
  "สุราษฎร์ธานี",
  "สุรินทร์",
  "หนองคาย",
  "หนองบัวลำภู",
  "อ่างทอง",
  "อุดรธานี",
  "อุทัยธานี",
  "อุตรดิตถ์",
  "อุบลราชธานี",
  "อำนาจเจริญ",
];

const ADMIN_CONTACT_EMAIL = "s6704062616045@email.kmutnb.ac.th";

export class MyShopPage extends React.Component {
  state = {
    loading: true,
    saving: false,
    deleting: false,
    error: "",
    done: "",
    products: [],
    categories: ProductCategory.list(),
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
    shopProfile: ShopProfile.empty(),
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
  categoryService = CategoryService.instance();

  async componentDidMount() {
    await Promise.all([this.loadCategories(), this.loadProducts(), this.loadShopProfile(), this.loadPaymentReviews()]);
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

  loadCategories = async () => {
    try {
      const { categories } = await this.categoryService.listCategories();
      this.setState({
        categories: categories ?? ProductCategory.list(),
      });
    } catch {
      this.setState({ categories: ProductCategory.list() });
    }
  };

  loadShopProfile = async () => {
    this.setState({ shopLoading: true, shopError: "" });
    try {
      const { shop } = await this.myShopService.me();
      const nextShop = shop ?? ShopProfile.empty();
      this.setState({
        shopProfile: nextShop,
        shopDraft: nextShop.toEditableDraft(),
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

  canSellProducts = () => this.state.shopProfile?.isApprovedKyc?.() ?? false;

  getSellLockMessage = () => {
    const shopProfile = this.state.shopProfile;
    if (shopProfile?.isApprovedKyc?.()) return "";
    if (shopProfile?.isPendingKyc?.()) {
      return "ร้านของคุณกำลังรอ Admin อนุมัติ KYC จึงยังไม่สามารถลงขายสินค้าได้";
    }
    if (shopProfile?.isRejectedKyc?.()) {
      return "ร้านของคุณยังไม่ผ่าน KYC กรุณาแก้ไขข้อมูลร้านและส่งตรวจสอบใหม่ก่อนลงขายสินค้า";
    }
    return "กรุณากรอกข้อมูลร้านและผ่านการอนุมัติ KYC ก่อนลงขายสินค้า";
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
          : normalizedAction === "cancel"
            ? "ยืนยันว่าต้องการยกเลิกคำสั่งซื้อนี้ใช่ไหม?"
            : "ยืนยันการดำเนินการกับรายการนี้ใช่ไหม?",
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
            : normalizedAction === "cancel"
              ? "ยกเลิกคำสั่งซื้อแล้ว"
              : "อัปเดตรายการตรวจสอบการชำระแล้ว"),
      });
    } catch (e) {
      this.setState({
        paymentReviewsError: e?.message ?? "อัปเดตรายการตรวจสอบการชำระไม่สำเร็จ",
      });
    } finally {
      this.setState({ paymentReviewSubmitting: false });
    }
  };

  submitParcelShipmentUpdate = async ({ action, trackingNumber, carrier, note } = {}) => {
    const review = this.state.selectedPaymentReview;
    const orderId = `${review?.orderId ?? ""}`.trim();
    const shopOrderKey = `${review?.shopOrderKey ?? ""}`.trim();
    const normalizedAction = `${action ?? ""}`.trim();

    if (!orderId || !shopOrderKey || !normalizedAction) return;

    this.setState({
      paymentReviewSubmitting: true,
      paymentReviewsError: "",
      paymentReviewsDone: "",
    });
    try {
      const result = await this.myShopService.updateParcelShipment({
        orderId,
        shopOrderKey,
        action: normalizedAction,
        trackingNumber,
        carrier,
        note,
      });

      let nextReviews = Array.isArray(this.state.paymentReviews) ? this.state.paymentReviews : [];
      let refreshedReview = result?.review ?? null;

      try {
        const { reviews } = await this.myShopService.listParcelPaymentReviews();
        nextReviews = reviews ?? [];
        refreshedReview =
          nextReviews.find(
            (item) => item?.orderId === orderId && item?.shopOrderKey === shopOrderKey,
          ) ?? refreshedReview;
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
        paymentReviewsDone: result?.message ?? "อัปเดตข้อมูลพัสดุแล้ว",
      });
    } catch (e) {
      this.setState({
        paymentReviewsError: e?.message ?? "อัปเดตข้อมูลพัสดุไม่สำเร็จ",
      });
    } finally {
      this.setState({ paymentReviewSubmitting: false });
    }
  };

  openCreatePopup = () => {
    if (!this.canSellProducts()) {
      this.setState({
        showCreatePopup: false,
        error: this.getSellLockMessage(),
        done: "",
      });
      return;
    }

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
    const normalizedValue =
      key === "citizenId" ? ShopProfile.normalizeCitizenId(value) : value;

    this.setState((state) => ({
      shopDraft: state.shopDraft.withPatch({ [key]: normalizedValue }),
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
    const { shopProfile, shopDraft, shopQrFile } = this.state;
    const hasNewQrFile = Boolean(shopQrFile);
    const canDirectSave = shopProfile.canDirectSave({ hasNewQrFile });
    const validationError = shopDraft.validate({
      requireQrCode: !canDirectSave,
      hasQrFile: Boolean(shopQrFile) || Boolean(shopDraft?.parcelQrCodeUrl),
    });

    if (shopProfile.isCitizenIdLocked() && shopDraft.citizenId !== shopProfile.citizenId) {
      this.setState({ shopError: "เลขบัตรประชาชนจะไม่สามารถแก้ไขได้หลังได้รับอนุมัติ KYC" });
      return;
    }

    if (validationError) {
      this.setState({ shopError: validationError });
      return;
    }

    this.setState({ shopSaving: true, shopError: "", shopDone: "" });
    try {
      const result = await this.myShopService.upsert(shopDraft.toPayload(), {
        parcelQrFile: shopQrFile,
        kycContext: {
          directSave: canDirectSave,
          citizenIdLocked: shopProfile.isCitizenIdLocked(),
          hasApprovedKycHistory: shopProfile.hasApprovedKycHistory(),
          hasPendingSubmission: shopProfile.hasPendingSubmission(),
          qrCodeChanged: hasNewQrFile,
          submissionType: canDirectSave
            ? "profile_update"
            : hasNewQrFile && shopProfile.hasApprovedKycHistory()
              ? "qr_code_reverification"
              : shopProfile.isRejectedKyc()
                ? "resubmission_after_rejection"
                : shopProfile.hasApprovedKycHistory()
                  ? "shop_profile_update"
                  : "initial_kyc",
        },
      });
      const updatedShop = result?.shop ?? ShopProfile.empty();

      this.revokePreviewUrls([this.state.shopQrPreviewUrl].filter(Boolean));
      this.setState({
        shopProfile: updatedShop,
        shopDraft: updatedShop.toEditableDraft(),
        shopQrFile: null,
        shopQrPreviewUrl: "",
        shopDone: result?.message ?? "อัปเดตข้อมูลร้านเรียบร้อย",
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
        addresses: Array.isArray(profileDraft?.addresses) ? profileDraft.addresses : [],
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
    const safeFiles = (Array.isArray(files) ? files.filter(Boolean) : []).slice(0, 4);
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

  removeImageFileAt = (indexToRemove) => {
    this.setState((state) => {
      const nextImageFiles = (state.imageFiles ?? []).filter((_, index) => index !== indexToRemove);
      const nextImagePreviewUrls = (state.imagePreviewUrls ?? []).filter((_, index) => index !== indexToRemove);
      const removedPreviewUrl = (state.imagePreviewUrls ?? [])[indexToRemove];
      this.revokePreviewUrls(removedPreviewUrl ? [removedPreviewUrl] : []);

      return {
        imageFiles: nextImageFiles,
        imagePreviewUrls: nextImagePreviewUrls,
        error: "",
        done: "",
      };
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
    const safeFiles = (Array.isArray(files) ? files.filter(Boolean) : []).slice(0, 4);
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

  removeEditImageFileAt = (indexToRemove) => {
    this.setState((state) => {
      const nextImageFiles = (state.editImageFiles ?? []).filter((_, index) => index !== indexToRemove);
      const nextImagePreviewUrls = (state.editImagePreviewUrls ?? []).filter((_, index) => index !== indexToRemove);
      const removedPreviewUrl = (state.editImagePreviewUrls ?? [])[indexToRemove];
      this.revokePreviewUrls(removedPreviewUrl ? [removedPreviewUrl] : []);

      return {
        editImageFiles: nextImageFiles,
        editImagePreviewUrls: nextImagePreviewUrls,
        error: "",
        done: "",
      };
    });
  };

  submitEditProduct = async () => {
    if (!this.canSellProducts()) {
      this.setState({ error: this.getSellLockMessage() });
      return;
    }

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
    if (!this.canSellProducts()) {
      this.setState({ error: this.getSellLockMessage() });
      return;
    }

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
    const canSellProducts = this.canSellProducts();
    const sellLockMessage = this.getSellLockMessage();
    const activeProducts = products.filter((product) => !product?.isSold?.());
    const soldProducts = products.filter((product) => product?.isSold?.());

    if (!products.length) {
      return (
        <div className="min-h-80 grid place-items-center">
          <div className="w-full max-w-xl rounded-3xl border border-dashed border-zinc-300 bg-zinc-50 px-6 py-10 text-center space-y-4">
            <div className="text-base font-semibold text-zinc-800">ยังไม่มีสินค้าที่ลงขาย</div>
            <div className="text-sm text-zinc-500">เริ่มเพิ่มสินค้าแรกของร้านคุณได้จากปุ่มด้านล่าง</div>
          <button
            type="button"
            className={`inline-flex items-center justify-center rounded-2xl border px-6 py-3 text-base font-semibold shadow-sm transition ${
              canSellProducts
                ? "border-zinc-900 bg-zinc-900 text-white hover:bg-zinc-800"
                : "border-zinc-200 bg-zinc-50 text-zinc-300 cursor-not-allowed"
            }`}
            onClick={this.openCreatePopup}
            title={canSellProducts ? "เพิ่มสินค้า" : sellLockMessage}
            disabled={!canSellProducts}
          >
            + เพิ่มสินค้า
          </button>
          {!canSellProducts ? (
            <div className="max-w-md text-center text-sm text-zinc-500">{sellLockMessage}</div>
          ) : null}
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-5">
        {activeProducts.length ? (
          <section className="space-y-3">
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700">
              สินค้าที่กำลังลงขาย ({activeProducts.length})
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeProducts.map((product, index) => (
                <ProductCard
                  key={product.id || `${product.name}-${index}`}
                  product={product}
                  onEditProduct={this.openEditPopup}
                  onDeleteProduct={this.openDeleteConfirmPopup}
                />
              ))}
            </div>
          </section>
        ) : (
          <section className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 px-4 py-5 text-sm text-zinc-500">
            ตอนนี้ยังไม่มีสินค้าที่กำลังลงขาย
          </section>
        )}

        {soldProducts.length ? (
          <section className="space-y-3">
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-700">
              สินค้าที่ขายแล้ว ({soldProducts.length})
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {soldProducts.map((product, index) => (
                <ProductCard
                  key={product.id || `${product.name}-sold-${index}`}
                  product={product}
                  onEditProduct={this.openEditPopup}
                  onDeleteProduct={this.openDeleteConfirmPopup}
                />
              ))}
            </div>
          </section>
        ) : null}

        <div className="flex justify-center">
          <button
            type="button"
            className={`inline-flex items-center justify-center rounded-2xl border px-6 py-3 text-base font-semibold shadow-sm transition ${
              canSellProducts
                ? "border-zinc-900 bg-zinc-900 text-white hover:bg-zinc-800"
                : "border-zinc-200 bg-zinc-50 text-zinc-300 cursor-not-allowed"
            }`}
            onClick={this.openCreatePopup}
            title={canSellProducts ? "เพิ่มสินค้า" : sellLockMessage}
            disabled={!canSellProducts}
          >
            + เพิ่มสินค้า
          </button>
        </div>
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
      categories,
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
      shopProfile,
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
              <NotificationBellButton
                count={this.props.notificationUnreadCount}
                onClick={() => this.props.onGoNotifications?.()}
                className="h-10 w-10 rounded-xl bg-[#F4D03E] border border-zinc-200 grid place-items-center"
              />

              <button
                type="button"
                className="h-10 w-10 rounded-xl bg-[#F4D03E] border border-zinc-200 grid place-items-center"
                onClick={() => this.props.onGoChat?.()}
                title="แชท"
              >
                <img src="/chat.svg" alt="แชท" className="h-5 w-5 object-contain" />
              </button>

              <button
                type="button"
                className="h-10 w-10 rounded-xl bg-[#F4D03E] text-white grid place-items-center"
                onClick={this.openProfilePopup}
                title="บัญชี"
              >
                <img src="/account.svg" alt="บัญชี" className="h-5 w-5 object-contain" />
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
              shopMeta={shopProfile}
              shopDraft={shopDraft}
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
            categories={categories}
            draftProduct={draftProduct}
            imageFiles={imageFiles}
            imagePreviewUrls={imagePreviewUrls}
            saving={saving}
            error={error}
            onClose={this.closeCreatePopup}
            onChangeField={this.setDraftField}
            onChangeImageFiles={this.setImageFiles}
            onRemoveImageAt={this.removeImageFileAt}
            onSubmit={this.submitProduct}
          />
        ) : null}

        {showEditPopup ? (
          <EditProductModal
            categories={categories}
            draftProduct={editDraftProduct}
            imageFiles={editImageFiles}
            imagePreviewUrls={editImagePreviewUrls}
            saving={saving}
            error={error}
            onClose={this.closeEditPopup}
            onChangeField={this.setEditDraftField}
            onChangeImageFiles={this.setEditImageFiles}
            onRemoveImageAt={this.removeEditImageFileAt}
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
            onSubmitShipment={this.submitParcelShipmentUpdate}
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

const getShopKycBadgeClassName = (status) => {
  switch (`${status ?? ""}`.trim()) {
    case "approved":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "rejected":
      return "border-red-200 bg-red-50 text-red-700";
    case "pending":
      return "border-amber-200 bg-amber-50 text-amber-700";
    default:
      return "border-zinc-200 bg-zinc-100 text-zinc-700";
  }
};

class ShopSettingsCard extends React.Component {
  render() {
    const {
      shopMeta,
      shopDraft,
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

    const qrImageUrl =
      qrPreviewUrl ||
      shopMeta?.getVisibleParcelQrCodeUrl?.() ||
      shopDraft?.parcelQrCodeUrl ||
      "";
    const citizenIdLocked = shopMeta?.isCitizenIdLocked?.() ?? false;
    const canDirectSave = shopMeta?.canDirectSave?.({ hasNewQrFile: Boolean(qrFile) }) ?? false;
    const bankOptions = BANK_OPTIONS.includes(shopDraft?.bankName ?? "")
      ? BANK_OPTIONS
      : [...BANK_OPTIONS, shopDraft?.bankName ?? ""].filter(Boolean);
    const provinceOptions = PROVINCE_OPTIONS.includes(shopDraft?.province ?? "")
      ? PROVINCE_OPTIONS
      : [...PROVINCE_OPTIONS, shopDraft?.province ?? ""].filter(Boolean);
    const actionLabel = canDirectSave
      ? "บันทึกข้อมูลร้าน"
      : shopMeta?.hasPendingSubmission?.()
        ? "ส่งตรวจสอบอีกครั้ง"
        : "ส่งตรวจสอบ";

    let statusNote = "เมื่อส่งตรวจสอบแล้ว Admin จะตรวจเลขบัตรประชาชนและ QR code ร้านก่อนบันทึกข้อมูลจริง";
    if (shopMeta?.isPendingKyc?.()) {
      statusNote = "ข้อมูลร้านชุดนี้ยังไม่ถูกบันทึกจริงจนกว่า Admin จะอนุมัติ KYC";
    } else if (shopMeta?.isRejectedKyc?.() && shopMeta?.hasApprovedKycHistory?.()) {
      statusNote = "คำขอ KYC ล่าสุดถูกปฏิเสธ ระบบยังใช้ข้อมูลร้านชุดที่เคยอนุมัติล่าสุดอยู่";
    } else if (shopMeta?.isRejectedKyc?.()) {
      statusNote = "ข้อมูลร้านยังไม่ถูกบันทึก สามารถแก้ไขแล้วส่งตรวจสอบใหม่ได้";
    } else if (shopMeta?.hasApprovedKycHistory?.()) {
      statusNote = "หลังอนุมัติแล้วจะแก้ไขข้อมูลร้านได้ ยกเว้นเลขบัตรประชาชน และถ้าเปลี่ยน QR code ต้องส่งตรวจสอบใหม่";
    }

    return (
      <section className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-base font-semibold text-zinc-900">ข้อมูลร้านและการรับชำระ</div>
            <div className="text-sm text-zinc-500">
              Admin จะตรวจเลขบัตรประชาชนและ QR code ร้านก่อนเปิดใช้งานจริง
            </div>
          </div>
          <button
            type="button"
            className="rounded-xl bg-[#F4D03E] px-4 py-2 text-sm font-semibold text-black disabled:opacity-60"
            onClick={onSave}
            disabled={saving || loading}
          >
            {saving ? "กำลังดำเนินการ..." : actionLabel}
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
          <div className={`rounded-full border px-2.5 py-1 ${getShopKycBadgeClassName(shopMeta?.kycStatus)}`}>
            สถานะ KYC: {shopMeta?.getKycStatusLabel?.() ?? "ยังไม่ส่งตรวจ"}
          </div>
          {shopMeta?.kycSubmittedAt ? (
            <div className="rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-zinc-600">
              ส่งล่าสุด: {new Date(shopMeta.kycSubmittedAt).toLocaleString("th-TH")}
            </div>
          ) : null}
          {shopMeta?.kycReviewedAt ? (
            <div className="rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-zinc-600">
              ตรวจล่าสุด: {new Date(shopMeta.kycReviewedAt).toLocaleString("th-TH")}
            </div>
          ) : null}
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white px-3 py-3 text-sm text-zinc-600">
          {statusNote}
          {shopMeta?.moderationNote ? ` หมายเหตุจาก Admin: ${shopMeta.moderationNote}` : ""}
        </div>

        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-zinc-700">
          <span className="font-semibold text-zinc-900">ติดต่อ Admin:</span>{" "}
          หากมีปัญหาเรื่องการตรวจสอบ KYC หรือข้อมูลร้านค้า สามารถติดต่อได้ที่{" "}
          <a
            href={`mailto:${ADMIN_CONTACT_EMAIL}`}
            className="font-semibold text-amber-700 underline decoration-amber-400 underline-offset-2"
          >
            {ADMIN_CONTACT_EMAIL}
          </a>
        </div>

        {loading ? <div className="text-sm text-zinc-500">กำลังโหลดข้อมูลร้าน...</div> : null}
        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
        ) : null}
        {done ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{done}</div>
        ) : null}

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <label className="space-y-1">
              <div className="text-sm text-zinc-600">จังหวัด</div>
              <select
                className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none"
                value={shopDraft?.province ?? ""}
                onChange={(e) => onChangeField?.("province", e.target.value)}
              >
                <option value="">-- เลือกจังหวัด --</option>
                {provinceOptions
                  .filter((option) => option)
                  .map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
              </select>
              <div className="text-xs text-zinc-500">
                ใช้แสดงตำแหน่งคร่าวๆ บนหน้าสินค้าเพื่อช่วยตัดสินใจนัดรับหรือแลกเปลี่ยน
              </div>
            </label>
            <label className="space-y-1">
              <div className="text-sm text-zinc-600">ชื่อร้าน</div>
              <input
                className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none"
                value={shopDraft?.shopName ?? ""}
                onChange={(e) => onChangeField?.("shopName", e.target.value)}
              />
            </label>

            <label className="space-y-1">
              <div className="text-sm text-zinc-600">เลขบัตรประชาชน</div>
              <input
                inputMode="numeric"
                maxLength={13}
                className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none disabled:bg-zinc-100"
                value={shopDraft?.citizenId ?? ""}
                disabled={citizenIdLocked}
                onChange={(e) => onChangeField?.("citizenId", e.target.value)}
              />
              <div className="text-xs text-zinc-500">
                {citizenIdLocked
                  ? "เลขบัตรประชาชนถูกล็อกหลังได้รับอนุมัติ KYC แล้ว"
                  : "กรอกได้เฉพาะตัวเลข 13 หลัก"}
              </div>
            </label>

            <label className="space-y-1">
              <div className="text-sm text-zinc-600">วันเดือนปีเกิด</div>
              <input
                type="date"
                className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none"
                value={shopDraft?.birthDate ?? ""}
                onChange={(e) => onChangeField?.("birthDate", e.target.value)}
              />
              <div className="text-xs text-zinc-500">ใช้ประกอบการตรวจสอบ KYC ของผู้ขาย</div>
            </label>

            <label className="space-y-1">
              <div className="text-sm text-zinc-600">ธนาคารสำหรับรับโอน</div>
              <select
                className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none"
                value={shopDraft?.bankName ?? ""}
                onChange={(e) => onChangeField?.("bankName", e.target.value)}
              >
                <option value="">-- เลือกธนาคาร --</option>
                {bankOptions
                  .filter((option) => option)
                  .map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
              </select>
            </label>

            <label className="space-y-1">
              <div className="text-sm text-zinc-600">ชื่อบัญชีธนาคาร</div>
              <input
                className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none"
                value={shopDraft?.bankAccountName ?? ""}
                onChange={(e) => onChangeField?.("bankAccountName", e.target.value)}
                placeholder="ชื่อเจ้าของบัญชี"
              />
            </label>

            <label className="space-y-1 md:col-span-2">
              <div className="text-sm text-zinc-600">เลขบัญชีธนาคาร</div>
              <input
                inputMode="numeric"
                className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none"
                value={shopDraft?.bankAccountNumber ?? ""}
                onChange={(e) => onChangeField?.("bankAccountNumber", e.target.value)}
                placeholder="กรอกเฉพาะตัวเลข"
              />
              <div className="text-xs text-zinc-500">
                ถ้ากรอกครบ ผู้ซื้อจะสามารถเลือกชำระแบบโอนเข้าบัญชีธนาคารได้
              </div>
            </label>

            <label className="space-y-1 md:col-span-2">
              <div className="text-sm text-zinc-600">คำอธิบายร้าน</div>
              <textarea
                className="min-h-24 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none"
                value={shopDraft?.description ?? ""}
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
                {qrFile
                  ? `ไฟล์ใหม่: ${qrFile.name}`
                  : canDirectSave
                    ? "ถ้าต้องการเปลี่ยน QR code ร้าน จะต้องส่งตรวจสอบใหม่"
                    : "ถ้ายังไม่อัปโหลด ผู้ซื้อจะยังไม่สามารถใช้ QR code ร้านนี้ได้"}
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
          {product.getProvinceLabel?.() ? (
            <div className="text-xs text-zinc-500">จังหวัด: {product.getProvinceLabel()}</div>
          ) : null}
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
      categories,
      draftProduct,
      imageFiles,
      imagePreviewUrls,
      saving,
      error,
      onClose,
      onChangeField,
      onChangeImageFiles,
      onRemoveImageAt,
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
              <div className="text-sm text-amber-500">หมวดหมู่สินค้า</div>
              <select
                className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none"
                value={draftProduct.category}
                onChange={(e) => onChangeField?.("category", e.target.value)}
              >
                <option value="">เลือกหมวดหมู่</option>
                {categories.map((category) => (
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
              <div className="text-xs text-zinc-400">เลือกได้สูงสุด 4 รูป และลบรูปที่เลือกผิดได้ก่อนลงสินค้า</div>

              {imagePreviewUrls?.length ? (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {imagePreviewUrls.map((previewUrl, index) => (
                    <div
                      key={`preview-${index}`}
                      className="relative aspect-square rounded-lg overflow-hidden border border-zinc-200 bg-zinc-100"
                    >
                      <img src={previewUrl} alt={`preview-${index + 1}`} className="h-full w-full object-cover" />
                      <button
                        type="button"
                        className="absolute right-2 top-2 z-10 grid h-8 w-8 place-items-center rounded-full border border-white/70 bg-rose-500 text-base font-semibold leading-none text-white shadow-md hover:bg-rose-600"
                        onClick={() => onRemoveImageAt?.(index)}
                        title="ลบรูปนี้"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}
            </label>

            <label className="space-y-1 md:col-span-2">
              <div className="text-sm text-zinc-600">คำอธิบายสินค้า</div>
              <textarea
                className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none min-h-28"
                required
                placeholder="กรอกรายละเอียดสินค้า"
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
              className="rounded-xl bg-[#F4D03E] px-4 py-2 font-semibold text-black disabled:opacity-60"
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
      categories,
      draftProduct,
      imageFiles,
      imagePreviewUrls,
      saving,
      error,
      onClose,
      onChangeField,
      onChangeImageFiles,
      onRemoveImageAt,
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
              <div className="text-sm text-amber-500">หมวดหมู่สินค้า</div>
              <select
                className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none"
                value={draftProduct.category}
                onChange={(e) => onChangeField?.("category", e.target.value)}
              >
                <option value="">เลือกหมวดหมู่</option>
                {categories.map((category) => (
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
              <div className="text-xs text-zinc-400">เลือกได้สูงสุด 4 รูป และลบรูปที่เลือกผิดได้ก่อนบันทึก</div>

              {!imageFiles?.length && existingImageUrls.length ? (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {existingImageUrls.map((url, index) => (
                    <div
                      key={`existing-${index}`}
                      className="relative aspect-square rounded-lg overflow-hidden border border-zinc-200 bg-zinc-100"
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
                      className="relative aspect-square rounded-lg overflow-hidden border border-zinc-200 bg-zinc-100"
                    >
                      <img src={previewUrl} alt={`preview-edit-${index + 1}`} className="h-full w-full object-cover" />
                      <button
                        type="button"
                        className="absolute right-2 top-2 z-10 grid h-8 w-8 place-items-center rounded-full border border-white/70 bg-rose-500 text-base font-semibold leading-none text-white shadow-md hover:bg-rose-600"
                        onClick={() => onRemoveImageAt?.(index)}
                        title="ลบรูปนี้"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}
            </label>

            <label className="space-y-1 md:col-span-2">
              <div className="text-sm text-zinc-600">คำอธิบายสินค้า</div>
              <textarea
                className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none min-h-28"
                required
                placeholder="กรอกรายละเอียดสินค้า"
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

          <SavedAddressesEditor
            addresses={user?.addresses}
            defaultName={user?.name}
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
