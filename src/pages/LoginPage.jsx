import React from "react";
import { AuthService } from "../services/AuthService";
import { minLen, isEmail } from "../utils/validators";

const EyeIcon = ({ open }) =>
  open ? (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
      <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
      <path d="M3 3l18 18" />
      <path d="M10.6 10.7a3 3 0 0 0 4 4" />
      <path d="M9.4 5.1A11.7 11.7 0 0 1 12 5c6.5 0 10 7 10 7a17.6 17.6 0 0 1-3 3.8" />
      <path d="M6.2 6.2A17.7 17.7 0 0 0 2 12s3.5 7 10 7c1.8 0 3.3-.4 4.7-1" />
    </svg>
  );

export class LoginPage extends React.Component {
  state = {
    identifier: "",
    password: "",
    showPassword: false,
    loading: false,
    error: "",
  };

  auth = AuthService.instance();

  setField = (name, value) => this.setState({ [name]: value, error: "" });

  onChange = (e) => this.setField(e.target.name, e.target.value);

  togglePasswordVisibility = () => {
    this.setState((prev) => ({ showPassword: !prev.showPassword }));
  };

  validate() {
    const { identifier, password } = this.state;
    const normalizedIdentifier = identifier.trim();

    const isPhone = /^[0-9+\- ]{8,}$/.test(normalizedIdentifier);
    const isValidEmail = isEmail(normalizedIdentifier);
    const isUsername = /^[a-zA-Z0-9._-]{3,}$/.test(normalizedIdentifier);

    if (!normalizedIdentifier) return "กรุณากรอกข้อมูลเข้าสู่ระบบ";
    if (!isPhone && !isValidEmail && !isUsername) return "กรุณากรอกข้อมูลเข้าสู่ระบบให้ถูกต้อง";
    if (!minLen(password, 6)) return "รหัสผ่านอย่างน้อย 6 ตัวอักษร";
    return "";
  }

  onSubmit = async (e) => {
    e.preventDefault();
    const msg = this.validate();
    if (msg) return this.setState({ error: msg });

    this.setState({ loading: true, error: "" });
    try {
      const { user } = await this.auth.login({
        email: this.state.identifier,
        password: this.state.password,
      });

      this.props.onLoggedIn?.(user);
    } catch (err) {
      this.setState({ error: err.message || "เข้าสู่ระบบไม่สำเร็จ" });
    } finally {
      this.setState({ loading: false });
    }
  };

  inputClass = "w-full rounded-full border border-zinc-200 px-4 py-2.5 outline-none";

  render() {
    const { identifier, password, showPassword, loading, error } = this.state;

    return (
      <div className="app-auth-shell grid min-h-dvh place-items-center p-4">
        <form onSubmit={this.onSubmit} className="app-auth-card w-full max-w-md rounded-[2rem] p-10 space-y-8">
          <div className="relative z-10 grid place-items-center">
            <img
              src="/App logo.jpg"
              alt="App logo"
              className="h-30 w-30 rounded-[1.5rem] border border-white/70 object-cover shadow-[0_18px_35px_-26px_rgba(15,23,42,0.45)]"
            />
          </div>

          <div className="relative z-10 space-y-2">
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

          <div className="relative z-10 space-y-2">
            <label className="text-sm font-medium">รหัสผ่าน</label>
            <div className="relative">
              <input
                className={`${this.inputClass} pr-14`}
                name="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={this.onChange}
                autoComplete="current-password"
                placeholder=""
              />
              <button
                type="button"
                onClick={this.togglePasswordVisibility}
                className="app-input-action absolute inset-y-0 right-4 z-10 inline-flex items-center justify-center text-zinc-500 transition hover:text-zinc-800"
                aria-label={showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
              >
                <EyeIcon open={showPassword} />
              </button>
            </div>
          </div>

          {error && <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div>}

          <div className="relative z-10 grid place-items-center">
            <button
              disabled={loading}
              className="w-56 rounded-full bg-[#F4D03E] py-2.5 font-semibold text-zinc-950 disabled:opacity-60"
            >
              {loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
            </button>
          </div>

          <div className="relative z-10 text-center text-sm text-zinc-700">
            <button type="button" onClick={this.props.onGoForgotPassword} className="font-medium underline">
              ลืมรหัสผ่าน?
            </button>
          </div>

          <div className="relative z-10 text-center text-sm text-zinc-700">
            ยังไม่มีบัญชีผู้ใช้?{" "}
            <button type="button" onClick={this.props.onGoRegister} className="font-medium underline">
              สมัครบัญชี
            </button>
          </div>
        </form>
      </div>
    );
  }
}
