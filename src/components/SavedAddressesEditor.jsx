import React from "react";
import {
  composeStructuredAddress,
  getAddressFieldLine,
  getAddressLocationLine,
} from "../utils/addressFormatter";

const makeId = (index = 0) =>
  `address_${Date.now()}_${index}_${Math.random().toString(36).slice(2, 8)}`;

const normalizeLabel = (value) => `${value ?? ""}`.trim().slice(0, 50);
const normalizeText = (value, limit = 120) => `${value ?? ""}`.trim().slice(0, limit);
const normalizePostalCode = (value) =>
  `${value ?? ""}`
    .replace(/\D+/g, "")
    .slice(0, 5);

const normalizeEntry = (entry, index = 0, defaults = {}) => {
  const houseNo = normalizeText(entry?.houseNo, 120);
  const village = normalizeText(entry?.village, 120);
  const subdistrict = normalizeText(entry?.subdistrict, 120);
  const district = normalizeText(entry?.district, 120);
  const province = normalizeText(entry?.province, 120);
  const postalCode = normalizePostalCode(entry?.postalCode);
  const note = normalizeText(entry?.note, 300);
  const fallbackAddress = normalizeText(entry?.address, 300);
  const address =
    composeStructuredAddress({ houseNo, village, subdistrict, district, province, postalCode, note }) ||
    fallbackAddress;

  return {
    id: `${entry?.id ?? ""}`.trim() || makeId(index),
    label: normalizeLabel(entry?.label),
    recipientName: normalizeText(entry?.recipientName ?? defaults.name, 120),
    phone: normalizeText(entry?.phone ?? defaults.phone, 40),
    houseNo,
    village,
    subdistrict,
    district,
    province,
    postalCode,
    note,
    address,
    isDefault: Boolean(entry?.isDefault),
  };
};

const normalizeAddresses = (addresses = [], defaults = {}) => {
  const normalized = (Array.isArray(addresses) ? addresses : [])
    .map((entry, index) => normalizeEntry(entry, index, defaults))
    .slice(0, 5);

  if (!normalized.length) {
    return [normalizeEntry({}, 0, defaults)];
  }

  const defaultIndex = normalized.findIndex((entry) => entry.isDefault);
  normalized.forEach((entry, index) => {
    entry.isDefault = index === (defaultIndex >= 0 ? defaultIndex : 0);
  });
  return normalized;
};

export class SavedAddressesEditor extends React.Component {
  updateAddresses(updater) {
    const defaults = {
      name: `${this.props.defaultName ?? ""}`.trim(),
      phone: `${this.props.defaultPhone ?? ""}`.trim(),
    };
    const currentAddresses = normalizeAddresses(this.props.addresses, defaults);
    const nextAddresses = normalizeAddresses(
      typeof updater === "function" ? updater(currentAddresses) : updater,
      defaults,
    );
    this.props.onChange?.(nextAddresses);
  }

  addAddress = () => {
    this.updateAddresses((addresses) => {
      if (addresses.length >= 5) return addresses;
      return [
        ...addresses,
        normalizeEntry(
          {},
          addresses.length,
          {
            name: this.props.defaultName,
            phone: this.props.defaultPhone,
          },
        ),
      ];
    });
  };

  removeAddress = (addressId) => {
    this.updateAddresses((addresses) => {
      const remaining = addresses.filter((entry) => entry.id !== addressId);
      return remaining.length
        ? remaining
        : [
            normalizeEntry(
              {},
              0,
              {
                name: this.props.defaultName,
                phone: this.props.defaultPhone,
              },
            ),
          ];
    });
  };

  patchAddress = (addressId, patch = {}) => {
    this.updateAddresses((addresses) =>
      addresses.map((entry) =>
        entry.id === addressId
          ? normalizeEntry(
              {
                ...entry,
                ...patch,
              },
              0,
              {
                name: this.props.defaultName,
                phone: this.props.defaultPhone,
              },
            )
          : entry,
      ),
    );
  };

  setDefaultAddress = (addressId) => {
    this.updateAddresses((addresses) =>
      addresses.map((entry) => ({
        ...entry,
        isDefault: entry.id === addressId,
      })),
    );
  };

  renderAddressSummary(entry, index) {
    const fieldLine = getAddressFieldLine(entry);
    const locationLine = getAddressLocationLine(entry);

    return (
      <div className="space-y-1">
        <div className="min-w-0 break-all py-0.5 text-sm font-semibold leading-7 text-zinc-800">
          {entry.label || `ที่อยู่ ${index + 1}`}
        </div>
        {fieldLine ? <div className="text-xs leading-6 text-zinc-500">{fieldLine}</div> : null}
        {locationLine ? <div className="text-xs leading-6 text-zinc-500">{locationLine}</div> : null}
      </div>
    );
  }

