import React from "react";
import { AdminService } from "../services/AdminService";
import { AdminDashboardSummary } from "../models/AdminDashboardSummary";
import { AdminCategory } from "../models/AdminCategory";

const SECTION_ITEMS = [
  { key: "dashboard", label: "Dashboard", description: "สรุปภาพรวมระบบ" },
  { key: "members", label: "จัดการสมาชิก", description: "ตรวจสอบ KYC และระงับบัญชี" },
  { key: "reports", label: "จัดการเนื้อหา", description: "ตรวจสอบสินค้าและร้านค้าที่ถูกรายงาน" },
  { key: "categories", label: "จัดการหมวดหมู่", description: "เพิ่ม แก้ไข ลบหมวดหมู่หลัก" },
];

const getKycBadgeClassName = (status) => {
  switch (`${status ?? ""}`.trim()) {
    case "approved":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "rejected":
      return "border-red-200 bg-red-50 text-red-700";
    case "unsubmitted":
      return "border-zinc-200 bg-zinc-100 text-zinc-700";
    default:
      return "border-amber-200 bg-amber-50 text-amber-700";
  }
};

const getBanBadgeClassName = (status) =>
  `${status ?? ""}`.trim() === "banned"
    ? "border-red-200 bg-red-50 text-red-700"
    : "border-emerald-200 bg-emerald-50 text-emerald-700";

const getReportBadgeClassName = (status) => {
  switch (`${status ?? ""}`.trim()) {
    case "dismissed":
      return "border-zinc-200 bg-zinc-100 text-zinc-700";
    case "taken_down":
      return "border-red-200 bg-red-50 text-red-700";
    default:
      return "border-amber-200 bg-amber-50 text-amber-700";
  }
};

export class AdminPage extends React.Component {
  state = {
    activeSection: "dashboard",
    loading: true,
    error: "",
    done: "",
    summary: new AdminDashboardSummary(),
    members: [],
    reports: [],
    categories: [],
    memberSubmittingId: "",
    reportSubmittingId: "",
    categorySubmittingId: "",
    creatingCategory: new AdminCategory(),
    editingCategoryId: "",
    editingCategoryDraft: new AdminCategory(),
  };

  adminService = AdminService.instance();

  async componentDidMount() {
    await this.loadAdminConsole();
  }

  loadAdminConsole = async () => {
    this.setState({ loading: true, error: "", done: "" });
    try {
      const [summaryResult, membersResult, reportsResult, categoriesResult] = await Promise.all([
        this.adminService.getDashboardSummary(),
        this.adminService.listMembers(),
        this.adminService.listReports(),
        this.adminService.listCategories(),
      ]);

      this.setState({
        summary: summaryResult?.summary ?? new AdminDashboardSummary(),
        members: membersResult?.members ?? [],
        reports: reportsResult?.reports ?? [],
        categories: categoriesResult?.categories ?? [],
      });
    } catch (error) {
      this.setState({
        error: error?.message ?? "โหลดข้อมูลผู้ดูแลระบบไม่สำเร็จ",
      });
    } finally {
      this.setState({ loading: false });
    }
  };

  setActiveSection = (activeSection) => {
    this.setState({ activeSection, done: "", error: "" });
  };

  runMemberAction = async (member, action) => {
    const memberId = `${member?.id ?? ""}`.trim();
    if (!memberId) return;

    const confirmMessage =
      action === "approve_kyc"
        ? `ยืนยันอนุมัติ KYC ของ ${member?.shopName || member?.name || "สมาชิก"} ใช่ไหม?`
        : action === "reject_kyc"
          ? `ยืนยันไม่อนุมัติ KYC ของ ${member?.shopName || member?.name || "สมาชิก"} ใช่ไหม?`
          : action === "ban"
            ? `ยืนยันระงับบัญชี ${member?.name ?? "สมาชิก"} ใช่ไหม?`
            : `ยืนยันปลดระงับบัญชี ${member?.name ?? "สมาชิก"} ใช่ไหม?`;

    if (typeof window !== "undefined" && !window.confirm(confirmMessage)) return;

    this.setState({ memberSubmittingId: memberId, error: "", done: "" });
    try {
      const result = await this.adminService.reviewMember(memberId, {
        action,
        decisionAt: new Date().toISOString(),
        reviewScope: action === "approve_kyc" || action === "reject_kyc" ? "shop_kyc" : "member_account",
        decisionSource: "admin_console",
        shopId: member?.shopId ?? "",
      });
      const { summary } = await this.adminService.getDashboardSummary();
      this.setState((state) => ({
        summary: summary ?? state.summary,
        members: (state.members ?? []).map((item) => (item?.id === memberId ? result?.member ?? item : item)),
        done: result?.message ?? "อัปเดตสมาชิกแล้ว",
      }));
    } catch (error) {
      this.setState({
        error: error?.message ?? "อัปเดตสมาชิกไม่สำเร็จ",
      });
    } finally {
      this.setState({ memberSubmittingId: "" });
    }
  };

