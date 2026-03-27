import React from "react";

const getStatusBadgeClassName = (status) => {
  switch (`${status ?? ""}`.trim()) {
    case "awaiting_parcel_pickup":
      return "border-sky-200 bg-sky-50 text-sky-700";
    case "reported_to_admin":
      return "border-rose-200 bg-rose-50 text-rose-700";
    case "completed":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "rejected_by_buyer":
      return "border-red-200 bg-red-50 text-red-700";
    default:
      return "border-amber-200 bg-amber-50 text-amber-700";
  }
};

export class ShopParcelPaymentVerificationPanel extends React.Component {
  render() {
    const { reviews, loading, error, done, onRefresh, onOpenReview } = this.props;
    const hasReviews = Array.isArray(reviews) && reviews.length > 0;

    return (
      <section className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-base font-semibold text-zinc-900">ตรวจสอบการชำระเงิน</div>
            <div className="text-sm text-zinc-500">
              โครงสำหรับคำสั่งซื้อแบบส่งพัสดุที่ผู้ซื้อแนบใบเสร็จเข้ามาให้ร้านค้าตรวจสอบ
            </div>
          </div>
          <button
            type="button"
            className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
            onClick={onRefresh}
            disabled={loading}
          >
            รีเฟรชรายการ
          </button>
        </div>

        {loading ? <div className="text-sm text-zinc-500">กำลังโหลดรายการตรวจสอบการชำระ...</div> : null}
        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
        ) : null}
        {done ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{done}</div>
        ) : null}

        {!loading && !hasReviews ? (
          <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-6 text-center text-sm text-zinc-500">
            ยังไม่มีคำสั่งซื้อแบบส่งพัสดุที่ต้องตรวจสอบ
          </div>
        ) : null}

        {!loading && hasReviews ? (
          <div className="grid gap-3 lg:grid-cols-2">
            {reviews.map((review) => (
              <article key={`${review.orderId}-${review.getIdentityKey?.() ?? review.shopOrderKey}`} className="rounded-2xl border border-zinc-200 bg-white p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-zinc-900">คำสั่งซื้อ #{review.orderId}</div>
                    <div className="truncate text-xs text-zinc-500">{review.buyerName || "ผู้ซื้อ"}</div>
                  </div>
                  <StatusBadge status={review.status} label={review.getStatusLabel?.() ?? "รอดำเนินการ"} />
                </div>

                <div className="grid gap-2 text-sm text-zinc-700 sm:grid-cols-2">
                  <div className="rounded-xl bg-zinc-50 px-3 py-2">
                    ผู้ซื้อ: {review.getBuyerLine?.() || review.buyerName || "-"}
                  </div>
                  <div className="rounded-xl bg-zinc-50 px-3 py-2">
                    ส่งข้อมูลเมื่อ: {review.getSubmittedAtLabel?.() ?? "-"}
                  </div>
                </div>

                <div className="rounded-xl bg-zinc-50 px-3 py-2 text-sm text-zinc-700">
                  {review.items?.length ?? 0} รายการ • ยอดรวม {review.getSubtotalLabel?.() ?? "฿0.00"}
                </div>

                <div className="flex items-center justify-between gap-3">
                  <div className="text-xs text-zinc-500">
                    {review.hasAdminReport?.()
                      ? "มีการรายงานไปยัง Admin แล้ว"
                      : review.canReview?.()
                        ? "พร้อมตรวจสอบสลิปการชำระ"
                        : "ดูรายละเอียดคำสั่งซื้อได้จาก popup"}
                  </div>
                  <button
                    type="button"
                    className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white"
                    onClick={() => onOpenReview?.(review)}
                  >
                    ตรวจสอบการชำระ
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : null}
      </section>
    );
  }
}

export class ShopParcelPaymentVerificationModal extends React.Component {
  state = {
    reportNote: "",
  };

  componentDidMount() {
    this.syncStateFromReview(this.props.review);
  }

  componentDidUpdate(prevProps) {
    const prevIdentity = `${prevProps.review?.orderId ?? ""}:${prevProps.review?.shopOrderKey ?? ""}`;
    const nextIdentity = `${this.props.review?.orderId ?? ""}:${this.props.review?.shopOrderKey ?? ""}`;

    if (prevIdentity !== nextIdentity) {
      this.syncStateFromReview(this.props.review);
    }
  }

  syncStateFromReview(review) {
    this.setState({
      reportNote: review?.adminReport?.reason ?? "",
    });
  }

  stop = (event) => {
    event.stopPropagation();
  };

  setReportNote = (event) => {
    this.setState({ reportNote: event.target.value });
  };

  submitAction = (action) => {
    this.props.onSubmitDecision?.({
      action,
      note: this.state.reportNote,
    });
  };

  render() {
    const { review, submitting, error, onClose } = this.props;
    const { reportNote } = this.state;

    if (!review) return null;

    return (
      <div className="fixed inset-0 z-[70] bg-black/40 p-4 overflow-y-auto" onClick={onClose}>
        <div className="mx-auto my-4 w-full max-w-4xl" onClick={this.stop}>
          <div className="rounded-3xl bg-white shadow-xl border border-zinc-200 p-4 md:p-6 space-y-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="text-xl font-semibold text-zinc-900">ตรวจสอบการชำระเงิน</div>
                <div className="text-sm text-zinc-500">
                  คำสั่งซื้อ #{review.orderId} • {review.shopName || "ร้านค้า"}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge status={review.status} label={review.getStatusLabel?.() ?? "รอดำเนินการ"} />
                <button
                  type="button"
                  className="grid h-10 w-10 place-items-center rounded-xl border border-zinc-200"
                  onClick={onClose}
                  title="ปิด"
                >
                  ✕
                </button>
              </div>
            </div>

            {error ? (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
            ) : null}

            {review.hasAdminReport?.() ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
                รายการนี้ถูกส่งให้ Admin ตรวจสอบแล้ว
                {review.adminReport?.reason ? `: ${review.adminReport.reason}` : ""}
              </div>
            ) : null}

            {!review.canReview?.() && !review.hasAdminReport?.() ? (
              <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-800">
                คำสั่งซื้อนี้ผ่านการตรวจสอบแล้ว และอยู่ในสถานะ {review.getStatusLabel?.() ?? "รอดำเนินการ"}
              </div>
            ) : null}

            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
              <div className="space-y-4">
                <section className="rounded-2xl bg-zinc-50 p-4 space-y-3">
                  <div className="text-sm font-semibold text-zinc-900">ข้อมูลผู้ซื้อและที่อยู่จัดส่ง</div>
                  <div className="rounded-xl border border-zinc-200 bg-white p-3 text-sm text-zinc-700">
                    <div>{review.getBuyerLine?.() || review.buyerName || "-"}</div>
                    <div className="mt-2 whitespace-pre-line break-words text-zinc-600">
                      {review.buyerShippingAddress?.address || "ยังไม่ได้ระบุที่อยู่จัดส่ง"}
                    </div>
                  </div>
                  <div className="text-xs text-zinc-500">
                    ส่งใบเสร็จเมื่อ {review.getSubmittedAtLabel?.() ?? "-"}
                  </div>
                </section>

                <section className="rounded-2xl bg-zinc-50 p-4 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-semibold text-zinc-900">รายการสินค้าที่สั่ง</div>
                    <div className="text-sm font-semibold text-zinc-900">{review.getSubtotalLabel?.() ?? "฿0.00"}</div>
                  </div>

                  <div className="space-y-2">
                    {(review.items ?? []).map((item, index) => (
                      <div
                        key={`${item.productId || item.itemId || item.name}-${index}`}
                        className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white p-3"
                      >
                        <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-xl bg-zinc-100">
                          {item?.imageUrl ? (
                            <img src={item.imageUrl} alt={item?.name ?? "order-item"} className="h-full w-full object-cover" />
                          ) : (
                            <span className="text-xs text-zinc-400">ไม่มีรูป</span>
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="line-clamp-2 break-words text-sm font-semibold text-zinc-800">
                            {item?.name || "ไม่ระบุชื่อสินค้า"}
                          </div>
                          <div className="text-xs text-zinc-500">
                            {item?.getPriceLabel?.() ?? "฿0.00"} x {item?.quantity ?? 1}
                          </div>
                        </div>

                        <div className="text-sm font-medium text-zinc-700">{item?.getLineTotalLabel?.() ?? "฿0.00"}</div>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="rounded-2xl bg-zinc-50 p-4 space-y-2">
                  <div className="text-sm font-semibold text-zinc-900">หมายเหตุสำหรับรายงาน Admin</div>
                  <textarea
                    className="min-h-28 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none disabled:bg-zinc-100"
                    placeholder="เช่น สลิปตัดต่อ, ยอดเงินไม่ตรง, ชื่อบัญชีไม่ตรง หรือข้อมูลผิดปกติอื่นๆ"
                    value={reportNote}
                    onChange={this.setReportNote}
                    disabled={submitting || !review.canReview?.()}
                  />
                  <div className="text-xs text-zinc-500">
                    ส่วนนี้เป็นโครงสำหรับเก็บเหตุผลลงฐานข้อมูลและส่งต่อให้ Admin ตรวจสอบภายหลัง
                  </div>
                </section>
              </div>

              <div className="space-y-4">
                <section className="rounded-2xl bg-zinc-50 p-4 space-y-3">
                  <div className="text-sm font-semibold text-zinc-900">ใบเสร็จที่ผู้ซื้ออัปโหลด</div>
                  {review.hasReceipt?.() ? (
                    <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
                      <img
                        src={review.receiptImageUrl}
                        alt={`receipt-${review.orderId}`}
                        className="max-h-[28rem] w-full object-contain"
                      />
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-6 text-center text-sm text-zinc-500">
                      ไม่พบรูปใบเสร็จ
                    </div>
                  )}
                </section>

                <section className="rounded-2xl border border-zinc-200 bg-white p-4 space-y-3">
                  <div className="text-sm font-semibold text-zinc-900">การดำเนินการ</div>
                  <div className="text-sm text-zinc-600">
                    ปุ่มยืนยันจะอนุมัติคำสั่งซื้อและเปลี่ยนสถานะเป็นรอรับพัสดุ ส่วนปุ่มรายงานจะเก็บเหตุผลและส่งต่อให้ Admin
                  </div>

                  <div className="flex flex-col gap-2">
                    <button
                      type="button"
                      className="rounded-xl border border-rose-200 px-4 py-2.5 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-60"
                      onClick={() => this.submitAction("report")}
                      disabled={submitting || !review.canReview?.()}
                    >
                      {submitting ? "กำลังบันทึก..." : "รายงาน Admin"}
                    </button>
                    <button
                      type="button"
                      className="rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
                      onClick={() => this.submitAction("approve")}
                      disabled={submitting || !review.canReview?.()}
                    >
                      {submitting ? "กำลังบันทึก..." : "ยืนยันการสั่งซื้อ"}
                    </button>
                  </div>
                </section>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

class StatusBadge extends React.Component {
  render() {
    const { status, label } = this.props;

    return (
      <div className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${getStatusBadgeClassName(status)}`}>
        {label}
      </div>
    );
  }
}
