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
  }

  static fromJSON(json) {
    return new AdminDashboardSummary({
      newMembersCount: json?.newMembersCount,
      productAnnouncementsCount: json?.productAnnouncementsCount,
      successfulExchangesCount: json?.successfulExchangesCount,
      pendingKycCount: json?.pendingKycCount,
      openReportsCount: json?.openReportsCount,
    });
  }
}
