import React from "react";

export class HomePage extends React.Component {
  // โครงข้อมูล (จากภาพ)
  categories = [
    "ของใช้ในบ้านและเฟอร์นิเจอร์",
    "แฟชั่นและเครื่องประดับ",
    "อิเล็กทรอนิกส์",
    "แม่และเด็ก",
    "ยานยนต์และอะไหล่",
    "สัตว์เลี้ยง",
  ];

  products = [1, 2, 3, 4]; // โครง: สินค้า 4 ช่อง

  renderTopBar() {
    return (
      <div className="flex items-center gap-3">
        {/* hamburger */}
        <button
          type="button"
          className="h-10 w-10 rounded-xl bg-zinc-200 grid place-items-center"
          onClick={this.props.onToggleMenu}
          aria-label="menu"
        >
          ☰
        </button>

        {/* search */}
        <div className="flex-1">
          <div className="flex items-center gap-2 rounded-full bg-zinc-200 px-4 py-2">
            <span className="text-zinc-600">🔍</span>
            <input
              className="w-full bg-transparent outline-none text-sm"
              placeholder="ค้นหา..."
              onChange={(e) => this.props.onSearch?.(e.target.value)}
            />
          </div>
        </div>

        {/* cart */}
        <button
          type="button"
          className="h-10 w-10 rounded-xl bg-zinc-200 grid place-items-center"
          aria-label="cart"
          onClick={this.props.onCart}
        >
          🛒
        </button>

        {/* profile */}
        <button
          type="button"
          className="h-10 w-10 rounded-full bg-zinc-900 text-white grid place-items-center"
          aria-label="profile"
          onClick={this.props.onProfile}
        >
          👤
        </button>
      </div>
    );
  }

  renderBanner() {
    return (
      <div className="rounded-2xl bg-zinc-200 h-40 w-full" />
    );
  }

  renderLeftCategories() {
    return (
      <div className="space-y-2">
        <div className="rounded-xl bg-zinc-100 px-4 py-2 font-semibold">หมวดหมู่</div>
        <div className="overflow-hidden rounded-xl border border-zinc-200">
          {this.categories.map((c) => (
            <button
              key={c}
              type="button"
              className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-zinc-50 border-b last:border-b-0 border-zinc-200"
              onClick={() => this.props.onPickCategory?.(c)}
            >
              <span className="text-sm">{c}</span>
              <span className="text-zinc-500">›</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  renderProducts() {
    return (
      <div className="rounded-2xl bg-zinc-700 p-4">
        <div className="text-white font-semibold mb-4">สินค้า</div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {this.products.map((id) => (
            <div key={id} className="rounded-2xl bg-zinc-200 h-44" />
          ))}
        </div>
      </div>
    );
  }

  render() {
    // ✅ คง layout เดิม: การ์ดอยู่กลางจอ ไม่เต็มจอแบบภาพ
    return (
      <div className="min-h-dvh grid place-items-center bg-zinc-50 p-4">
        <div className="w-full max-w-5xl rounded-2xl bg-white shadow p-4 md:p-6 space-y-6">
          {this.renderTopBar()}
          {this.renderBanner()}

          <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-6">
            {this.renderLeftCategories()}
            {this.renderProducts()}
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              className="rounded-xl border border-zinc-200 px-4 py-2 font-medium"
              onClick={this.props.onLogout}
            >
              ออกจากระบบ
            </button>
          </div>
        </div>
      </div>
    );
  }
}