const safeText = (value) => `${value ?? ""}`.trim().toLowerCase();

export class ParcelPaymentMethod {
  static QR_CODE = "qr_code";
  static BANK_TRANSFER = "bank_transfer";
  static CASH_ON_DELIVERY = "cash_on_delivery";

  static normalize(value) {
    const normalized = safeText(value);

    if (["bank_transfer", "bank-transfer", "bank transfer", "transfer", "bank"].includes(normalized)) {
      return ParcelPaymentMethod.BANK_TRANSFER;
    }

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
    return [
      ParcelPaymentMethod.QR_CODE,
      ParcelPaymentMethod.BANK_TRANSFER,
      ParcelPaymentMethod.CASH_ON_DELIVERY,
    ];
  }

  static isQrCode(value) {
    return ParcelPaymentMethod.normalize(value) === ParcelPaymentMethod.QR_CODE;
  }

  static isBankTransfer(value) {
    return ParcelPaymentMethod.normalize(value) === ParcelPaymentMethod.BANK_TRANSFER;
  }

  static isCashOnDelivery(value) {
    return ParcelPaymentMethod.normalize(value) === ParcelPaymentMethod.CASH_ON_DELIVERY;
  }

  static requiresReceipt(value) {
    return ParcelPaymentMethod.isQrCode(value) || ParcelPaymentMethod.isBankTransfer(value);
  }

  static requiresSellerQrCode(value) {
    return ParcelPaymentMethod.isQrCode(value);
  }

  static requiresSellerBankAccount(value) {
    return ParcelPaymentMethod.isBankTransfer(value);
  }

  static getLabel(value) {
    if (ParcelPaymentMethod.isCashOnDelivery(value)) {
      return "เก็บเงินปลายทาง (ไม่ใช้ใบเสร็จ)";
    }
    if (ParcelPaymentMethod.isBankTransfer(value)) {
      return "โอนเข้าบัญชีธนาคาร";
    }
    return "ชำระเงินด้วย QR code";
  }

  static getDescription(value) {
    if (ParcelPaymentMethod.isCashOnDelivery(value)) {
      return "จะส่งคำสั่งซื้อให้ร้านค้าตรวจสอบก่อน";
    }
    if (ParcelPaymentMethod.isBankTransfer(value)) {
      return "โอนเข้าบัญชีของร้านแล้วแนบสลิปเพื่อส่งให้ร้านค้าตรวจสอบ";
    }
    return "โอนผ่าน QR ของร้านแล้วแนบสลิปเพื่อส่งให้ร้านค้าตรวจสอบ";
  }
}
