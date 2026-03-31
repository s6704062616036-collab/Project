import { HttpClient } from "./HttpClient";
import { AdminDashboardSummary } from "../models/AdminDashboardSummary";
import { AdminMember } from "../models/AdminMember";
import { AdminProductReport } from "../models/AdminProductReport";
import { AdminManagedProduct } from "../models/AdminManagedProduct";
import { AdminCategory } from "../models/AdminCategory";
import { ProductCategory } from "../models/ProductCategory";

const ensureArray = (value) => (Array.isArray(value) ? value : []);

const getByPath = (source, path = []) =>
  ensureArray(path).reduce(
    (current, key) => (current && typeof current === "object" ? current[key] : undefined),
    source,
  );

const pickFirstDefined = (source, paths = []) => {
  for (const path of paths) {
    const value = getByPath(source, path);
    if (value !== undefined && value !== null) return value;
  }
  return undefined;
};

const pickArray = (source, paths = []) => {
  const value = pickFirstDefined(source, paths);
  return Array.isArray(value) ? value : [];
};

const extractMessage = (payload, fallbackMessage) =>
  pickFirstDefined(payload, [
    ["message"],
    ["data", "message"],
    ["meta", "message"],
    ["result", "message"],
  ]) ?? fallbackMessage;

const looksLikeAdminMemberPayload = (payload) =>
  Boolean(
    payload &&
      typeof payload === "object" &&
      (
        payload?.id ||
        payload?._id ||
        payload?.memberId ||
        payload?.userId ||
        payload?.ownerId ||
        payload?.member ||
        payload?.user ||
        payload?.shop ||
        payload?.shopProfile ||
        payload?.merchant ||
        payload?.pendingSubmission ||
        payload?.pendingKycSubmission ||
        payload?.kycSubmission ||
        payload?.submission
      ),
  );

const extractAdminMembers = (payload) => {
  if (Array.isArray(payload)) {
    return payload.filter((item) => looksLikeAdminMemberPayload(item)).map((item) => AdminMember.fromJSON(item));
  }

  if (!payload || typeof payload !== "object") {
    return [];
  }

  const memberArrays = [
    pickArray(payload, [["members"], ["items"], ["results"], ["data", "members"], ["data", "items"], ["data", "results"]]),
    pickArray(payload, [["submissions"], ["kycSubmissions"], ["reviews"], ["data", "submissions"], ["data", "kycSubmissions"], ["data", "reviews"]]),
  ]
    .flat()
    .filter((item) => looksLikeAdminMemberPayload(item));

  if (memberArrays.length) {
    return memberArrays.map((item) => AdminMember.fromJSON(item));
  }

  if (looksLikeAdminMemberPayload(payload)) {
    return [AdminMember.fromJSON(payload)];
  }

  const singlePayload = pickFirstDefined(payload, [
    ["member"],
    ["user"],
    ["submission"],
    ["kycSubmission"],
    ["review"],
    ["data", "member"],
    ["data", "submission"],
    ["data", "review"],
  ]);

  return looksLikeAdminMemberPayload(singlePayload) ? [AdminMember.fromJSON(singlePayload)] : [];
};

const mergeAdminMembers = (baseMembers = [], extraMembers = []) => {
  const mergedMap = new Map();

  [...baseMembers, ...extraMembers].forEach((member) => {
    const existing = mergedMap.get(member.id);
    if (!existing) {
      mergedMap.set(member.id, member);
      return;
    }

    mergedMap.set(
      member.id,
      new AdminMember({
        ...existing,
        ...member,
        name: member.name || existing.name,
        email: member.email || existing.email,
        phone: member.phone || existing.phone,
        avatarUrl: member.avatarUrl || existing.avatarUrl,
        username: member.username || existing.username,
        role: member.role || existing.role,
        banStatus: member.banStatus || existing.banStatus,
        shopId: member.shopId || existing.shopId,
        shopName: member.shopName || existing.shopName,
        shopDescription: member.shopDescription || existing.shopDescription,
        citizenId: member.citizenId || existing.citizenId,
        kycCitizenId: member.kycCitizenId || existing.kycCitizenId,
        kycQrCodeUrl: member.kycQrCodeUrl || existing.kycQrCodeUrl,
        kycDocumentUrl: member.kycDocumentUrl || existing.kycDocumentUrl,
        kycStatus: member.kycStatus !== "unsubmitted" ? member.kycStatus : existing.kycStatus,
        hasPendingKycSubmission: member.hasPendingKycSubmission || existing.hasPendingKycSubmission,
        moderationNote: member.moderationNote || existing.moderationNote,
        createdAt: member.createdAt || existing.createdAt,
        reviewedAt: member.reviewedAt || existing.reviewedAt,
        kycSubmittedAt: member.kycSubmittedAt || existing.kycSubmittedAt,
        kycApprovedAt: member.kycApprovedAt || existing.kycApprovedAt,
      }),
    );
  });

  return [...mergedMap.values()];
};

