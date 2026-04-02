import React from "react";
import { AuthService } from "../services/AuthService";
import { isEmail, minLen } from "../utils/validators";

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

export class ForgotPasswordPage extends React.Component {
  state = {
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    showPassword: false,
    showConfirmPassword: false,
    loading: false,
    error: "",
    done: "",
  };

  auth = AuthService.instance();

  inputClass = "w-full rounded-full border border-zinc-200 px-4 py-2.5 outline-none";

  setField = (name, value) =>
    this.setState({
      [name]: value,
      error: "",
      done: "",
    });

  onChange = (e) => this.setField(e.target.name, e.target.value);

  validate() {
    const { email, phone, password, confirmPassword } = this.state;
    const normalizedEmail = `${email ?? ""}`.trim();
    const normalizedPhone = `${phone ?? ""}`.trim();

    if (!isEmail(normalizedEmail)) return "กรุณากรอกอีเมลให้ถูกต้อง";
    if (!normalizedPhone) return "กรุณากรอกเบอร์โทร";
    if (!minLen(password, 6)) return "รหัสผ่านใหม่อย่างน้อย 6 ตัวอักษร";
    if (password !== confirmPassword) return "รหัสผ่านใหม่และยืนยันรหัสผ่านไม่ตรงกัน";
    return "";
  }

  onSubmit = async (e) => {
    e.preventDefault();
    const message = this.validate();
    if (message) {
      this.setState({ error: message });
      return;
    }

    this.setState({ loading: true, error: "", done: "" });
    try {
      const result = await this.auth.resetPassword({
        email: this.state.email,
        phone: this.state.phone,
        password: this.state.password,
      });

      this.setState({
        loading: false,
        done: result?.message || "รีเซ็ตรหัสผ่านสำเร็จ",
        password: "",
        confirmPassword: "",
      });
    } catch (error) {
      this.setState({
        loading: false,
        error: error?.message || "รีเซ็ตรหัสผ่านไม่สำเร็จ",
      });
    }
  };

  render() {
    const {
      email,
      phone,
      password,
      confirmPassword,
      showPassword,
      showConfirmPassword,
      loading,
      error,
      done,
    } = this.state;

    return (
      <div className="app-auth-shell grid min-h-dvh place-items-center p-4">
        <form onSubmit={this.onSubmit} className="app-auth-card w-full max-w-md rounded-[2rem] p-10 space-y-6">
          <div className="relative z-10 grid place-items-center">
            <img
              src="/App logo.jpg"
              alt="App logo"
              className="h-30 w-30 rounded-[1.5rem] border border-white/70 object-cover shadow-[0_18px_35px_-26px_rgba(15,23,42,0.45)]"
            />
          </div>

          <div className="space-y-1 text-center">
            <div className="text-2xl font-semibold text-zinc-900">ลืมรหัสผ่าน</div>
            <div className="text-sm text-zinc-600">ยืนยันตัวตนด้วยอีเมลและเบอร์โทร แล้วตั้งรหัสผ่านใหม่ได้เลย</div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">อีเมล</label>
            <input
              className={this.inputClass}
              name="email"
              type="email"
              value={email}
              onChange={this.onChange}
              autoComplete="email"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">เบอร์โทร</label>
            <input
              className={this.inputClass}
              name="phone"
              value={phone}
              onChange={this.onChange}
              autoComplete="tel"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">รหัสผ่านใหม่</label>
            <div className="relative">
              <input
                className={`${this.inputClass} pr-14`}
                name="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={this.onChange}
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => this.setState((prev) => ({ showPassword: !prev.showPassword }))}
                className="app-input-action absolute inset-y-0 right-4 z-10 inline-flex items-center justify-center text-zinc-500 transition hover:text-zinc-800"
                aria-label={showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
              >
                <EyeIcon open={showPassword} />
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">ยืนยันรหัสผ่านใหม่</label>
            <div className="relative">
              <input
                className={`${this.inputClass} pr-14`}
                name="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={this.onChange}
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => this.setState((prev) => ({ showConfirmPassword: !prev.showConfirmPassword }))}
                className="app-input-action absolute inset-y-0 right-4 z-10 inline-flex items-center justify-center text-zinc-500 transition hover:text-zinc-800"
                aria-label={showConfirmPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
              >
                <EyeIcon open={showConfirmPassword} />
              </button>
            </div>
          </div>

          {error ? <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}
          {done ? <div className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">{done}</div> : null}

          <div className="grid place-items-center">
            <button
              disabled={loading}
              className="w-56 rounded-full bg-[#F4D03E] py-2.5 font-semibold text-zinc-950 disabled:opacity-60"
            >
              {loading ? "กำลังรีเซ็ตรหัสผ่าน..." : "ยืนยันรีเซ็ตรหัสผ่าน"}
            </button>
          </div>

          <div className="text-center text-sm text-zinc-700">
            <button type="button" onClick={this.props.onGoLogin} className="font-medium underline">
              กลับไปหน้าเข้าสู่ระบบ
            </button>
          </div>
        </form>
      </div>
    );
  }
}
