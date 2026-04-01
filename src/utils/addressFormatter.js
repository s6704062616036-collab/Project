const safeText = (value) => `${value ?? ""}`.trim();

const composeStructuredAddress = (entry = {}) => {
  const houseNo = safeText(entry.houseNo);
  const village = safeText(entry.village);
  const district = safeText(entry.district);
  const province = safeText(entry.province);
  const postalCode = safeText(entry.postalCode);
  const note = safeText(entry.note);

  const lines = [
    [houseNo && `บ้านเลขที่ ${houseNo}`, village && `หมู่ ${village}`].filter(Boolean).join(" "),
    [district && `อำเภอ/เขต ${district}`, province && `จังหวัด ${province}`, postalCode].filter(Boolean).join(" "),
    note,
  ]
    .map((line) => safeText(line))
    .filter(Boolean);

  return lines.join("\n");
};

module.exports = {
  safeText,
  composeStructuredAddress,
};
