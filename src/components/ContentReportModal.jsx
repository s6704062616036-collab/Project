import React from "react";

export class ContentReportModal extends React.Component {
  stop = (e) => e.stopPropagation();

  onSubmit = (e) => {
    e.preventDefault();
    this.props.onSubmit?.();
  };

  render() {
    const {
      title,
      subjectLabel,
      reason,
      submitting,
      error,
      onClose,
      onChangeReason,
    } = this.props;

    return (
      <div className="fixed inset-0 z-[70] bg-black/40 p-4" onClick={onClose}>
        <form
          className="mx-auto mt-[8dvh] w-full max-w-xl rounded-3xl bg-white p-4 shadow-xl md:p-6 space-y-4"
          onClick={this.stop}
          onSubmit={this.onSubmit}
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-xl font-semibold text-zinc-900">{title}</div>
              <div className="text-sm text-zinc-500">{subjectLabel}</div>
            </div>
            <button
              type="button"
              className="grid h-10 w-10 place-items-center rounded-xl border border-zinc-200"
              onClick={onClose}
              title="ปิด"
            >
              ✕
            </button>
          </div>

          {error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <label className="block space-y-2">
            <div className="text-sm font-medium text-zinc-700">ระบุปัญหาที่ต้องการรายงาน</div>
            <textarea
              className="min-h-32 w-full rounded-2xl border border-zinc-200 px-3 py-3 text-sm outline-none"
              placeholder="อธิบายปัญหาให้ชัดเจนเพื่อให้ผู้ดูแลระบบตรวจสอบได้ง่ายขึ้น"
              value={reason ?? ""}
              onChange={(e) => onChangeReason?.(e.target.value)}
            />
          </label>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="rounded-xl border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700"
              onClick={onClose}
              disabled={submitting}
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              disabled={submitting}
            >
              {submitting ? "กำลังส่งรายงาน..." : "รายงาน"}
            </button>
          </div>
        </form>
      </div>
    );
  }
}
