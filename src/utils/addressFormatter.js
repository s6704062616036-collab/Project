const safeText = (value) => `${value ?? ""}`.trim();

export const composeStructuredAddress = (entry = {}) => {
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

export const getAddressFieldLine = (entry = {}) =>
  [safeText(entry.houseNo) && `บ้านเลขที่ ${safeText(entry.houseNo)}`, safeText(entry.village) && `หมู่ ${safeText(entry.village)}`]
    .filter(Boolean)
    .join(" ");

export const getAddressLocationLine = (entry = {}) =>
  [
    safeText(entry.district) && `อำเภอ/เขต ${safeText(entry.district)}`,
    safeText(entry.province) && `จังหวัด ${safeText(entry.province)}`,
    safeText(entry.postalCode),
  ]
    .filter(Boolean)
    .join(" ");
