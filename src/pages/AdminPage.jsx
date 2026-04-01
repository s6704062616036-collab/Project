import React from "react";
import { AdminService } from "../services/AdminService";
import { AdminDashboardSummary } from "../models/AdminDashboardSummary";
import { AdminCategory } from "../models/AdminCategory";
import { NotificationBellButton } from "../components/NotificationBellButton";
import { ProductCardImage } from "../components/ProductCardImage";
import {
  AdminSidebarNav,
  AdminSummaryGrid,
  EmptyState,
  SECTIONS,
  SectionHeader,
  VALID_SECTIONS,
  bankMatchBadge,
  banBadge,
  kycBadge,
  productBadge,
  reportBadge,
} from "./admin/AdminPageShared";

export class AdminPage extends React.Component {
  state = {
    activeSection: "dashboard",
    loading: true,
    error: "",
    done: "",
    summary: new AdminDashboardSummary(),
    members: [],
    reports: [],
    products: [],
    categories: [],
    memberSubmittingId: "",
    reportSubmittingId: "",
    productSubmittingId: "",
    categorySubmittingId: "",
    memberSearch: "",
    productSearch: "",
    creatingCategory: new AdminCategory(),
    editingCategoryId: "",
    editingCategoryDraft: new AdminCategory(),
    focusedMemberId: "",
  };

  adminService = AdminService.instance();
  memberCardRefs = new Map();
  focusedMemberClearTimer = null;
  handledTargetKey = "";

  async componentDidMount() {
    this.syncInitialSection();
    await this.loadAdminConsole();
    this.focusRequestedMember();
  }

  componentDidUpdate(prevProps) {
    if (`${prevProps.initialSection ?? ""}` !== `${this.props.initialSection ?? ""}`) {
      this.syncInitialSection();
    }

    if (
      `${prevProps.initialMemberId ?? ""}` !== `${this.props.initialMemberId ?? ""}` ||
      `${prevProps.initialShopId ?? ""}` !== `${this.props.initialShopId ?? ""}`
    ) {
      this.handledTargetKey = "";
      this.focusRequestedMember();
    }
  }

  componentWillUnmount() {
    if (this.focusedMemberClearTimer) {
      window.clearTimeout(this.focusedMemberClearTimer);
    }
  }

  syncInitialSection = () => {
    const nextSection = `${this.props.initialSection ?? ""}`.trim();
    if (!VALID_SECTIONS.has(nextSection)) return;
    if (nextSection === this.state.activeSection) {
      if (nextSection === "members") {
        this.loadMembers({ silent: true });
      }
      return;
    }

    this.setState({ activeSection: nextSection, error: "", done: "" }, () => {
      if (nextSection === "members") {
        this.loadMembers({ silent: true });
      }
    });
  };

  loadAdminConsole = async () => {
    this.setState({ loading: true, error: "", done: "" });
    try {
      const [summaryResult, membersResult, reportsResult, productsResult, categoriesResult] = await Promise.all([
        this.adminService.getDashboardSummary(),
        this.adminService.listMembers(),
        this.adminService.listReports(),
        this.adminService.listProducts(this.state.productSearch),
        this.adminService.listCategories(),
      ]);
      this.setState({
        summary: summaryResult?.summary ?? new AdminDashboardSummary(),
        members: membersResult?.members ?? [],
        reports: reportsResult?.reports ?? [],
        products: productsResult?.products ?? [],
        categories: categoriesResult?.categories ?? [],
      }, () => {
        this.focusRequestedMember();
      });
    } catch (error) {
      this.setState({ error: error?.message ?? "โหลดข้อมูลผู้ดูแลระบบไม่สำเร็จ" });
    } finally {
      this.setState({ loading: false });
    }
  };

  loadMembers = async ({ silent = false } = {}) => {
    if (!silent) {
      this.setState({ loading: true, error: "", done: "" });
    } else {
      this.setState({ error: "" });
    }

    try {
      const [summaryResult, membersResult] = await Promise.all([
        this.adminService.getDashboardSummary(),
        this.adminService.listMembers(),
      ]);

      this.setState((state) => ({
        summary: summaryResult?.summary ?? state.summary,
        members: membersResult?.members ?? [],
      }), () => {
        this.focusRequestedMember();
      });
    } catch (error) {
      this.setState({ error: error?.message ?? "โหลดข้อมูลสมาชิกไม่สำเร็จ" });
    } finally {
      if (!silent) {
        this.setState({ loading: false });
      }
    }
  };

