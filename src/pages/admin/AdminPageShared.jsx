import React from "react";

export const SECTIONS = [
  { key: "dashboard", label: "Dashboard", description: "ภาพรวมของระบบผู้ดูแล" },
  { key: "members", label: "จัดการสมาชิก", description: "ตรวจสอบ KYC และสถานะบัญชีผู้ใช้" },
  { key: "reports", label: "จัดการเนื้อหา", description: "ตรวจสอบรายงานสินค้าและร้านค้าที่ถูกรายงาน" },
  { key: "products", label: "จัดการสินค้า", description: "ค้นหา ตรวจสอบ และลบสินค้าได้โดยตรง" },
  { key: "categories", label: "จัดการหมวดหมู่", description: "เพิ่ม แก้ไข และลบหมวดหมู่หลักของระบบ" },
];

export const VALID_SECTIONS = new Set(SECTIONS.map((item) => item.key));

export const SUMMARY_CARDS = [
  ["สมาชิกทั้งหมด", "totalMembers", "border-violet-200 bg-violet-50/80"],
  ["สมาชิกใหม่", "newUsers", "border-emerald-200 bg-emerald-50/80"],
  ["บัญชีถูกระงับ", "bannedMembers", "border-red-200 bg-red-50/80"],
  ["ประกาศสินค้า", "activeProducts", "border-amber-200 bg-amber-50/80"],
  ["แลกเปลี่ยนสำเร็จ", "completedOrders", "border-sky-200 bg-sky-50/80"],
  ["KYC รอตรวจ", "pendingKyc", "border-orange-200 bg-orange-50/80"],
  ["KYC อนุมัติแล้ว", "approvedKyc", "border-teal-200 bg-teal-50/80"],
  ["KYC ไม่ผ่าน", "rejectedKyc", "border-rose-200 bg-rose-50/80"],
  ["รายงานเปิดอยู่", "openReports", "border-rose-200 bg-rose-50/80"],
];

export const getSummaryValue = (summary, key) => {
  const source = summary && typeof summary === "object" ? summary : {};
  const aliases = {
    totalMembers: ["totalMembers", "totalMembersCount"],
    newUsers: ["newUsers", "newMembersCount"],
    bannedMembers: ["bannedMembers", "bannedMembersCount"],
    activeProducts: ["activeProducts", "productAnnouncementsCount"],
    completedOrders: ["completedOrders", "successfulExchangesCount"],
    pendingKyc: ["pendingKyc", "pendingKycCount"],
    approvedKyc: ["approvedKyc", "approvedKycCount"],
    rejectedKyc: ["rejectedKyc", "rejectedKycCount"],
    openReports: ["openReports", "openReportsCount"],
  };

  for (const candidateKey of aliases[key] ?? [key]) {
    const value = Number(source?.[candidateKey]);
    if (Number.isFinite(value)) {
      return value;
    }
  }

  return 0;
};

export const kycBadge = (status) => {
  if (status === "approved") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "rejected") return "border-red-200 bg-red-50 text-red-700";
  if (status === "pending") return "border-orange-200 bg-orange-50 text-orange-700";
  return "border-zinc-200 bg-zinc-50 text-zinc-600";
};

export const banBadge = (status) => {
  if (status === "banned") return "border-red-200 bg-red-50 text-red-700";
  return "border-emerald-200 bg-emerald-50 text-emerald-700";
};

export const bankMatchBadge = (matches) => {
  if (matches === true) return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (matches === false) return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-zinc-200 bg-zinc-50 text-zinc-600";
};

export const reportBadge = (status) => {
  if (status === "taken_down") return "border-red-200 bg-red-50 text-red-700";
  if (status === "dismissed") return "border-zinc-200 bg-zinc-50 text-zinc-600";
  return "border-orange-200 bg-orange-50 text-orange-700";
};

export const productBadge = (status) => {
  if (status === "sold") return "border-sky-200 bg-sky-50 text-sky-700";
  if (status === "inactive" || status === "removed") return "border-zinc-200 bg-zinc-50 text-zinc-600";
  return "border-emerald-200 bg-emerald-50 text-emerald-700";
};

export const EmptyState = ({ message }) => (
  <div className="rounded-3xl border border-dashed border-zinc-300 bg-zinc-50 p-10 text-center text-sm text-zinc-500">{message}</div>
);

export const SectionHeader = ({ title, description, right }) => (
  <div className="mb-5 flex flex-col gap-3 border-b border-zinc-100 pb-4 md:flex-row md:items-start md:justify-between">
    <div>
      <div className="text-2xl font-semibold tracking-tight text-zinc-900">{title}</div>
      <div className="mt-1 text-sm text-zinc-500">{description}</div>
    </div>
    {right ? <div className="shrink-0">{right}</div> : null}
  </div>
);

export const AdminSummaryGrid = ({ summary, className = "" }) => (
  <div className={`grid gap-4 md:grid-cols-2 xl:grid-cols-3 ${className}`.trim()}>
    {SUMMARY_CARDS.map(([label, key, cardClassName]) => (
      <div key={label} className={`rounded-3xl border p-4 shadow-sm ${cardClassName}`}>
        <div className="text-sm font-medium text-zinc-500">{label}</div>
        <div className="mt-3 text-4xl font-semibold tracking-tight text-zinc-900">{getSummaryValue(summary, key)}</div>
      </div>
    ))}
  </div>
);

export const AdminSidebarNav = ({ activeSection, onSelect }) => (
  <aside className="rounded-[28px] border border-zinc-200 bg-white p-3 shadow-sm">
    <div className="px-3 pb-3 text-sm font-semibold text-zinc-900">เมนูผู้ดูแลระบบ</div>
    <div className="space-y-2">
      {SECTIONS.map((item) => {
        const active = item.key === activeSection;
        return (
          <button
            key={item.key}
            type="button"
            onClick={() => onSelect(item.key)}
            aria-pressed={active}
            className={`flex h-[96px] w-full flex-col justify-center overflow-hidden rounded-2xl border px-3 py-3 text-left transition ${
              active
                ? "border-amber-300 bg-[#F4D03E] text-zinc-900 shadow-sm"
                : "border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-zinc-100"
            }`}
          >
            <div className="font-semibold leading-tight">{item.label}</div>
            <div className={`mt-1 line-clamp-2 h-8 overflow-hidden text-xs leading-4 ${active ? "text-zinc-700" : "text-zinc-500"}`}>
              {item.description}
            </div>
          </button>
        );
      })}
    </div>
  </aside>
);
