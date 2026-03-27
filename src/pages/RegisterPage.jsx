import React from "react";
import { AuthService } from "../services/AuthService";
import { isEmail, minLen } from "../utils/validators";

/**
 * RegisterPage (single step)
 * - คง layout card เดิมของเว็บ
 * - ส่งข้อมูลสมัครสมาชิกเป็น payload เดียวไป backend/service
 * - backend เป็นผู้รับผิดชอบ persist ลง database
 */
export class RegisterPage extends React.Component {
  state = {
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    password: "",
    loading: false,
    error: "",
  };

  auth = AuthService.instance();

  // -------- OOP helpers --------
  setField = (name, value) => this.setState({ [name]: value, error: "" });

  onChange = (e) => this.setField(e.target.name, e.target.value);

  // -------- validation --------
  validateForm() {
    const { firstName, lastName, phone, email, password } = this.state;
    if (!minLen(firstName, 2)) return "กรุณากรอกชื่อ";
    if (!minLen(lastName, 2)) return "กรุณากรอกนามสกุล";
    if (!minLen(phone, 9)) return "กรุณากรอกเบอร์โทรศัพท์";
    if (!isEmail(email)) return "อีเมลไม่ถูกต้อง";
    if (!minLen(password, 6)) return "รหัสผ่านอย่างน้อย 6 ตัวอักษร";
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

  // -------- actions --------
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

  // -------- UI bits --------
  inputClass =
    "w-full rounded-xl border border-zinc-200 px-3 py-2 outline-none focus:ring-2 focus:ring-zinc-300";

  renderFormFields() {
    const { firstName, lastName, phone, email, password, loading } = this.state;

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
          <input className={this.inputClass} name="email" value={email} onChange={this.onChange} autoComplete="email" />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium">รหัสผ่าน</label>
          <input
            className={this.inputClass}
            name="password"
            type="password"
            value={password}
            onChange={this.onChange}
            autoComplete="new-password"
          />
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
      <div className="min-h-dvh grid place-items-center bg-zinc-50 p-4">
        <form className="w-full max-w-sm rounded-2xl bg-white p-6 shadow space-y-4" onSubmit={this.onSubmit}>
          <div className="text-center space-y-2">
            <h1 className="text-xl font-semibold">ลงทะเบียน</h1>
          </div>

          {error && (
            <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {this.renderFormFields()}

          <button
            type="button"
            onClick={this.props.onGoLogin}
            className="w-full rounded-xl border border-zinc-200 py-2 font-medium"
          >
            กลับไปหน้า Login
          </button>
        </form>
      </div>
    );
  }
}
