const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export class AdminDashboardSummary {
  constructor({ newMembersCount, productAnnouncementsCount, successfulExchangesCount, pendingKycCount, openReportsCount } = {}) {
    this.newMembersCount = toNumber(newMembersCount, 0);
    this.productAnnouncementsCount = toNumber(productAnnouncementsCount, 0);
    this.successfulExchangesCount = toNumber(successfulExchangesCount, 0);
    this.pendingKycCount = toNumber(pendingKycCount, 0);
    this.openReportsCount = toNumber(openReportsCount, 0);

    this.newUsers = this.newMembersCount;
    this.activeProducts = this.productAnnouncementsCount;
    this.completedOrders = this.successfulExchangesCount;
    this.pendingKyc = this.pendingKycCount;
    this.openReports = this.openReportsCount;
  }

  static fromJSON(json) {
    return new AdminDashboardSummary({
      newMembersCount: json?.newMembersCount ?? json?.newUsers,
      productAnnouncementsCount: json?.productAnnouncementsCount ?? json?.activeProducts,
      successfulExchangesCount: json?.successfulExchangesCount ?? json?.completedOrders,
      pendingKycCount: json?.pendingKycCount ?? json?.pendingKyc,
      openReportsCount: json?.openReportsCount ?? json?.openReports,
    });
  }
}
