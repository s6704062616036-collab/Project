import React from "react";
import { PublicUserProfile } from "../models/PublicUserProfile";
import { PublicUserProfileService } from "../services/PublicUserProfileService";

const safeText = (value) => `${value ?? ""}`.trim();

export class PublicUserProfilePage extends React.Component {
  state = {
    loading: true,
    error: "",
    profile: PublicUserProfile.empty(this.props.userId),
  };

  publicUserProfileService = PublicUserProfileService.instance();

  componentDidMount() {
    this.loadProfile();
  }

  componentDidUpdate(prevProps) {
    if (`${prevProps.userId ?? ""}`.trim() !== `${this.props.userId ?? ""}`.trim()) {
      this.loadProfile();
    }
  }

  loadProfile = async () => {
    const userId = `${this.props.userId ?? ""}`.trim();
    if (!userId) {
      this.setState({
        loading: false,
        error: "ไม่พบผู้ใช้งานที่ต้องการเปิดดู",
        profile: PublicUserProfile.empty(),
      });
      return;
    }

    this.setState({
      loading: true,
      error: "",
      profile: PublicUserProfile.empty(userId),
    });

    try {
      const { profile } = await this.publicUserProfileService.getPublicProfile(userId);
      this.setState({
        profile: profile ?? PublicUserProfile.empty(userId),
      });
    } catch (e) {
      this.setState({
        error: e?.message ?? "โหลดโปรไฟล์สาธารณะไม่สำเร็จ",
      });
    } finally {
      this.setState({ loading: false });
    }
  };

  openSellerStorefront = () => {
    const ownerId = `${this.state.profile?.shop?.ownerId ?? ""}`.trim();
    if (!ownerId) return;
    this.props.onOpenSellerProfile?.(ownerId);
  };

  renderAvatar() {
    const avatarUrl = safeText(this.state.profile?.user?.avatarUrl);
    const displayName = this.state.profile?.getDisplayName?.() ?? "ผู้ใช้งาน";

    if (avatarUrl) {
      return <img src={avatarUrl} alt={displayName} className="h-full w-full object-cover" />;
    }

    return (
      <span className="text-4xl font-semibold text-zinc-500">
        {(displayName || "ผ").trim().charAt(0) || "ผ"}
      </span>
    );
  }

  renderShopAvatar() {
    const avatarUrl = this.state.profile?.getShopAvatarUrl?.() ?? "";
    const shopName = this.state.profile?.getShopName?.() ?? "ร้านค้าผู้ขาย";

    if (avatarUrl) {
      return <img src={avatarUrl} alt={shopName} className="h-full w-full object-cover" />;
    }

    return (
      <span className="text-2xl font-semibold text-zinc-500">
        {(shopName || "ร").trim().charAt(0) || "ร"}
      </span>
    );
  }