  runReportAction = async (report, action) => {
    const reportId = `${report?.id ?? ""}`.trim();
    if (!reportId) return;
    const targetName = report?.getTargetName?.() ?? "เนื้อหา";
    const isShopReport = report?.isShopReport?.() ?? false;
    let note = "";

    const confirmMessage =
      action === "take_down"
        ? `ยืนยันลบสินค้า "${targetName}" ออกจากร้านค้าใช่ไหม?`
        : isShopReport
          ? `ยืนยันลบรายงานของร้าน "${targetName}" ใช่ไหม?`
          : `ยืนยันปฏิเสธรายงานของสินค้า "${targetName}" ใช่ไหม?`;

    if (action === "take_down" && typeof window !== "undefined") {
      const promptedNote = window.prompt(
        `ระบุสาเหตุที่ลบสินค้า "${targetName}" เพื่อส่งแจ้งเตือนไปยังร้านค้า`,
        report?.reason ?? "",
      );
      if (promptedNote === null) return;
      note = `${promptedNote ?? ""}`.trim();
      if (!note) {
        this.setState({ error: "กรุณาระบุสาเหตุการลบสินค้า", done: "" });
        return;
      }
    }

    if (typeof window !== "undefined" && !window.confirm(confirmMessage)) return;

    this.setState({ reportSubmittingId: reportId, error: "", done: "" });
    try {
      const result = await this.adminService.reviewReport(reportId, { action, note });
      const [summaryResult, categoriesResult] = await Promise.all([
        this.adminService.getDashboardSummary(),
        this.adminService.listCategories(),
      ]);

      this.setState((state) => ({
        summary: summaryResult?.summary ?? state.summary,
        categories: categoriesResult?.categories ?? state.categories,
        reports: result?.deletedReportId
          ? (state.reports ?? []).filter((item) => item?.id !== result.deletedReportId)
          : (state.reports ?? []).map((item) => (item?.id === reportId ? result?.report ?? item : item)),
        done: result?.message ?? "อัปเดตรายงานแล้ว",
      }));
    } catch (error) {
      this.setState({
        error: error?.message ?? "อัปเดตรายงานไม่สำเร็จ",
      });
    } finally {
      this.setState({ reportSubmittingId: "" });
    }
  };

  setCreatingCategoryField = (key, value) => {
    this.setState((state) => ({
      creatingCategory: state.creatingCategory.withPatch({ [key]: value }),
      error: "",
      done: "",
    }));
  };

  createCategory = async () => {
    const validationError = this.state.creatingCategory.validate();
    if (validationError) {
      this.setState({ error: validationError, done: "" });
      return;
    }

    this.setState({ categorySubmittingId: "create", error: "", done: "" });
    try {
      const result = await this.adminService.createCategory(this.state.creatingCategory.toPayload());
      this.setState({
        categories: result?.categories ?? [],
        creatingCategory: new AdminCategory(),
        done: result?.message ?? "เพิ่มหมวดหมู่แล้ว",
      });
    } catch (error) {
      this.setState({
        error: error?.message ?? "เพิ่มหมวดหมู่ไม่สำเร็จ",
      });
    } finally {
      this.setState({ categorySubmittingId: "" });
    }
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
    this.setState({
      editingCategoryId: "",
      editingCategoryDraft: new AdminCategory(),
      error: "",
    });
  };