  setMemberCardRef = (memberId, node) => {
    const safeMemberId = `${memberId ?? ""}`.trim();
    if (!safeMemberId) return;
    if (node) {
      this.memberCardRefs.set(safeMemberId, node);
      return;
    }
    this.memberCardRefs.delete(safeMemberId);
  };

  getRequestedMember = () => {
    const requestedMemberId = `${this.props.initialMemberId ?? ""}`.trim();
    const requestedShopId = `${this.props.initialShopId ?? ""}`.trim();
    if (!requestedMemberId && !requestedShopId) return null;

    return (
      this.state.members.find((member) => {
        const memberId = `${member?.id ?? ""}`.trim();
        const shopId = `${member?.shopId ?? ""}`.trim();
        return (requestedMemberId && memberId === requestedMemberId) || (requestedShopId && shopId === requestedShopId);
      }) ?? null
    );
  };

  focusRequestedMember = () => {
    if (this.state.activeSection !== "members") return;

    const member = this.getRequestedMember();
    if (!member) return;

    const targetKey = `${member.id}|${this.props.initialMemberId ?? ""}|${this.props.initialShopId ?? ""}`;
    if (this.handledTargetKey === targetKey) return;
    this.handledTargetKey = targetKey;

    this.setState({ focusedMemberId: member.id }, () => {
      const targetNode = this.memberCardRefs.get(member.id);
      if (targetNode?.scrollIntoView) {
        targetNode.scrollIntoView({ behavior: "smooth", block: "center" });
      }

      if (this.focusedMemberClearTimer) {
        window.clearTimeout(this.focusedMemberClearTimer);
      }
      this.focusedMemberClearTimer = window.setTimeout(() => {
        this.setState({ focusedMemberId: "" });
      }, 3500);

      this.props.onTargetHandled?.();
    });
  };

  setActiveSection = (activeSection) =>
    this.setState({ activeSection, error: "", done: "" }, () => {
      if (activeSection === "members") {
        this.loadMembers({ silent: true });
      }
    });
  setMemberSearch = (memberSearch) => this.setState({ memberSearch, error: "", done: "" });
  setProductSearch = (productSearch) => this.setState({ productSearch, error: "", done: "" });

  loadProducts = async () => {
    this.setState({ loading: true, error: "", done: "" });
    try {
      const [summaryResult, productsResult, reportsResult] = await Promise.all([
        this.adminService.getDashboardSummary(),
        this.adminService.listProducts(this.state.productSearch),
        this.adminService.listReports(),
      ]);
      this.setState((state) => ({
        summary: summaryResult?.summary ?? state.summary,
        products: productsResult?.products ?? [],
        reports: reportsResult?.reports ?? state.reports,
      }));
    } catch (error) {
      this.setState({ error: error?.message ?? "โหลดรายการสินค้าไม่สำเร็จ" });
    } finally {
      this.setState({ loading: false });
    }
  };

  runMemberAction = async (member, action) => {
    const memberId = `${member?.id ?? ""}`.trim();
    if (!memberId) return;

    const targetName = member?.shopName || member?.name || "สมาชิก";
    let note = "";
    if (action === "reject_kyc" && typeof window !== "undefined") {
      const promptedNote = window.prompt(
        `ระบุเหตุผลที่ไม่อนุมัติ KYC ของ ${targetName}`,
        member?.moderationNote || "ข้อมูลไม่ครบถ้วนหรือไม่ตรงกับหลักฐานที่ส่งมา",
      );
      if (promptedNote === null) return;
      note = `${promptedNote ?? ""}`.trim();
      if (!note) {
        this.setState({ error: "กรุณาระบุเหตุผลที่ไม่อนุมัติ KYC", done: "" });
        return;
      }
    }

    const confirmMessage =
      action === "approve_kyc"
        ? `ยืนยันอนุมัติ KYC ของ ${targetName} ใช่ไหม?`
        : action === "reject_kyc"
          ? `ยืนยันไม่อนุมัติ KYC ของ ${targetName} ใช่ไหม?`
          : action === "ban"
            ? `ยืนยันระงับบัญชี ${member?.name ?? "สมาชิก"} ใช่ไหม?`
            : `ยืนยันปลดระงับบัญชี ${member?.name ?? "สมาชิก"} ใช่ไหม?`;
    if (typeof window !== "undefined" && !window.confirm(confirmMessage)) return;

    this.setState({ memberSubmittingId: memberId, error: "", done: "" });
    try {
      const result = await this.adminService.reviewMember(memberId, {
        action,
        note,
        decisionAt: new Date().toISOString(),
        reviewScope: action === "approve_kyc" || action === "reject_kyc" ? "shop_kyc" : "member_account",
        decisionSource: "admin_console",
        shopId: member?.shopId ?? "",
      });
      const { summary } = await this.adminService.getDashboardSummary();
      this.setState((state) => ({
        summary: summary ?? state.summary,
        members: state.members.map((item) => (item?.id === memberId ? result?.member ?? item : item)),
        done: result?.message ?? "อัปเดตสมาชิกแล้ว",
      }));
    } catch (error) {
      this.setState({ error: error?.message ?? "อัปเดตสมาชิกไม่สำเร็จ" });
    } finally {
      this.setState({ memberSubmittingId: "" });
    }
  };