const toSortableTime = (value) => {
  const parsed = new Date(value ?? "").getTime();
  return Number.isFinite(parsed) ? parsed : 0;
};

const sortAdminMembers = (members = []) =>
  [...members].sort((left, right) => {
    const leftPending = left?.kycStatus === "pending" ? 1 : 0;
    const rightPending = right?.kycStatus === "pending" ? 1 : 0;
    if (rightPending !== leftPending) {
      return rightPending - leftPending;
    }

    const submittedDiff = toSortableTime(right?.kycSubmittedAt) - toSortableTime(left?.kycSubmittedAt);
    if (submittedDiff !== 0) {
      return submittedDiff;
    }

    return toSortableTime(right?.createdAt) - toSortableTime(left?.createdAt);
  });

export class AdminService {
  static #instance = null;

  static instance() {
    if (!AdminService.#instance) AdminService.#instance = new AdminService();
    return AdminService.#instance;
  }

  constructor() {
    this.http = new HttpClient({ baseUrl: import.meta.env.VITE_API_URL ?? "" });
  }

  async getDashboardSummary() {
    const result = await this.http.get("/api/admin/dashboard");
    return {
      summary: AdminDashboardSummary.fromJSON(
        pickFirstDefined(result, [
          ["summary"],
          ["dashboard"],
          ["data", "summary"],
          ["data", "dashboard"],
          ["data"],
        ]),
      ),
    };
  }

  async listMembers() {
    const result = await this.http.get("/api/admin/members");
    const baseMembers = extractAdminMembers(result);
    const optionalKycPaths = [
      "/api/admin/kyc-submissions",
      "/api/admin/kyc/pending",
      "/api/admin/kyc/reviews",
    ];

    let mergedMembers = baseMembers;

    for (const path of optionalKycPaths) {
      try {
        const kycResult = await this.http.get(path);
        const kycMembers = extractAdminMembers(kycResult);
        if (kycMembers.length) {
          mergedMembers = mergeAdminMembers(mergedMembers, kycMembers);
          break;
        }
      } catch {
        // ignore optional endpoint for compatibility with existing mock/backend implementations
      }
    }

    return { members: sortAdminMembers(mergedMembers) };
  }

  async reviewMember(memberId, payload = {}) {
    const normalizedId = `${memberId ?? ""}`.trim();
    if (!normalizedId) throw new Error("ไม่พบรหัสสมาชิก");

    const result = await this.http.post(
      `/api/admin/members/${encodeURIComponent(normalizedId)}/decision`,
      payload,
    );

    return {
      member: (() => {
        const memberPayload = pickFirstDefined(result, [
          ["member"],
          ["reviewedMember"],
          ["data", "member"],
          ["data", "reviewedMember"],
        ]);
        return memberPayload ? AdminMember.fromJSON(memberPayload) : null;
      })(),
      message: extractMessage(result, "อัปเดตสถานะสมาชิกแล้ว"),
    };
  }

  async listReports() {
    const result = await this.http.get("/api/admin/reports");
    return {
      reports: pickArray(result, [
        ["reports"],
        ["items"],
        ["data", "reports"],
        ["data", "items"],
        ["result", "reports"],
      ]).map((item) => AdminProductReport.fromJSON(item)),
    };
  }

  async reviewReport(reportId, payload = {}) {
    const normalizedId = `${reportId ?? ""}`.trim();
    if (!normalizedId) throw new Error("ไม่พบรหัสรายงาน");

    const result = await this.http.post(
      `/api/admin/reports/${encodeURIComponent(normalizedId)}/decision`,
      payload,
    );

    return {
      report: (() => {
        const reportPayload = pickFirstDefined(result, [
          ["report"],
          ["reviewedReport"],
          ["data", "report"],
          ["data", "reviewedReport"],
        ]);
        return reportPayload ? AdminProductReport.fromJSON(reportPayload) : null;
      })(),
      deletedReportId:
        pickFirstDefined(result, [
          ["deletedReportId"],
          ["removedReportId"],
          ["data", "deletedReportId"],
          ["result", "deletedReportId"],
        ]) ?? "",
      message: extractMessage(result, "อัปเดตรายงานแล้ว"),
    };
  }

  async listProducts(search = "") {
    const query = `${search ?? ""}`.trim();
    const path = query
      ? `/api/admin/products?q=${encodeURIComponent(query)}`
      : "/api/admin/products";
    const result = await this.http.get(path);

    return {
      products: ensureArray(result?.products).map((item) => AdminManagedProduct.fromJSON(item)),
      totalCount: Number(result?.totalCount) || 0,
    };
  }

  async deleteProduct(productId, payload = {}) {
    const normalizedId = `${productId ?? ""}`.trim();
    if (!normalizedId) throw new Error("à¹„à¸¡à¹ˆà¸žà¸šà¸£à¸«à¸±à¸ªà¸ªà¸´à¸™à¸„à¹‰à¸²");

    const result = await this.http.request(
      `/api/admin/products/${encodeURIComponent(normalizedId)}`,
      { method: "DELETE", body: payload },
    );

    return {
      deletedProductId:
        pickFirstDefined(result, [
          ["deletedProductId"],
          ["data", "deletedProductId"],
          ["result", "deletedProductId"],
        ]) ?? normalizedId,
      product: result?.product ? AdminManagedProduct.fromJSON(result.product) : null,
      message: extractMessage(result, "à¸¥à¸šà¸ªà¸´à¸™à¸„à¹‰à¸²à¹à¸¥à¹‰à¸§"),
    };
  }

  async listCategories() {
    const result = await this.http.get("/api/admin/categories");
    const categories = ensureArray(result?.categories).map((item) => AdminCategory.fromJSON(item));
    ProductCategory.hydrateFromRecords(categories);
    return { categories };
  }

  async createCategory(payload = {}) {
    const result = await this.http.post("/api/admin/categories", payload);
    const categories = ensureArray(result?.categories).map((item) => AdminCategory.fromJSON(item));
    ProductCategory.hydrateFromRecords(categories);
    return {
      category: result?.category ? AdminCategory.fromJSON(result.category) : null,
      categories,
      message: result?.message ?? "เพิ่มหมวดหมู่แล้ว",
    };
  }

  async updateCategory(categoryId, payload = {}) {
    const normalizedId = `${categoryId ?? ""}`.trim();
    if (!normalizedId) throw new Error("ไม่พบรหัสหมวดหมู่");

    const result = await this.http.patch(
      `/api/admin/categories/${encodeURIComponent(normalizedId)}`,
      payload,
    );
    const categories = ensureArray(result?.categories).map((item) => AdminCategory.fromJSON(item));
    ProductCategory.hydrateFromRecords(categories);
    return {
      category: result?.category ? AdminCategory.fromJSON(result.category) : null,
      categories,
      message: result?.message ?? "แก้ไขหมวดหมู่แล้ว",
    };
  }

  async deleteCategory(categoryId) {
    const normalizedId = `${categoryId ?? ""}`.trim();
    if (!normalizedId) throw new Error("ไม่พบรหัสหมวดหมู่");

    const result = await this.http.request(
      `/api/admin/categories/${encodeURIComponent(normalizedId)}`,
      { method: "DELETE" },
    );
    const categories = ensureArray(result?.categories).map((item) => AdminCategory.fromJSON(item));
    ProductCategory.hydrateFromRecords(categories);
    return {
      categories,
      message: result?.message ?? "ลบหมวดหมู่แล้ว",
    };
  }
}