  setEditingCategoryField = (key, value) => {
    this.setState((state) => ({
      editingCategoryDraft: state.editingCategoryDraft.withPatch({ [key]: value }),
      error: "",
      done: "",
    }));
  };

  saveEditedCategory = async () => {
    const categoryId = `${this.state.editingCategoryId ?? ""}`.trim();
    const validationError = this.state.editingCategoryDraft.validate();
    if (!categoryId) return;
    if (validationError) {
      this.setState({ error: validationError, done: "" });
      return;
    }

    this.setState({ categorySubmittingId: categoryId, error: "", done: "" });
    try {
      const result = await this.adminService.updateCategory(
        categoryId,
        this.state.editingCategoryDraft.toPayload(),
      );
      this.setState({
        categories: result?.categories ?? [],
        editingCategoryId: "",
        editingCategoryDraft: new AdminCategory(),
        done: result?.message ?? "แก้ไขหมวดหมู่แล้ว",
      });
    } catch (error) {
      this.setState({
        error: error?.message ?? "แก้ไขหมวดหมู่ไม่สำเร็จ",
      });
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
      this.setState({
        categories: result?.categories ?? [],
        done: result?.message ?? "ลบหมวดหมู่แล้ว",
      });
    } catch (error) {
      this.setState({
        error: error?.message ?? "ลบหมวดหมู่ไม่สำเร็จ",
      });
    } finally {
      this.setState({ categorySubmittingId: "" });
    }
  };

  renderSection() {
    const {
      activeSection,
      summary,
      members,
      reports,
      categories,
      memberSubmittingId,
      reportSubmittingId,
      categorySubmittingId,
      creatingCategory,
      editingCategoryId,
      editingCategoryDraft,
    } = this.state;

    if (activeSection === "members") {
      return (
        <MemberSection
          members={members}
          submittingId={memberSubmittingId}
          onAction={this.runMemberAction}
        />
      );
    }

    if (activeSection === "reports") {
      return (
        <ReportSection
          reports={reports}
          submittingId={reportSubmittingId}
          onAction={this.runReportAction}
        />
      );
    }

    if (activeSection === "categories") {
      return (
        <CategorySection
          categories={categories}
          creatingCategory={creatingCategory}
          editingCategoryId={editingCategoryId}
          editingCategoryDraft={editingCategoryDraft}
          submittingId={categorySubmittingId}
          onCreateFieldChange={this.setCreatingCategoryField}
          onCreate={this.createCategory}
          onStartEdit={this.startEditCategory}
          onCancelEdit={this.cancelEditCategory}
          onEditFieldChange={this.setEditingCategoryField}
          onSaveEdit={this.saveEditedCategory}
          onDelete={this.deleteCategory}
        />
      );
    }

    return <DashboardOverviewPanel summary={summary} />;
  }