  runReportAction = async (report, action) => {
    const reportId = `${report?.id ?? ""}`.trim();
    if (!reportId) return;

    const targetName = report?.getTargetName?.() ?? "เนื้อหา";
    let note = "";
    if (action === "take_down" && typeof window !== "undefined") {
      const promptedNote = window.prompt(
        `ระบุเหตุผลที่ลบสินค้า "${targetName}"`,
        report?.reason ?? "ละเมิดนโยบายของระบบ",
      );
      if (promptedNote === null) return;
      note = `${promptedNote ?? ""}`.trim();
      if (!note) return;
    }

    const confirmMessage =
      action === "take_down"
        ? `ยืนยันลบสินค้า "${targetName}" ออกจากระบบใช่ไหม?`
        : `ยืนยันปิดรายงานของ "${targetName}" ใช่ไหม?`;
    if (typeof window !== "undefined" && !window.confirm(confirmMessage)) return;

    this.setState({ reportSubmittingId: reportId, error: "", done: "" });
    try {
      const [result, summaryResult, productsResult] = await Promise.all([
        this.adminService.reviewReport(reportId, { action, note }),
        this.adminService.getDashboardSummary(),
        this.adminService.listProducts(this.state.productSearch),
      ]);
      this.setState((state) => ({
        summary: summaryResult?.summary ?? state.summary,
        products: productsResult?.products ?? state.products,
        reports: result?.deletedReportId
          ? state.reports.filter((item) => item?.id !== result.deletedReportId)
          : state.reports.map((item) => (item?.id === reportId ? result?.report ?? item : item)),
        done: result?.message ?? "อัปเดตรายงานแล้ว",
      }));
    } catch (error) {
      this.setState({ error: error?.message ?? "อัปเดตรายงานไม่สำเร็จ" });
    } finally {
      this.setState({ reportSubmittingId: "" });
    }
  };

  deleteProduct = async (product) => {
    const productId = `${product?.id ?? ""}`.trim();
    if (!productId) return;
    if (typeof window !== "undefined" && !window.confirm(`ยืนยันลบสินค้า "${product?.title ?? "สินค้า"}" ใช่ไหม?`)) {
      return;
    }

    let note = "";
    if (typeof window !== "undefined") {
      const promptedNote = window.prompt(
        `ระบุเหตุผลที่ลบสินค้า "${product?.title ?? "สินค้า"}"`,
        "ละเมิดนโยบายของระบบ",
      );
      if (promptedNote === null) return;
      note = `${promptedNote ?? ""}`.trim();
    }

    this.setState({ productSubmittingId: productId, error: "", done: "" });
    try {
      const [deleteResult, summaryResult, productsResult, reportsResult] = await Promise.all([
        this.adminService.deleteProduct(productId, { note }),
        this.adminService.getDashboardSummary(),
        this.adminService.listProducts(this.state.productSearch),
        this.adminService.listReports(),
      ]);
      this.setState((state) => ({
        summary: summaryResult?.summary ?? state.summary,
        products: productsResult?.products ?? state.products.filter((item) => item.id !== productId),
        reports: reportsResult?.reports ?? state.reports,
        done: deleteResult?.message ?? "ลบสินค้าแล้ว",
      }));
    } catch (error) {
      this.setState({ error: error?.message ?? "ลบสินค้าไม่สำเร็จ" });
    } finally {
      this.setState({ productSubmittingId: "" });
    }
  };

