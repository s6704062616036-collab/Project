const serializeUser = (user) => {
  if (!user) return null;

  const addresses = Array.isArray(user.addresses)
    ? user.addresses.map((entry, index) => ({
        id: entry?.id || `address-${index + 1}`,
        label: entry?.label ?? "",
        recipientName: entry?.recipientName ?? "",
        phone: entry?.phone ?? "",
        houseNo: entry?.houseNo ?? "",
        village: entry?.village ?? "",
        district: entry?.district ?? "",
        province: entry?.province ?? "",
        postalCode: entry?.postalCode ?? "",
        note: entry?.note ?? "",
        address: entry?.address ?? "",
        isDefault: Boolean(entry?.isDefault),
      }))
    : [];

  const primaryAddress =
    addresses.find((entry) => entry?.isDefault && `${entry?.address ?? ""}`.trim()) ||
    addresses.find((entry) => `${entry?.address ?? ""}`.trim());

  return {
    id: user._id?.toString?.() ?? user.id ?? "",
    username: user.username ?? "",
    name: user.name || user.username || "",
    email: user.email ?? "",
    phone: user.phone ?? "",
    address: primaryAddress?.address ?? user.address ?? "",
    addresses,
    avatarUrl: user.avatarUrl ?? "",
    role: user.role ?? "user",
    banStatus: user.banStatus ?? "active",
    reviewedAt: user.reviewedAt ?? null,
    moderationNote: user.moderationNote ?? "",
    createdAt: user.createdAt ?? null,
  };
};

module.exports = serializeUser;