  render() {
    const { loading, error, profile } = this.state;
    const displayName = profile.getDisplayName();
    const usernameLabel = profile.getUsernameLabel();
    const roleLabel = profile.getRoleLabel();
    const joinedAtLabel = profile.getJoinedAtLabel();
    const contactEmail = profile?.user?.getContactEmail?.() ?? "";
    const contactPhone = profile?.user?.getContactPhone?.() ?? "";
    const soldProductsCount = Number(profile?.shop?.soldProductsCount ?? 0) || 0;
    const availableProductsCount = Number(profile?.shop?.availableProductsCount ?? 0) || 0;
    const currentUserId = `${this.props.user?.id ?? ""}`.trim();
    const profileUserId = `${profile?.user?.id ?? ""}`.trim();
    const isCurrentUser = currentUserId && profileUserId && currentUserId === profileUserId;

    return (
      <div className="min-h-dvh bg-zinc-50">
        <div className="app-topbar-shell sticky top-0 z-40 border-b border-zinc-200 bg-[#A4E3D8]">
          <div className="mx-auto flex max-w-350 items-center gap-4 px-4 py-5">
            <button
              type="button"
              onClick={this.props.onGoHome}
              title="กลับหน้าแรก"
              className="shrink-0 rounded-xl border border-zinc-200 bg-white p-0"
            >
              <img src="/App logo.jpg" alt="App logo" className="h-20 w-20 rounded-xl object-cover" />
            </button>
            <div className="min-w-0">
              <div className="text-sm font-medium text-zinc-700">โปรไฟล์สาธารณะ</div>
              <div className="truncate text-2xl font-semibold text-zinc-900">{displayName}</div>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-5xl px-4 py-6">
          {error ? (
            <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          {loading ? (
            <div className="rounded-3xl border border-zinc-200 bg-white px-6 py-10 text-sm text-zinc-500 shadow-sm">
              กำลังโหลดข้อมูลโปรไฟล์...
            </div>
          ) : null}

          {!loading && !error ? (
            <div className="space-y-6">
              <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
                <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-center gap-4">
                    <div className="grid h-24 w-24 shrink-0 place-items-center overflow-hidden rounded-full bg-zinc-100">
                      {this.renderAvatar()}
                    </div>
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <h1 className="text-2xl font-semibold text-zinc-900">{displayName}</h1>
                        <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-700">
                          {roleLabel}
                        </span>
                        {isCurrentUser ? (
                          <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                            บัญชีของคุณ
                          </span>
                        ) : null}
                      </div>
                      {usernameLabel ? <div className="text-sm text-zinc-500">{usernameLabel}</div> : null}
                      <div className="text-sm text-zinc-600">เข้าร่วมเมื่อ {joinedAtLabel}</div>
                    </div>
                  </div>

                  {profile.hasShop() ? (
                    <button
                      type="button"
                      onClick={this.openSellerStorefront}
                      className="rounded-2xl bg-zinc-900 px-5 py-3 text-sm font-semibold text-white"
                    >
                      ดูหน้าร้านผู้ขาย
                    </button>
                  ) : null}
                </div>
              </section>

              <section className="grid gap-4 md:grid-cols-2">
                <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
                  <div className="text-xs font-medium uppercase tracking-[0.12em] text-zinc-500">เบอร์โทร</div>
                  <div className="mt-2 text-sm font-medium text-zinc-800 break-all">
                    {contactPhone || "ยังไม่ได้ระบุ"}
                  </div>
                </div>
                <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
                  <div className="text-xs font-medium uppercase tracking-[0.12em] text-zinc-500">อีเมล</div>
                  <div className="mt-2 text-sm font-medium text-zinc-800 break-all">
                    {contactEmail || "ยังไม่ได้ระบุ"}
                  </div>
                </div>
              </section>

              {profile.hasShop() ? (
                <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
                  <div className="mb-4 flex items-center gap-4">
                    <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-2xl bg-zinc-100">
                      {this.renderShopAvatar()}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-xl font-semibold text-zinc-900">
                        {profile.getShopName()}
                      </div>
                      <div className="flex flex-wrap gap-2 text-sm text-zinc-500">
                        <span>กำลังขาย {availableProductsCount} รายการ</span>
                        <span>ขายแล้ว {soldProductsCount} รายการ</span>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl bg-zinc-50 px-4 py-4 text-sm leading-6 text-zinc-700">
                    {profile.getShopDescription() || "ร้านนี้ยังไม่ได้เพิ่มคำอธิบายร้าน"}
                  </div>
                </section>
              ) : (
                <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
                  <div className="text-lg font-semibold text-zinc-900">ข้อมูลผู้ใช้งาน</div>
                  <div className="mt-3 rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 px-4 py-4 text-sm text-zinc-500">
                    ผู้ใช้งานคนนี้ยังไม่มีหน้าร้านสาธารณะให้แสดง
                  </div>
                </section>
              )}
            </div>
          ) : null}
        </div>
      </div>
    );
  }
}