  setCreatingCategoryField = (key, value) => {
    this.setState((state) => ({
      creatingCategory: state.creatingCategory.withPatch({ [key]: value }),
      error: "",
      done: "",
    }));
  };

  startEditCategory = (category) => {
    this.setState({
      editingCategoryId: category?.id ?? "",
      editingCategoryDraft: category?.withPatch?.() ?? new AdminCategory(category ?? {}),
      error: "",
      done: "",
    });
  };

  cancelEditCategory = () => {
    this.setState({ editingCategoryId: "", editingCategoryDraft: new AdminCategory(), error: "" });
  };

  setEditingCategoryField = (key, value) => {
    this.setState((state) => ({
      editingCategoryDraft: state.editingCategoryDraft.withPatch({ [key]: value }),
      error: "",
      done: "",
    }));
  };

  createCategory = async () => {
    const validationError = this.state.creatingCategory.validate();
    if (validationError) return this.setState({ error: validationError, done: "" });

    this.setState({ categorySubmittingId: "create", error: "", done: "" });
    try {
      const result = await this.adminService.createCategory(this.state.creatingCategory.toPayload());
      this.setState({
        categories: result?.categories ?? [],
        creatingCategory: new AdminCategory(),
        done: result?.message ?? "เพิ่มหมวดหมู่แล้ว",
      });
    } catch (error) {
      this.setState({ error: error?.message ?? "เพิ่มหมวดหมู่ไม่สำเร็จ" });
    } finally {
      this.setState({ categorySubmittingId: "" });
    }
  };

  saveEditedCategory = async () => {
    const categoryId = `${this.state.editingCategoryId ?? ""}`.trim();
    const validationError = this.state.editingCategoryDraft.validate();
    if (!categoryId) return;
    if (validationError) return this.setState({ error: validationError, done: "" });

    this.setState({ categorySubmittingId: categoryId, error: "", done: "" });
    try {
      const result = await this.adminService.updateCategory(categoryId, this.state.editingCategoryDraft.toPayload());
      this.setState({
        categories: result?.categories ?? [],
        editingCategoryId: "",
        editingCategoryDraft: new AdminCategory(),
        done: result?.message ?? "แก้ไขหมวดหมู่แล้ว",
      });
    } catch (error) {
      this.setState({ error: error?.message ?? "แก้ไขหมวดหมู่ไม่สำเร็จ" });
    } finally {
      this.setState({ categorySubmittingId: "" });
    }
  };

  deleteCategory = async (category) => {
    const categoryId = `${category?.id ?? ""}`.trim();
    if (!categoryId) return;
    if (typeof window !== "undefined" && !window.confirm(`ยืนยันลบหมวดหมู่ "${category?.name ?? ""}" ใช่ไหม?`)) {
      return;
    }

    this.setState({ categorySubmittingId: categoryId, error: "", done: "" });
    try {
      const result = await this.adminService.deleteCategory(categoryId);
      this.setState({ categories: result?.categories ?? [], done: result?.message ?? "ลบหมวดหมู่แล้ว" });
    } catch (error) {
      this.setState({ error: error?.message ?? "ลบหมวดหมู่ไม่สำเร็จ" });
    } finally {
      this.setState({ categorySubmittingId: "" });
    }
  };

  renderDashboardSection() {
    return <AdminSummaryGrid summary={this.state.summary} />;
  }