  render() {
    const { activeSection, loading, error, done, summary } = this.state;
    const activeSectionConfig = SECTION_ITEMS.find((item) => item.key === activeSection) ?? SECTION_ITEMS[0];

    return (
      <div className="min-h-dvh bg-zinc-50">
        <div className="sticky top-0 z-40 border-b border-zinc-200 bg-[#A4E3D8]">
          <div className="mx-auto flex max-w-375 items-center gap-4 px-4 py-5">
            <button
              type="button"
              className="shrink-0 rounded-xl border border-zinc-200 bg-white p-0"
              title="Administrator"
            >
              <img
                src="/App logo.jpg"
                alt="App logo"
                className="h-20 w-20 rounded-xl object-cover"
              />
            </button>

            <div className="min-w-0 flex-1">
              <div className="text-lg font-semibold text-zinc-900 md:text-2xl">Administrator System</div>
              <div className="text-sm text-zinc-700">
                ตรวจสอบสมาชิก รายงานสินค้า รายงานร้านค้า และหมวดหมู่หลักของเว็บไซต์
              </div>
            </div>

            <div className="hidden rounded-2xl border border-zinc-200 bg-white/80 px-4 py-2 text-sm text-zinc-700 md:block">
              <div className="font-semibold text-zinc-900">{this.props.user?.name ?? "Admin"}</div>
              <div>{this.props.user?.username ? `@${this.props.user.username}` : this.props.user?.email ?? ""}</div>
            </div>

            <button
              type="button"
              className="rounded-xl border border-zinc-200 bg-[#F4D03E] px-4 py-2 text-sm font-semibold text-zinc-900"
              onClick={this.props.onLogout}
            >
              Log out
            </button>
          </div>
        </div>

        <div className="mx-auto max-w-375 space-y-6 px-4 py-6">
          <DashboardSection summary={summary} compact />

          {error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          {done ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
              {done}
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[17rem_minmax(0,1fr)]">
            <aside className="rounded-3xl bg-white p-3 shadow">
              <div className="px-3 pb-3 text-sm font-semibold text-zinc-900">เมนูผู้ดูแลระบบ</div>
              <div className="space-y-2">
                {SECTION_ITEMS.map((item) => {
                  const active = item.key === activeSection;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => this.setActiveSection(item.key)}
                      className={`w-full rounded-2xl border px-3 py-3 text-left transition ${
                        active
                          ? "border-zinc-900 bg-zinc-900 text-white"
                          : "border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-zinc-100"
                      }`}
                    >
                      <div className="font-semibold">{item.label}</div>
                      <div className={`text-xs ${active ? "text-zinc-200" : "text-zinc-500"}`}>
                        {item.description}
                      </div>
                    </button>
                  );
                })}
              </div>
            </aside>

            <main className="rounded-3xl bg-white p-4 shadow md:p-6">
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <div className="text-2xl font-semibold text-zinc-900">{activeSectionConfig.label}</div>
                  <div className="text-sm text-zinc-500">{activeSectionConfig.description}</div>
                </div>
                {loading ? <div className="text-sm text-zinc-500">กำลังโหลดข้อมูล...</div> : null}
              </div>

              {loading ? (
                <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 p-8 text-center text-sm text-zinc-500">
                  กำลังเตรียมข้อมูลผู้ดูแลระบบ...
                </div>
              ) : (
                this.renderSection()
              )}
            </main>
          </div>
        </div>
      </div>
    );
  }
}

class DashboardSection extends React.Component {
  render() {
    const { summary, compact = false } = this.props;
    const cards = [
      {
        label: "สมาชิกใหม่",
        value: summary?.newMembersCount ?? 0,
        note: "นับจากข้อมูลผู้ใช้ในระบบ",
      },
      {
        label: "ประกาศสินค้า",
        value: summary?.productAnnouncementsCount ?? 0,
        note: "จำนวนประกาศที่ยังแสดงบนเว็บไซต์",
      },
      {
        label: "แลกเปลี่ยนสำเร็จ",
        value: summary?.successfulExchangesCount ?? 0,
        note: "อ้างอิงจากสินค้าที่ปิดการขายแล้ว",
      },
      {
        label: "KYC รอตรวจ",
        value: summary?.pendingKycCount ?? 0,
        note: "รายการที่ต้องการการตัดสินใจ",
      },
      {
        label: "รายงานเปิดอยู่",
        value: summary?.openReportsCount ?? 0,
        note: "ประกาศที่รอตรวจสอบ",
      },
    ];

    return (
      <div className={`grid gap-4 ${compact ? "md:grid-cols-2 xl:grid-cols-5" : "md:grid-cols-2 xl:grid-cols-3"}`}>
        {cards.map((card) => (
          <div key={card.label} className="rounded-3xl border border-zinc-200 bg-white p-4 shadow-sm">
            <div className="text-sm font-medium text-zinc-500">{card.label}</div>
            <div className="mt-3 text-3xl font-semibold text-zinc-900">{card.value}</div>
            <div className="mt-2 text-xs text-zinc-500">{card.note}</div>
          </div>
        ))}
      </div>
    );
  }
}

