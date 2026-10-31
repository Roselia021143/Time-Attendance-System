"use client";
import { useState } from "react";
import { api } from "@/lib/client";

export default function Login() {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setError("");
    try {
      const { role } = await api<{ role: string }>("/api/auth/login", { body: { username: f.get("username"), password: f.get("password") } });
      location.href = role === "owner" ? "/admin" : "/clock";
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center p-4">
      <form onSubmit={submit} className="card w-full max-w-sm space-y-4">
        <div className="text-center">
          <div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-2xl bg-sky-600 text-2xl text-white">⏱</div>
          <h1 className="text-xl font-semibold text-sky-900">ลงเวลาเข้า-ออกงาน</h1>
          <p className="text-sm text-slate-500">เข้าสู่ระบบเพื่อเริ่มใช้งาน</p>
        </div>
        <div>
          <label className="label" htmlFor="username">ชื่อผู้ใช้</label>
          <input className="input" id="username" name="username" autoComplete="username" autoCapitalize="none" required />
        </div>
        <div>
          <label className="label" htmlFor="password">รหัสผ่าน</label>
          <input className="input" id="password" name="password" type="password" autoComplete="current-password" required />
        </div>
        {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <button className="btn w-full py-3" disabled={busy}>{busy ? "กำลังเข้าสู่ระบบ…" : "เข้าสู่ระบบ"}</button>
      </form>
    </main>
  );
}
