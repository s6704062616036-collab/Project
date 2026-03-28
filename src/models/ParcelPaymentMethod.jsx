const safeText = (value) => `${value ?? ""}`.trim().toLowerCase();

export class ParcelPaymentMethod {
  static QR_CODE = "qr_code";
  static CASH_ON_DELIVERY = "cash_on_delivery";

  static normalize(value) {
    const normalized = safeText(value);

    if (
      [
        "cod",
        "cash_on_delivery",
        "cash-on-delivery",
        "cash on delivery",
        "collect_on_delivery",
        "cashondelivery",
      ].includes(normalized)
    ) {
      return ParcelPaymentMethod.CASH_ON_DELIVERY;
    }

    return ParcelPaymentMethod.QR_CODE;
  }

  static list() {
    return [ParcelPaymentMethod.QR_CODE, ParcelPaymentMethod.CASH_ON_DELIVERY];
  }

  static isQrCode(value) {
    return ParcelPaymentMethod.normalize(value) === ParcelPaymentMethod.QR_CODE;
  }

  static isCashOnDelivery(value) {
    return ParcelPaymentMethod.normalize(value) === ParcelPaymentMethod.CASH_ON_DELIVERY;
  }

  static requiresReceipt(value) {
    return ParcelPaymentMethod.isQrCode(value);
  }

  static requiresSellerQrCode(value) {
    return ParcelPaymentMethod.isQrCode(value);
  }

  static getLabel(value) {
    if (ParcelPaymentMethod.isCashOnDelivery(value)) {
      return "เก็บเงินปลายทาง (ไม่ใช้ใบเสร็จ)";
    }
    return "ชำระเงินด้วย QR code";
  }

  static getDescription(value) {
    if (ParcelPaymentMethod.isCashOnDelivery(value)) {
      return "จะส่งคำสั่งซื้อให้ร้านค้าตรวจสอบก่อน";
    }
    return "โอนผ่าน QR ร้านค้า แล้วแนบใบเสร็จเพื่อส่งให้ร้านค้าตรวจสอบ";
  }
}