  render() {
    const defaults = {
      name: `${this.props.defaultName ?? ""}`.trim(),
      phone: `${this.props.defaultPhone ?? ""}`.trim(),
    };
    const addresses = normalizeAddresses(this.props.addresses, defaults);

    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-2xl font-semibold text-zinc-800">ที่อยู่จัดส่ง</div>
            <div className="text-sm leading-6 text-zinc-500">
              บันทึกได้สูงสุด 5 ที่อยู่ และเลือกค่าเริ่มต้นสำหรับการสั่งซื้อ
            </div>
          </div>
          <button
            type="button"
            className="rounded-xl border border-zinc-200 px-3 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
            onClick={this.addAddress}
            disabled={addresses.length >= 5}
          >
            เพิ่มที่อยู่
          </button>
        </div>

        <div className="space-y-3">
          {addresses.map((entry, index) => (
            <div key={entry.id} className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1 space-y-2">
                  {this.renderAddressSummary(entry, index)}
                  <label className="flex items-center gap-2 py-0.5 text-xs leading-6 text-zinc-600">
                    <input
                      type="radio"
                      name="default-address"
                      checked={Boolean(entry.isDefault)}
                      onChange={() => this.setDefaultAddress(entry.id)}
                    />
                    ใช้เป็นที่อยู่หลัก
                  </label>
                </div>
                <button
                  type="button"
                  className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                  onClick={() => this.removeAddress(entry.id)}
                  disabled={addresses.length <= 1}
                >
                  ลบ
                </button>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <AddressField
                  label="ชื่อป้ายกำกับ"
                  value={entry.label}
                  maxLength={50}
                  onChange={(value) => this.patchAddress(entry.id, { label: normalizeLabel(value) })}
                />
                <AddressField
                  label="ชื่อผู้รับ"
                  value={entry.recipientName}
                  maxLength={120}
                  onChange={(value) => this.patchAddress(entry.id, { recipientName: normalizeText(value, 120) })}
                />
                <AddressField
                  label="เบอร์โทรปลายทาง"
                  value={entry.phone}
                  maxLength={40}
                  onChange={(value) => this.patchAddress(entry.id, { phone: normalizeText(value, 40) })}
                />
                <AddressField
                  label="บ้านเลขที่"
                  value={entry.houseNo}
                  maxLength={120}
                  onChange={(value) => this.patchAddress(entry.id, { houseNo: normalizeText(value, 120) })}
                />
                <AddressField
                  label="หมู่"
                  value={entry.village}
                  maxLength={120}
                  onChange={(value) => this.patchAddress(entry.id, { village: normalizeText(value, 120) })}
                />
                <AddressField
                  label="ตำบล / แขวง"
                  value={entry.subdistrict}
                  maxLength={120}
                  onChange={(value) => this.patchAddress(entry.id, { subdistrict: normalizeText(value, 120) })}
                />
                <AddressField
                  label="อำเภอ / เขต"
                  value={entry.district}
                  maxLength={120}
                  onChange={(value) => this.patchAddress(entry.id, { district: normalizeText(value, 120) })}
                />
                <AddressField
                  label="จังหวัด"
                  value={entry.province}
                  maxLength={120}
                  onChange={(value) => this.patchAddress(entry.id, { province: normalizeText(value, 120) })}
                />
                <AddressField
                  label="รหัสไปรษณีย์"
                  value={entry.postalCode}
                  inputMode="numeric"
                  maxLength={5}
                  onChange={(value) => this.patchAddress(entry.id, { postalCode: normalizePostalCode(value) })}
                />
                <AddressTextarea
                  label="รายละเอียดเพิ่มเติม"
                  value={entry.note}
                  onChange={(value) => this.patchAddress(entry.id, { note: normalizeText(value, 300) })}
                  full
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }
}

class AddressField extends React.Component {
  render() {
    const { label, value, onChange, maxLength, inputMode } = this.props;
    return (
      <label className="space-y-1">
        <div className="py-0.5 text-sm font-medium leading-6 text-zinc-600">{label}</div>
        <input
          className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm leading-6 outline-none"
          value={value ?? ""}
          maxLength={maxLength}
          inputMode={inputMode}
          onChange={(e) => onChange?.(e.target.value)}
        />
      </label>
    );
  }
}

class AddressTextarea extends React.Component {
  render() {
    const { label, value, onChange, full } = this.props;
    return (
      <label className={`space-y-1 ${full ? "md:col-span-2" : ""}`}>
        <div className="py-0.5 text-sm font-medium leading-6 text-zinc-600">{label}</div>
        <textarea
          className="min-h-24 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm leading-6 outline-none"
          value={value ?? ""}
          onChange={(e) => onChange?.(e.target.value)}
        />
      </label>
    );
  }
}
