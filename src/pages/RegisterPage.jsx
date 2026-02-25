import React from "react";
import { AuthService } from "../services/AuthService";
import { isEmail, minLen } from "../utils/validators";

/**
 * Step 1: ชื่อ, นามสกุล, เบอร์โทรศัพท์, อีเมล, รหัสผ่าน
 * Step 2: เลขบัตรประชาชน, วันที่ออกบัตร, วันหมดอายุ, อัปโหลดรูปบัตร
 *
 * NOTE: Frontend ไม่เก็บลง DB โดยตรง — ส่งให้ backend API แล้ว backend ค่อยบันทึก DB
 */
export class RegisterPage extends React.Component {
  state = {
    step: 1,

    // Step 1 (จากภาพ 1)
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    password: "",

    // Step 2 (จากภาพ 2)
    nationalId: "",
    issueDate: "",
    expiryDate: "",
    idCardImageFile: null, // File object

    loading: false,
    error: "",
  };

  auth = AuthService.instance();

  // -------- OOP helpers --------
  setField = (name, value) => this.setState({ [name]: value, error: "" });

  onChange = (e) => this.setField(e.target.name, e.target.value);

  onPickFile = (e) => {
    const file = e.target.files?.[0] ?? null;
    this.setField("idCardImageFile", file);
  };

  goStep = (step) => this.setState({ step, error: "" });

  // -------- validation --------
  validateStep1() {
    const { firstName, lastName, phone, email, password } = this.state;
    if (!minLen(firstName, 2)) return "กรุณากรอกชื่อ";
    if (!minLen(lastName, 2)) return "กรุณากรอกนามสกุล";
    if (!minLen(phone, 9)) return "กรุณากรอกเบอร์โทรศัพท์";
    if (!isEmail(email)) return "อีเมลไม่ถูกต้อง";
    if (!minLen(password, 6)) return "รหัสผ่านอย่างน้อย 6 ตัวอักษร";
    return "";
  }

  validateStep2() {
    const { nationalId, issueDate, expiryDate, idCardImageFile } = this.state;
    if (!minLen(nationalId, 13)) return "กรุณากรอกเลขบัตรประชาชนให้ครบ";
    if (!issueDate) return "กรุณาเลือกวันที่ออกบัตร";
    if (!expiryDate) return "กรุณาเลือกวันหมดอายุ";
    if (!idCardImageFile) return "กรุณาอัปโหลดรูปบัตรประชาชน";
    return "";
  }

  // -------- actions --------
  onNext = (e) => {
    e.preventDefault();
    const msg = this.validateStep1();
    if (msg) return this.setState({ error: msg });
    this.goStep(2);
  };

  onBack = (e) => {
    e.preventDefault();
    this.goStep(1);
  };

  onSubmit = async (e) => {
    e.preventDefault();
    const msg = this.validateStep2();
    if (msg) return this.setState({ error: msg });

    this.setState({ loading: true, error: "" });
    try {
      // โครง payload: รวมข้อมูลจากทั้งสองหน้า
      // กรณีมีไฟล์ รูปแบบที่เหมาะคือ multipart/form-data
      // แต่เพื่อ “โครง” จะยกตัวอย่างเป็น FormData ให้เลย

      const fd = new FormData();
      fd.append("firstName", this.state.firstName);
      fd.append("lastName", this.state.lastName);
      fd.append("phone", this.state.phone);
      fd.append("email", this.state.email);
      fd.append("password", this.state.password);
      fd.append("nationalId", this.state.nationalId);
      fd.append("issueDate", this.state.issueDate);
      fd.append("expiryDate", this.state.expiryDate);
      fd.append("idCardImage", this.state.idCardImageFile);

      // ต้องมี endpoint ฝั่ง backend รองรับ multipart ด้วย
      // ตัวอย่าง: POST /api/auth/register (multipart)
      // แนะนำทำเมธอด registerForm ใน AuthService (โครงด้านล่าง)
      await this.auth.registerForm(fd);

      this.props.onRegistered?.(); // เช่น กลับไปหน้า Login
    } catch (ex) {
      this.setState({ error: ex.message || "สมัครสมาชิกไม่สำเร็จ" });
    } finally {
      this.setState({ loading: false });
    }
  };

  // -------- UI bits --------
  renderStepper() {
    const active = this.state.step;

    return (
      <div className="flex items-center justify-center gap-4">
        <div className={`h-10 w-10 rounded-full grid place-items-center font-semibold ${active === 1 ? "bg-zinc-300" : "bg-zinc-200"}`}>
          1
        </div>

        <div className="h-1 w-40 bg-zinc-900 rounded-full" />

        <div className={`h-10 w-10 rounded-full grid place-items-center font-semibold ${active === 2 ? "bg-zinc-300" : "bg-zinc-200"}`}>
          2
        </div>
      </div>
    );
  }

  inputClass =
    "w-full rounded-xl border border-zinc-200 px-3 py-2 outline-none focus:ring-2 focus:ring-zinc-300";

  renderStep1() {
    const { firstName, lastName, phone, email, password } = this.state;

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
          onClick={this.onNext}
          className="w-full rounded-xl bg-yellow-300 py-2 font-semibold"
        >
          ถัดไป
        </button>
      </div>
    );
  }

  renderStep2() {
    const { nationalId, issueDate, expiryDate, idCardImageFile, loading } = this.state;

    return (
      <div className="space-y-3">
        <div className="space-y-1">
          <label className="text-sm font-medium">เลขบัตรประจำตัวประชาชน</label>
          <input className={this.inputClass} name="nationalId" value={nationalId} onChange={this.onChange} />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium">วันที่ออกบัตร</label>
          <input className={this.inputClass} name="issueDate" type="date" value={issueDate} onChange={this.onChange} />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium">วันหมดอายุ</label>
          <input className={this.inputClass} name="expiryDate" type="date" value={expiryDate} onChange={this.onChange} />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium">อัปโหลดรูปถ่ายบัตรประชาชน</label>

          <label className="block cursor-pointer rounded-2xl bg-zinc-200/70 p-6 text-center">
            <input type="file" accept="image/*" className="hidden" onChange={this.onPickFile} />
            <div className="text-sm text-zinc-700">
              {idCardImageFile ? `เลือกไฟล์: ${idCardImageFile.name}` : "คลิกเพื่อเลือกไฟล์รูปภาพ"}
            </div>
            <div className="text-xs text-zinc-500 mt-1">(โครง: จะส่งไฟล์ไป backend)</div>
          </label>
        </div>

        <div className="flex gap-2">
          <button
            onClick={this.onBack}
            className="w-1/2 rounded-xl border border-zinc-200 py-2 font-semibold"
            disabled={loading}
          >
            ย้อนกลับ
          </button>

          <button
            onClick={this.onSubmit}
            className="w-1/2 rounded-xl bg-yellow-300 py-2 font-semibold disabled:opacity-60"
            disabled={loading}
          >
            {loading ? "กำลังยืนยัน..." : "ยืนยัน"}
          </button>
        </div>
      </div>
    );
  }

  render() {
    const { step, error } = this.state;

    return (
      <div className="min-h-dvh grid place-items-center bg-zinc-50 p-4">
        <form className="w-full max-w-sm rounded-2xl bg-white p-6 shadow space-y-4">
          <div className="text-center space-y-2">
            <h1 className="text-xl font-semibold">ลงทะเบียน</h1>
            {this.renderStepper()}
          </div>

          {error && (
            <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {step === 1 ? this.renderStep1() : this.renderStep2()}

          {/* ปุ่มกลับไปหน้า Login */}
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