class DashboardOverviewPanel extends React.Component {
  render() {
    const { summary } = this.props;

    return (
      <div className="space-y-5">
        <DashboardSection summary={summary} />

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-3xl border border-zinc-200 bg-zinc-50 p-4">
            <div className="text-lg font-semibold text-zinc-900">งานที่ควรตรวจสอบต่อ</div>
            <div className="mt-3 space-y-3 text-sm text-zinc-700">
              <div className="rounded-2xl bg-white px-3 py-3">
                ร้านค้าที่รอ KYC: <span className="font-semibold text-zinc-900">{summary?.pendingKycCount ?? 0}</span>
              </div>
              <div className="rounded-2xl bg-white px-3 py-3">
                รายงานประกาศที่ยังเปิดอยู่: <span className="font-semibold text-zinc-900">{summary?.openReportsCount ?? 0}</span>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-zinc-200 bg-zinc-50 p-4">
            <div className="text-lg font-semibold text-zinc-900">ขอบเขตของโครงนี้</div>
            <div className="mt-3 space-y-3 text-sm text-zinc-700">
              <div className="rounded-2xl bg-white px-3 py-3">
                ระบบรองรับ login ของ admin ผ่านหน้าเดิม และแยก route เข้า console อัตโนมัติ
              </div>
              <div className="rounded-2xl bg-white px-3 py-3">
                ข้อมูลสมาชิก รายงาน และหมวดหมู่ถูกเรียกผ่าน service layer และพร้อมต่อกับ API จริง
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

class MemberSection extends React.Component {
  render() {
    const { members, submittingId, onAction } = this.props;

    if (!members?.length) {
      return <EmptyState message="ยังไม่มีสมาชิกที่ต้องจัดการ" />;
    }

    return (
      <div className="space-y-4">
        {members.map((member) => {
          const isSubmitting = submittingId === member.id;
          return (
            <article key={member.id} className="rounded-3xl border border-zinc-200 p-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex min-w-0 gap-4">
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-zinc-100">
                    {member.avatarUrl ? (
                      <img src={member.avatarUrl} alt={member.name} className="h-full w-full object-cover" />
                    ) : null}
                  </div>

                  <div className="min-w-0 space-y-2">
                    <div>
                      <div className="text-lg font-semibold text-zinc-900">{member.name || "ไม่ระบุชื่อสมาชิก"}</div>
                      <div className="text-sm text-zinc-500">
                        {member.username ? `@${member.username}` : member.email || member.phone || "-"}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 text-xs font-semibold">
                      <div className={`rounded-full border px-2.5 py-1 ${getKycBadgeClassName(member.kycStatus)}`}>
                        KYC: {member.getKycStatusLabel()}
                      </div>
                      <div className={`rounded-full border px-2.5 py-1 ${getBanBadgeClassName(member.banStatus)}`}>
                        บัญชี: {member.getBanStatusLabel()}
                      </div>
                    </div>

                    <div className="grid gap-2 text-sm text-zinc-600 md:grid-cols-2">
                      <div>อีเมล: {member.email || "-"}</div>
                      <div>เบอร์โทร: {member.phone || "-"}</div>
                      <div>ชื่อร้าน: {member.shopName || "-"}</div>
                      <div>ส่ง KYC ล่าสุด: {member.getSubmittedAtLabel?.() ?? "-"}</div>
                      <div>สมัครเมื่อ: {member.getJoinedAtLabel()}</div>
                      <div>ตรวจล่าสุด: {member.getReviewedAtLabel()}</div>
                    </div>

                    {member.moderationNote ? (
                      <div className="rounded-2xl bg-zinc-50 px-3 py-2 text-sm text-zinc-600">
                        หมายเหตุ: {member.moderationNote}
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="w-full max-w-sm space-y-3">
                  <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3">
                    <div className="text-sm font-semibold text-zinc-900">เอกสาร KYC ร้านค้า</div>
                    <div className="mt-3 space-y-3 text-sm text-zinc-600">
                      <div className="rounded-2xl border border-zinc-200 bg-white px-3 py-2">
                        <div className="text-xs font-medium text-zinc-500">เลขบัตรประชาชน</div>
                        <div className="mt-1 font-semibold text-zinc-900">{member.getKycCitizenId?.() || "-"}</div>
                      </div>

                      {member.shopDescription ? (
                        <div className="rounded-2xl border border-zinc-200 bg-white px-3 py-2">
                          <div className="text-xs font-medium text-zinc-500">คำอธิบายร้าน</div>
                          <div className="mt-1 text-zinc-700">{member.shopDescription}</div>
                        </div>
                      ) : null}

                      {member.getKycQrCodeUrl?.() ? (
                        <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
                          <img
                            src={member.getKycQrCodeUrl()}
                            alt={`kyc-${member.name}`}
                            className="h-36 w-full object-contain"
                          />
                        </div>
                      ) : (
                        <div className="rounded-2xl border border-dashed border-zinc-200 bg-white px-3 py-6 text-center text-sm text-zinc-500">
                          ยังไม่มี QR code ร้านให้ตรวจสอบ
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 disabled:opacity-50"
                      disabled={isSubmitting || !member.canApproveKyc?.()}
                      onClick={() => onAction?.(member, "approve_kyc")}
                    >
                      อนุมัติ KYC
                    </button>
                    <button
                      type="button"
                      className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 disabled:opacity-50"
                      disabled={isSubmitting || !member.canRejectKyc?.()}
                      onClick={() => onAction?.(member, "reject_kyc")}
                    >
                      ไม่อนุมัติ
                    </button>
                    <button
                      type="button"
                      className="rounded-xl border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 disabled:opacity-50"
                      disabled={isSubmitting || member.isBanned()}
                      onClick={() => onAction?.(member, "ban")}
                    >
                      ระงับบัญชี
                    </button>
                    <button
                      type="button"
                      className="rounded-xl border border-zinc-200 px-3 py-2 text-sm font-semibold text-zinc-700 disabled:opacity-50"
                      disabled={isSubmitting || !member.isBanned()}
                      onClick={() => onAction?.(member, "unban")}
                    >
                      ปลดระงับ
                    </button>
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    );
  }
}

class ReportSection extends React.Component {
  render() {
    const { reports, submittingId, onAction } = this.props;

    if (!reports?.length) {
      return <EmptyState message="ยังไม่มีรายงานสินค้าและร้านค้า" />;
    }

    return (
      <div className="space-y-4">
        {reports.map((report) => {
          const isSubmitting = submittingId === report.id;
          return (
            <article key={report.id} className="rounded-3xl border border-zinc-200 p-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex min-w-0 gap-4">
                  <div className="h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-zinc-100">
                    {report.getPreviewImageUrl?.() ? (
                      <img
                        src={report.getPreviewImageUrl()}
                        alt={report.getTargetName?.() ?? "report-target"}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="grid h-full w-full place-items-center text-sm text-zinc-500">
                        {report.isShopReport?.() ? "ร้าน" : "สินค้า"}
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="text-lg font-semibold text-zinc-900">{report.getTargetName?.() ?? "ไม่ระบุรายการ"}</div>
                      <div className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${getReportBadgeClassName(report.status)}`}>
                        {report.getStatusLabel()}
                      </div>
                    </div>
                    <div className="text-sm text-zinc-500">
                      {report.getMetadataLabel?.() ?? `ผู้รายงาน: ${report.reporterName || "-"}`}
                    </div>
                    <div className="rounded-2xl bg-zinc-50 px-3 py-2 text-sm text-zinc-700">
                      เหตุผลที่รายงาน: {report.reason || "-"}
                    </div>
                    <div className="text-sm text-zinc-500">
                      รายงานเมื่อ {report.getCreatedAtLabel()}
                      {report.resolvedAt ? ` | ปิดเมื่อ ${report.getResolvedAtLabel()}` : ""}
                    </div>
                  </div>
                </div>

                <div className="grid shrink-0 gap-2 md:min-w-56">
                  {report.isProductReport?.() ? (
                    <button
                      type="button"
                      className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 disabled:opacity-50"
                      disabled={isSubmitting || report.isTakenDown()}
                      onClick={() => onAction?.(report, "take_down")}
                    >
                      ลบสินค้า
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="rounded-xl border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 disabled:opacity-50"
                    disabled={isSubmitting || !report.isOpen()}
                    onClick={() => onAction?.(report, "dismiss")}
                  >
                    {report.isShopReport?.() ? "ลบรายงาน" : "ปฏิเสธ"}
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    );
  }
}

class CategorySection extends React.Component {
  render() {
    const {
      categories,
      creatingCategory,
      editingCategoryId,
      editingCategoryDraft,
      submittingId,
      onCreateFieldChange,
      onCreate,
      onStartEdit,
      onCancelEdit,
      onEditFieldChange,
      onSaveEdit,
      onDelete,
    } = this.props;

    return (
      <div className="space-y-5">
        <div className="rounded-3xl border border-zinc-200 bg-zinc-50 p-4">
          <div className="text-lg font-semibold text-zinc-900">เพิ่มหมวดหมู่ใหม่</div>
          <div className="mt-3 grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_auto] md:items-end">
            <label className="space-y-1">
              <div className="text-sm text-zinc-600">ชื่อหมวดหมู่</div>
              <input
                className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none"
                value={creatingCategory.name}
                onChange={(event) => onCreateFieldChange?.("name", event.target.value)}
              />
            </label>

            <label className="space-y-1">
              <div className="text-sm text-zinc-600">คำอธิบาย</div>
              <input
                className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none"
                value={creatingCategory.description}
                onChange={(event) => onCreateFieldChange?.("description", event.target.value)}
              />
            </label>

            <button
              type="button"
              className="rounded-xl bg-[#F4D03E] px-4 py-2 text-sm font-semibold text-zinc-900 disabled:opacity-50"
              onClick={onCreate}
              disabled={submittingId === "create"}
            >
              เพิ่มหมวดหมู่
            </button>
          </div>
        </div>

        {!categories?.length ? (
          <EmptyState message="ยังไม่มีหมวดหมู่ในระบบ" />
        ) : (
          <div className="space-y-3">
            {categories.map((category) => {
              const isEditing = editingCategoryId === category.id;
              const isSubmitting = submittingId === category.id;
              const draft = isEditing ? editingCategoryDraft : category;

              return (
                <article key={category.id} className="rounded-3xl border border-zinc-200 p-4">
                  <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto]">
                    <div className="grid gap-3 md:grid-cols-2">
                      <label className="space-y-1">
                        <div className="text-sm text-zinc-600">ชื่อหมวดหมู่</div>
                        <input
                          className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none disabled:bg-zinc-50"
                          value={draft.name}
                          disabled={!isEditing}
                          onChange={(event) => onEditFieldChange?.("name", event.target.value)}
                        />
                      </label>

                      <div className="rounded-2xl bg-zinc-50 px-3 py-2 text-sm text-zinc-600">
                        จำนวนประกาศที่ใช้หมวดนี้: <span className="font-semibold text-zinc-900">{category.productCount}</span>
                      </div>

                      <label className="space-y-1 md:col-span-2">
                        <div className="text-sm text-zinc-600">คำอธิบาย</div>
                        <input
                          className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none disabled:bg-zinc-50"
                          value={draft.description}
                          disabled={!isEditing}
                          onChange={(event) => onEditFieldChange?.("description", event.target.value)}
                        />
                      </label>
                    </div>

                    <div className="grid gap-2 sm:grid-cols-3 lg:min-w-72">
                      {isEditing ? (
                        <>
                          <button
                            type="button"
                            className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                            onClick={onSaveEdit}
                            disabled={isSubmitting}
                          >
                            บันทึก
                          </button>
                          <button
                            type="button"
                            className="rounded-xl border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700"
                            onClick={onCancelEdit}
                            disabled={isSubmitting}
                          >
                            ยกเลิก
                          </button>
                          <button
                            type="button"
                            className="rounded-xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-700"
                            onClick={() => onDelete?.(category)}
                            disabled={isSubmitting}
                          >
                            ลบ
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            className="rounded-xl border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700"
                            onClick={() => onStartEdit?.(category)}
                            disabled={Boolean(editingCategoryId)}
                          >
                            แก้ไข
                          </button>
                          <button
                            type="button"
                            className="rounded-xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-700"
                            onClick={() => onDelete?.(category)}
                            disabled={Boolean(editingCategoryId) || isSubmitting}
                          >
                            ลบ
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    );
  }
}

class EmptyState extends React.Component {
  render() {
    return (
      <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 p-8 text-center text-sm text-zinc-500">
        {this.props.message}
      </div>
    );
  }
}
