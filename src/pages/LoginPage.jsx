import React from "react";
import { AuthService } from "../services/AuthService";
import { minLen, isEmail } from "../utils/validators";

export class LoginPage extends React.Component {
  state = {
    identifier: "", // อีเมลหรือเบอร์โทร
    password: "",
    loading: false,
    error: "",
  };

  auth = AuthService.instance();

  setField = (name, value) => this.setState({ [name]: value, error: "" });

  onChange = (e) => this.setField(e.target.name, e.target.value);

  validate() {
    const { identifier, password } = this.state;

    // โครง: รองรับทั้ง email หรือ phone (เช็คง่าย ๆ)
    const isPhone = /^[0-9+\- ]{8,}$/.test(identifier.trim());
    const isValidEmail = isEmail(identifier);

    if (!isPhone && !isValidEmail) return "กรุณากรอกอีเมลหรือเบอร์โทรให้ถูกต้อง";
    if (!minLen(password, 6)) return "รหัสผ่านอย่างน้อย 6 ตัวอักษร";
    return "";
  }

  onSubmit = async (e) => {
    e.preventDefault();
    const msg = this.validate();
    if (msg) return this.setState({ error: msg });

    this.setState({ loading: true, error: "" });
    try {
      // โครง: ส่ง identifier ไป backend ให้ backend ตัดสินว่าเป็น email หรือ phone
      const { user } = await this.auth.login({
        email: this.state.identifier, // หรือใช้ key ชื่อ identifier ก็ได้ แล้วแต่ backend
        password: this.state.password,
      });

      this.props.onLoggedIn?.(user);
    } catch (err) {
      this.setState({ error: err.message || "เข้าสู่ระบบไม่สำเร็จ" });
    } finally {
      this.setState({ loading: false });
    }
  };

  // โครง: social login (ต้องมี backend/oauth จริง)
  onSocialLogin = (provider) => {
    // ตัวอย่าง: window.location.href = `${import.meta.env.VITE_API_URL}/api/auth/oauth/${provider}`;
    console.log("social login:", provider);
  };

  inputClass =
    "w-full rounded-full border border-zinc-200 px-4 py-2 outline-none focus:ring-2 focus:ring-zinc-300";

  socialBtnClass =
    "w-full rounded-full bg-zinc-100 py-2 font-medium flex items-center justify-center gap-3";

  render() {
    const { identifier, password, loading, error } = this.state;

    return (
      <div className="min-h-dvh grid place-items-center bg-zinc-50 p-4">
        {/* คง layout เดิม: การ์ดตรงกลาง */}
        <form
          onSubmit={this.onSubmit}
          className="w-full max-w-md rounded-2xl bg-white shadow p-6 space-y-5"
        >
          {/* พื้นที่โลโก้ (ย่อขนาดลงตามภาพที่ส่งมา) */}
          <div className="grid place-items-center">
            <div className="h-24 w-24 rounded-xl bg-zinc-300" />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">อีเมลหรือเบอร์โทร</label>
            <input
              className={this.inputClass}
              name="identifier"
              value={identifier}
              onChange={this.onChange}
              autoComplete="username"
              placeholder=""
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">รหัสผ่าน</label>
            <input
              className={this.inputClass}
              name="password"
              type="password"
              value={password}
              onChange={this.onChange}
              autoComplete="current-password"
              placeholder=""
            />
          </div>

          {error && (
            <div className="rounded-xl bg-red-50 text-red-700 text-sm p-3">
              {error}
            </div>
          )}

          <div className="grid place-items-center">
            <button
              disabled={loading}
              className="w-56 rounded-full bg-zinc-300 py-2 font-semibold disabled:opacity-60"
            >
              {loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
            </button>
          </div>

          {/* Divider: เส้น + หรือ */}
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-zinc-300" />
            <div className="text-sm text-zinc-600">หรือ</div>
            <div className="h-px flex-1 bg-zinc-300" />
          </div>

          {/* Social buttons */}
          <div className="space-y-3">
            <button
              type="button"
              className={this.socialBtnClass}
              onClick={() => this.onSocialLogin("facebook")}
            >
              <span className="h-9 w-9 rounded-full bg-white grid place-items-center text-blue-600 font-bold">
                f
              </span>
              <span>เข้าสู่ระบบด้วย Facebook</span>
            </button>

            <button
              type="button"
              className={this.socialBtnClass}
              onClick={() => this.onSocialLogin("google")}
            >
              <span className="h-9 w-9 rounded-full bg-white grid place-items-center font-bold">
                G
              </span>
              <span>เข้าสู่ระบบด้วย Google</span>
            </button>

            <button
              type="button"
              className={this.socialBtnClass}
              onClick={() => this.onSocialLogin("apple")}
            >
              <span className="h-9 w-9 rounded-full bg-white grid place-items-center font-bold">
                
              </span>
              <span>เข้าสู่ระบบด้วย Apple</span>
            </button>
          </div>

          {/* สมัครบัญชี */}
          <div className="text-center text-sm text-zinc-700">
            ยังไม่มีบัญชีผู้ใช้?{" "}
            <button
              type="button"
              onClick={this.props.onGoRegister}
              className="underline font-medium"
            >
              สมัครบัญชี
            </button>
          </div>
        </form>
      </div>
    );
  }
}