  renderMembersSection() {
    if (!this.state.members.length) return <EmptyState message="ยังไม่มีสมาชิกที่ต้องจัดการ" />;

    const search = `${this.state.memberSearch ?? ""}`.trim().toLowerCase();
    const filteredMembers = search
      ? this.state.members.filter((member) =>
          [
            member?.name,
            member?.username,
            member?.email,
            member?.phone,
            member?.shopName,
            member?.getFirstName?.(),
            member?.getLastName?.(),
            member?.getKycCitizenId?.(),
            member?.bankAccountName,
            member?.bankAccountNumber,
          ]
            .filter(Boolean)
            .some((value) => `${value}`.toLowerCase().includes(search))
        )
      : this.state.members;

    return (
      <div className="space-y-4">
        <div className="rounded-3xl border border-zinc-200 bg-zinc-50 p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <label className="flex-1 space-y-1">
              <div className="text-sm text-zinc-600">ค้นหาผู้ใช้ ร้านค้า KYC หรือข้อมูลธนาคาร</div>
              <input
                className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none"
                value={this.state.memberSearch}
                onChange={(event) => this.setMemberSearch(event.target.value)}
                placeholder="ค้นหาชื่อผู้ใช้ ชื่อร้าน อีเมล เบอร์ เลขบัตร หรือเลขบัญชี"
              />
            </label>
            <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-600">
              พบ <span className="font-semibold text-zinc-900">{filteredMembers.length}</span> จาก {this.state.members.length} รายการ
            </div>
          </div>
        </div>
        {!filteredMembers.length ? <EmptyState message="ไม่พบสมาชิกที่ตรงกับคำค้นหา" /> : null}
        {filteredMembers.map((member) => {
          const isSubmitting = this.state.memberSubmittingId === member.id;
          const isFocused = this.state.focusedMemberId === member.id;
          return (
            <article
              key={member.id}
              ref={(node) => this.setMemberCardRef(member.id, node)}
              className={`rounded-3xl border bg-white p-5 shadow-sm transition ${
                isFocused
                  ? "border-amber-300 ring-4 ring-amber-100 shadow-[0_0_0_1px_rgba(251,191,36,0.28)]"
                  : "border-zinc-200"
              }`}
            >
              <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                <div className="flex gap-4">
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-zinc-100">
                    {member.avatarUrl ? <img src={member.avatarUrl} alt={member.name} className="h-full w-full object-cover" /> : null}
                  </div>
                  <div className="space-y-3">
                    <div>
                      <div className="text-lg font-semibold text-zinc-900">{member.name || "ไม่ระบุชื่อสมาชิก"}</div>
                      <div className="text-sm text-zinc-500">{member.username ? `@${member.username}` : member.email || member.phone || "-"}</div>
                    </div>
                    {isFocused ? (
                      <div className="inline-flex w-fit rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                        สมาชิกจากแจ้งเตือนล่าสุด
                      </div>
                    ) : null}
                    <div className="flex flex-wrap gap-2 text-xs font-semibold">
                      <div className={`rounded-full border px-2.5 py-1 ${kycBadge(member.kycStatus)}`}>KYC: {member.getKycStatusLabel()}</div>
                      <div className={`rounded-full border px-2.5 py-1 ${banBadge(member.banStatus)}`}>บัญชี: {member.getBanStatusLabel()}</div>
                      <div className={`rounded-full border px-2.5 py-1 ${bankMatchBadge(member.bankAccountNameMatchesUserName)}`}>บัญชีธนาคาร: {member.getBankAccountNameMatchLabel?.() || "-"}</div>
                    </div>
                    <div className="grid gap-3 lg:grid-cols-2">
                      <div className="grid gap-2 text-sm text-zinc-600 md:grid-cols-2">
                        <div>อีเมล: {member.email || "-"}</div><div>เบอร์โทร: {member.phone || "-"}</div>
                        <div>ชื่อร้าน: {member.shopName || "-"}</div><div>วันเกิด: {member.getBirthDateLabel?.() || "-"}</div>
                        <div>ชื่อจริง: {member.getFirstName?.() || "-"}</div><div>นามสกุล: {member.getLastName?.() || "-"}</div>
                        <div>เลขบัตร: {member.getKycCitizenId?.() || "-"}</div><div>ส่ง KYC ล่าสุด: {member.getSubmittedAtLabel?.() || "-"}</div>
                      </div>
                      <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3">
                        <div className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">ข้อมูลธนาคารสำหรับตรวจสอบ KYC</div>
                        <div className="grid gap-2 text-sm text-zinc-600">
                          <div>ธนาคาร: <span className="font-medium text-zinc-900">{member.bankName || "-"}</span></div>
                          <div>ชื่อบัญชี: <span className="font-medium text-zinc-900">{member.bankAccountName || "-"}</span></div>
                          <div>เลขบัญชี: <span className="font-medium text-zinc-900">{member.bankAccountNumber || "-"}</span></div>
                        </div>
                      </div>
                    </div>
                    {member.moderationNote ? (
                      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                        เหตุผล/หมายเหตุล่าสุด: {member.moderationNote}
                      </div>
                    ) : null}
                  </div>
                </div>
                <div className="grid gap-2 md:min-w-56">
                  <button type="button" className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700 disabled:opacity-50" disabled={isSubmitting || !member.canApproveKyc?.()} onClick={() => this.runMemberAction(member, "approve_kyc")}>อนุมัติ KYC</button>
                  <button type="button" className="rounded-2xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 disabled:opacity-50" disabled={isSubmitting || !member.canRejectKyc?.()} onClick={() => this.runMemberAction(member, "reject_kyc")}>ไม่อนุมัติ</button>
                  <button type="button" className="rounded-2xl border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-700 disabled:opacity-50" disabled={isSubmitting || member.isBanned()} onClick={() => this.runMemberAction(member, "ban")}>ระงับบัญชี</button>
                  <button type="button" className="rounded-2xl border border-zinc-200 px-4 py-2.5 text-sm font-semibold text-zinc-700 disabled:opacity-50" disabled={isSubmitting || !member.isBanned()} onClick={() => this.runMemberAction(member, "unban")}>ปลดระงับ</button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    );
  }

  renderReportsSection() {
    if (!this.state.reports.length) return <EmptyState message="ยังไม่มีรายงานสินค้าและร้านค้า" />;
    return (
      <div className="space-y-4">
        {this.state.reports.map((report) => {
          const isSubmitting = this.state.reportSubmittingId === report.id;
          return (
            <article key={report.id} className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex gap-4">
                  <div className="grid h-24 w-24 shrink-0 place-items-center overflow-hidden rounded-2xl bg-zinc-100 px-2 text-center">
                    <ProductCardImage
                      src={report.getPreviewImageUrl?.()}
                      alt={report.getTargetName?.() ?? "report"}
                      emptyLabel="ไม่มีรูปภาพ"
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="text-lg font-semibold text-zinc-900">{report.getTargetName?.() ?? "ไม่ระบุรายการ"}</div>
                      <div className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${reportBadge(report.status)}`}>{report.getStatusLabel()}</div>
                    </div>
                    <div className="text-sm text-zinc-500">{report.getMetadataLabel?.() ?? `ผู้รายงาน: ${report.reporterName || "-"}`}</div>
                    <div className="rounded-2xl bg-zinc-50 px-3 py-2 text-sm text-zinc-700">เหตุผล: {report.reason || "-"}</div>
                  </div>
                </div>
                <div className="grid gap-2 md:min-w-56">
                  {report.isProductReport?.() ? <button type="button" className="rounded-2xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 disabled:opacity-50" disabled={isSubmitting || report.isTakenDown()} onClick={() => this.runReportAction(report, "take_down")}>ลบสินค้า</button> : null}
                  <button type="button" className="rounded-2xl border border-zinc-200 px-4 py-2.5 text-sm font-semibold text-zinc-700 disabled:opacity-50" disabled={isSubmitting || !report.isOpen()} onClick={() => this.runReportAction(report, "dismiss")}>{report.isShopReport?.() ? "ปิดรายงาน" : "ปฏิเสธ"}</button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    );
  }

  renderProductsSection() {
    return (
      <div className="space-y-5">
        <div className="rounded-3xl border border-zinc-200 bg-zinc-50 p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <label className="flex-1 space-y-1">
              <div className="text-sm text-zinc-600">ค้นหาสินค้า ร้านค้า หรือผู้ขาย</div>
              <input className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none" value={this.state.productSearch} onChange={(event) => this.setProductSearch(event.target.value)} placeholder="ค้นหาชื่อสินค้า ร้านค้า ผู้ขาย หรือหมวดหมู่" />
            </label>
            <button type="button" className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold text-zinc-700" onClick={this.loadProducts}>รีเฟรชรายการสินค้า</button>
          </div>
        </div>
        {!this.state.products.length ? <EmptyState message="ยังไม่พบสินค้าที่ตรงกับเงื่อนไขการค้นหา" /> : <div className="space-y-4">{this.state.products.map((product) => {
          const isSubmitting = this.state.productSubmittingId === product.id;
          return <article key={product.id} className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm"><div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between"><div className="flex gap-4"><div className="h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-zinc-100">{product.imageUrl ? <img src={product.imageUrl} alt={product.title} className="h-full w-full object-cover" /> : null}</div><div className="space-y-2"><div className="flex flex-wrap items-center gap-2"><div className="text-lg font-semibold text-zinc-900">{product.title || "ไม่ระบุชื่อสินค้า"}</div><div className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${productBadge(product.status)}`}>{product.getStatusLabel()}</div><div className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${kycBadge(product.kycStatus)}`}>{product.getKycStatusLabel()}</div></div><div className="text-sm text-zinc-500">ร้าน: {product.shopName || "-"} | ผู้ขาย: {product.sellerName || "-"}</div><div className="grid gap-2 text-sm text-zinc-600 md:grid-cols-2"><div>ราคา: {product.getPriceLabel()}</div><div>หมวดหมู่: {product.category || "-"}</div><div>ของที่ต้องการแลก: {product.exchangeItem || "-"}</div><div>จำนวนรูป: {product.imageCount || 0} รูป</div></div>{product.description ? <div className="rounded-2xl bg-zinc-50 px-3 py-2 text-sm text-zinc-700">{product.description}</div> : null}</div></div><div className="grid gap-2 md:min-w-56"><button type="button" className="rounded-2xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 disabled:opacity-50" disabled={isSubmitting} onClick={() => this.deleteProduct(product)}>ลบสินค้าออกจากระบบ</button></div></div></article>;
        })}</div>}
      </div>
    );
  }

  renderCategoriesSection() {
    return (
      <div className="space-y-5">
        <div className="rounded-3xl border border-zinc-200 bg-zinc-50 p-4">
          <div className="mb-3 text-lg font-semibold text-zinc-900">เพิ่มหมวดหมู่ใหม่</div>
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_auto] md:items-end">
            <label className="space-y-1"><div className="text-sm text-zinc-600">ชื่อหมวดหมู่</div><input className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none" value={this.state.creatingCategory.name} onChange={(event) => this.setCreatingCategoryField("name", event.target.value)} /></label>
            <label className="space-y-1"><div className="text-sm text-zinc-600">คำอธิบาย</div><input className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none" value={this.state.creatingCategory.description} onChange={(event) => this.setCreatingCategoryField("description", event.target.value)} /></label>
            <button type="button" className="rounded-2xl bg-[#F4D03E] px-4 py-3 text-sm font-semibold text-zinc-900 disabled:opacity-50" onClick={this.createCategory} disabled={this.state.categorySubmittingId === "create"}>เพิ่มหมวดหมู่</button>
          </div>
        </div>
        {!this.state.categories.length ? <EmptyState message="ยังไม่มีหมวดหมู่ในระบบ" /> : <div className="space-y-4">{this.state.categories.map((category) => {
          const isEditing = this.state.editingCategoryId === category.id;
          const isSubmitting = this.state.categorySubmittingId === category.id;
          const draft = isEditing ? this.state.editingCategoryDraft : category;
          return <article key={category.id} className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm"><div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_auto]"><div className="grid gap-3 md:grid-cols-2"><label className="space-y-1"><div className="text-sm text-zinc-600">ชื่อหมวดหมู่</div><input className="w-full rounded-2xl border border-zinc-200 px-4 py-3 text-sm outline-none disabled:bg-zinc-50" value={draft.name} disabled={!isEditing} onChange={(event) => this.setEditingCategoryField("name", event.target.value)} /></label><div className="rounded-2xl bg-zinc-50 px-4 py-3 text-sm text-zinc-600">จำนวนสินค้าที่ใช้หมวดนี้: <span className="font-semibold text-zinc-900">{category.productCount}</span></div><label className="space-y-1 md:col-span-2"><div className="text-sm text-zinc-600">คำอธิบาย</div><input className="w-full rounded-2xl border border-zinc-200 px-4 py-3 text-sm outline-none disabled:bg-zinc-50" value={draft.description} disabled={!isEditing} onChange={(event) => this.setEditingCategoryField("description", event.target.value)} /></label></div><div className="grid gap-2 sm:grid-cols-3 xl:min-w-72">{isEditing ? <><button type="button" className="rounded-2xl bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50" onClick={this.saveEditedCategory} disabled={isSubmitting}>บันทึก</button><button type="button" className="rounded-2xl border border-zinc-200 px-4 py-2.5 text-sm font-semibold text-zinc-700" onClick={this.cancelEditCategory} disabled={isSubmitting}>ยกเลิก</button><button type="button" className="rounded-2xl border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-700" onClick={() => this.deleteCategory(category)} disabled={isSubmitting}>ลบ</button></> : <><button type="button" className="rounded-2xl border border-zinc-200 px-4 py-2.5 text-sm font-semibold text-zinc-700" onClick={() => this.startEditCategory(category)} disabled={Boolean(this.state.editingCategoryId)}>แก้ไข</button><button type="button" className="rounded-2xl border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-700" onClick={() => this.deleteCategory(category)} disabled={Boolean(this.state.editingCategoryId) || isSubmitting}>ลบ</button></>}</div></div></article>;
        })}</div>}
      </div>
    );
  }

  renderSectionContent() {
    if (this.state.activeSection === "members") return this.renderMembersSection();
    if (this.state.activeSection === "reports") return this.renderReportsSection();
    if (this.state.activeSection === "products") return this.renderProductsSection();
    if (this.state.activeSection === "categories") return this.renderCategoriesSection();
    return this.renderDashboardSection();
  }

  render() {
    const activeSection = SECTIONS.find((item) => item.key === this.state.activeSection) ?? SECTIONS[0];
    return (
      <div className="min-h-dvh bg-[radial-gradient(circle_at_top_left,_rgba(164,227,216,0.22),_transparent_30%),linear-gradient(180deg,_#f8fafc_0%,_#f5f7fb_100%)]">
        <div className="sticky top-0 z-40 border-b border-zinc-200/70 bg-[#A4E3D8]/90 backdrop-blur-sm"><div className="mx-auto flex max-w-375 items-center gap-4 px-4 py-5"><div className="overflow-hidden rounded-2xl border border-white/70 bg-white/75 shadow-sm"><img src="/App logo.jpg" alt="App logo" className="h-20 w-20 object-cover" /></div><div className="min-w-0 flex-1"><div className="text-lg font-semibold tracking-tight text-zinc-900 md:text-2xl">Administrator System</div><div className="mt-1 text-sm text-zinc-700">ตรวจสอบสมาชิก รายงานสินค้า รายงานร้านค้า และข้อมูลหลักของเว็บไซต์</div></div><div className="hidden rounded-2xl border border-zinc-200 bg-white/80 px-4 py-2 text-sm text-zinc-700 shadow-sm md:block"><div className="font-semibold text-zinc-900">{this.props.user?.name ?? "Admin"}</div><div>{this.props.user?.username ? `@${this.props.user.username}` : this.props.user?.email ?? ""}</div></div><NotificationBellButton unreadCount={Number(this.props.notificationUnreadCount ?? 0) || 0} onClick={this.props.onGoNotifications} className="app-icon-button relative grid h-10 w-10 place-items-center bg-[#F4D03E]" /><button type="button" className="rounded-2xl border border-zinc-200 bg-[#F4D03E] px-4 py-2.5 text-sm font-semibold text-zinc-900 shadow-sm" onClick={this.props.onLogout}>Log out</button></div></div>
        <div className="mx-auto max-w-375 space-y-6 px-4 py-6">{this.state.error ? <div className="rounded-3xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 shadow-sm">{this.state.error}</div> : null}{this.state.done ? <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700 shadow-sm">{this.state.done}</div> : null}<div className="grid grid-cols-1 gap-6 xl:grid-cols-[18rem_minmax(0,1fr)]"><AdminSidebarNav activeSection={this.state.activeSection} onSelect={this.setActiveSection} /><main className="rounded-[28px] border border-zinc-200 bg-white p-4 shadow-sm md:p-6"><SectionHeader title={activeSection.label} description={activeSection.description} right={this.state.loading ? <div className="text-sm text-zinc-500">กำลังโหลดข้อมูล...</div> : null} />{this.state.loading ? <div className="rounded-3xl border border-dashed border-zinc-300 bg-zinc-50 p-10 text-center text-sm text-zinc-500">กำลังเตรียมข้อมูลผู้ดูแลระบบ...</div> : this.renderSectionContent()}</main></div></div>
      </div>
    );
  }
}
