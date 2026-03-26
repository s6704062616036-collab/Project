import React from "react";

export class CartPopup extends React.Component {
  stop = (e) => e.stopPropagation();

  render() {
    const {
      items,
      loading,
      error,
      done,
      checkingOut,
      totalLabel,
      onClose,
      onOpenItem,
      onRemoveItem,
      onCheckout,
    } = this.props;

    return (
      <div className="fixed inset-0 z-50" onClick={onClose}>
        <div
          className="absolute right-5 top-23 w-[28rem] max-w-[calc(100vw-2rem)]"
          onClick={this.stop}
        >
          <div className="rounded-3xl border border-zinc-200 bg-white shadow-xl p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-base font-semibold text-zinc-900">ตะกร้าสินค้า</div>
            </div>

            {loading ? <div className="text-sm text-zinc-500">กำลังโหลดตะกร้าสินค้า...</div> : null}
            {error ? (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            ) : null}
            {done ? (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
                {done}
              </div>
            ) : null}

            {!loading && !items?.length ? (
              <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-4 text-center text-sm text-zinc-500">
                ยังไม่มีสินค้าในตะกร้า
              </div>
            ) : null}

            {!loading && items?.length ? (
              <div className="max-h-72 space-y-2 overflow-y-auto hide-scrollbar pr-1">
                {items.map((item, index) => (
                  <div
                    key={item.id || item.productId || `${item.name}-${index}`}
                    className="flex items-center gap-2 rounded-xl border border-zinc-200 p-2"
                  >
                    <button
                      type="button"
                      className="flex flex-1 items-center gap-3 text-left"
                      onClick={() => onOpenItem?.(item)}
                      title="ดูหน้าสินค้า"
                    >
                      <div className="h-16 w-16 shrink-0 rounded-lg bg-zinc-100 overflow-hidden grid place-items-center">
                        {item?.imageUrl ? (
                          <img
                            src={item.imageUrl}
                            alt={item?.name ?? "cart-item"}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="text-xs text-zinc-400">ไม่มีรูป</span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="line-clamp-2 text-sm font-semibold text-zinc-800 break-words">
                          {item?.name || "ไม่ระบุชื่อสินค้า"}
                        </div>
                        <div className="text-xs text-zinc-500">
                          {item?.getPriceLabel?.() ?? "฿0.00"} x {item?.quantity ?? 1}
                        </div>
                        <div className="text-sm font-medium text-zinc-700">
                          {item?.getLineTotalLabel?.() ?? "฿0.00"}
                        </div>
                      </div>
                    </button>

                    <button
                      type="button"
                      className="rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50"
                      onClick={() => onRemoveItem?.(item)}
                    >
                      ลบ
                    </button>
                  </div>
                ))}
              </div>
            ) : null}

            <div className="rounded-xl bg-zinc-50 px-3 py-2.5 text-sm text-zinc-700">
              รวมทั้งหมด: <span className="font-semibold text-zinc-900">{totalLabel}</span>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                className="rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                disabled={checkingOut || !items?.length}
                onClick={onCheckout}
              >
                {checkingOut ? "กำลังสั่งซื้อ..." : "สั่งซื้อ"}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

export class ProfilePopup extends React.Component {
  stop = (e) => e.stopPropagation();

  render() {
    const { user, onClose, onGoMyShop, onLogout } = this.props;

    return (
      <div className="fixed inset-0 z-50" onClick={onClose}>
        <div className="absolute right-5 top-23 w-[20rem] max-w-[calc(100vw-2rem)]" onClick={this.stop}>
          <div className="rounded-3xl border border-zinc-200 bg-white shadow-xl p-4 space-y-4">
            <div className="rounded-2xl bg-zinc-50 p-3">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-zinc-200 overflow-hidden grid place-items-center">
                  {user?.avatarUrl ? (
                    <img src={user.avatarUrl} alt="avatar" className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-zinc-600">👤</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate">{user?.name || "User"}</div>
                  <div className="text-xs text-zinc-500 truncate">{user?.email || ""}</div>
                </div>
              </div>
            </div>

            <button
              type="button"
              className="w-full rounded-xl bg-zinc-900 text-white px-3 py-2.5 text-sm font-semibold"
              onClick={onGoMyShop}
            >
              ลงขาย
            </button>

            <button
              type="button"
              className="w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
              onClick={onLogout}
            >
              Log out
            </button>
          </div>
        </div>
      </div>
    );
  }
}
