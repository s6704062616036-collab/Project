const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export class AdminDashboardSummary {
  constructor({
    totalMembersCount,
    newMembersCount,
    bannedMembersCount,
    productAnnouncementsCount,
    successfulExchangesCount,
    pendingKycCount,
    approvedKycCount,
    rejectedKycCount,
    openReportsCount,
  } = {}) {
    this.totalMembersCount = toNumber(totalMembersCount, 0);
    this.newMembersCount = toNumber(newMembersCount, 0);
    this.bannedMembersCount = toNumber(bannedMembersCount, 0);
    this.productAnnouncementsCount = toNumber(productAnnouncementsCount, 0);
    this.successfulExchangesCount = toNumber(successfulExchangesCount, 0);
    this.pendingKycCount = toNumber(pendingKycCount, 0);
    this.approvedKycCount = toNumber(approvedKycCount, 0);
    this.rejectedKycCount = toNumber(rejectedKycCount, 0);
    this.openReportsCount = toNumber(openReportsCount, 0);

    this.totalMembers = this.totalMembersCount;
    this.newUsers = this.newMembersCount;
    this.bannedMembers = this.bannedMembersCount;
    this.activeProducts = this.productAnnouncementsCount;
    this.completedOrders = this.successfulExchangesCount;
    this.pendingKyc = this.pendingKycCount;
    this.approvedKyc = this.approvedKycCount;
    this.rejectedKyc = this.rejectedKycCount;
    this.openReports = this.openReportsCount;
  }

  static fromJSON(json) {
    return new AdminDashboardSummary({
      totalMembersCount: json?.totalMembersCount ?? json?.totalMembers,
      newMembersCount: json?.newMembersCount ?? json?.newUsers,
      bannedMembersCount: json?.bannedMembersCount ?? json?.bannedMembers,
      productAnnouncementsCount: json?.productAnnouncementsCount ?? json?.activeProducts,
      successfulExchangesCount: json?.successfulExchangesCount ?? json?.completedOrders,
      pendingKycCount: json?.pendingKycCount ?? json?.pendingKyc,
      approvedKycCount: json?.approvedKycCount ?? json?.approvedKyc,
      rejectedKycCount: json?.rejectedKycCount ?? json?.rejectedKyc,
      openReportsCount: json?.openReportsCount ?? json?.openReports,
    });
  }
}
