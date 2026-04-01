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

export class RegisterPage extends React.Component {
  state = {
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    password: "",
    confirmPassword: "",
    showPassword: false,
    showConfirmPassword: false,
    loading: false,
    error: "",
  };

  auth = AuthService.instance();

  setField = (name, value) => this.setState({ [name]: value, error: "" });

  onChange = (e) => this.setField(e.target.name, e.target.value);

  togglePasswordVisibility = () => {
    this.setState((prev) => ({ showPassword: !prev.showPassword }));
  };

  toggleConfirmPasswordVisibility = () => {
    this.setState((prev) => ({ showConfirmPassword: !prev.showConfirmPassword }));
  };

  validateForm() {
    const { firstName, lastName, phone, email, password, confirmPassword } = this.state;

    if (!minLen(firstName, 2)) return "กรุณากรอกชื่อ";
    if (!minLen(lastName, 2)) return "กรุณากรอกนามสกุล";
    if (!minLen(phone, 9)) return "กรุณากรอกเบอร์โทรศัพท์";
    if (!isEmail(email)) return "อีเมลไม่ถูกต้อง";
    if (!minLen(password, 6)) return "รหัสผ่านอย่างน้อย 6 ตัวอักษร";
    if (!minLen(confirmPassword, 6)) return "กรุณายืนยันรหัสผ่าน";
    if (password !== confirmPassword) return "รหัสผ่านไม่ตรงกัน";

    return "";
  }

  getRegisterPayload() {
    return {
      firstName: this.state.firstName.trim(),
      lastName: this.state.lastName.trim(),
      phone: this.state.phone.trim(),
      email: this.state.email.trim(),
      password: this.state.password,
    };
  }

  onSubmit = async (e) => {
    e.preventDefault();
    const msg = this.validateForm();
    if (msg) return this.setState({ error: msg });

    this.setState({ loading: true, error: "" });
    try {
      await this.auth.register(this.getRegisterPayload());
      this.props.onRegistered?.();
    } catch (ex) {
      this.setState({ error: ex.message || "สมัครสมาชิกไม่สำเร็จ" });
    } finally {
      this.setState({ loading: false });
    }
  };

  inputClass = "w-full rounded-xl border border-zinc-200 px-3 py-2.5 outline-none";

  renderFormFields() {
    const {
      firstName,
      lastName,
      phone,
      email,
      password,
      confirmPassword,
      showPassword,
      showConfirmPassword,
      loading,
    } = this.state;

    return (
      <div className="space-y-3">
        <div className="space-y-1">
          <label className="text-sm font-medium">ชื่อ</label>
          <input className={this.inputClass} name="firstName" value={firstName} onChange={this.onChange} />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium">นามสกุล</label>
          <input className={this.inputClass} name="lastName" value={lastName} onChange={this.onChange} />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium">เบอร์โทรศัพท์</label>
          <input className={this.inputClass} name="phone" value={phone} onChange={this.onChange} />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium">อีเมล</label>
          <input
            className={this.inputClass}
            name="email"
            value={email}
            onChange={this.onChange}
            autoComplete="email"
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium">รหัสผ่าน</label>
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
              onClick={this.togglePasswordVisibility}
              className="app-input-action absolute inset-y-0 right-4 z-10 inline-flex items-center justify-center text-zinc-500 transition hover:text-zinc-800"
              aria-label={showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
            >
              <EyeIcon open={showPassword} />
            </button>
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium">ยืนยันรหัสผ่าน</label>
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
              onClick={this.toggleConfirmPasswordVisibility}
              className="app-input-action absolute inset-y-0 right-4 z-10 inline-flex items-center justify-center text-zinc-500 transition hover:text-zinc-800"
              aria-label={showConfirmPassword ? "ซ่อนรหัสยืนยัน" : "แสดงรหัสยืนยัน"}
            >
              <EyeIcon open={showConfirmPassword} />
            </button>
          </div>
        </div>

        <button
          type="submit"
          className="w-full rounded-xl bg-yellow-300 py-2 font-semibold disabled:opacity-60"
          disabled={loading}
        >
          {loading ? "กำลังสมัครสมาชิก..." : "ยืนยัน"}
        </button>
      </div>
    );
  }

  render() {
    const { error } = this.state;

    return (
      <div className="app-auth-shell grid min-h-dvh place-items-center p-4">
        <form className="app-auth-card w-full max-w-sm rounded-[2rem] p-6 space-y-4" onSubmit={this.onSubmit}>
          <div className="relative z-10 text-center space-y-2">
            <h1 className="text-xl font-semibold">ลงทะเบียน</h1>
          </div>

          {error && (
            <div className="relative z-10 rounded-xl bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="relative z-10">{this.renderFormFields()}</div>

          <button
            type="button"
            onClick={this.props.onGoLogin}
            className="relative z-10 w-full rounded-xl border border-zinc-200 py-2.5 font-medium"
          >
            กลับไปหน้า Login
          </button>
        </form>
      </div>
    );
  }
}
