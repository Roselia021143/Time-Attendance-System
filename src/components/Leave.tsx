"use client";
import { useState } from "react";
import DateInput from "./DateInput";
import { api, LEAVE_PART, LEAVE_STATUS, LEAVE_TYPE, leaveRange, type Leave } from "@/lib/client";

/** ฟอร์มขอลา: พนักงานส่งไป /api/me/leaves, เจ้าของร้านส่งไป /api/admin/leaves พร้อม userId */
export function LeaveForm({ endpoint, userId, onDone, onCancel }: { endpoint: string; userId?: number; onDone: () => void; onCancel?: () => void }) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const single = !from || from === to;

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.currentTarget));
    setBusy(true);
    try {
      await api(endpoint, { body: { ...f, part: single ? f.part : "full", userId } });
      onDone();
    } catch (e) {
      setErr((e as Error).message);
    }
    setBusy(false);
  }

  return (
    <form onSubmit={submit} className="card space-y-3">
      <h2 className="font-semibold text-sky-900">{userId ? "ลงลาแทนพนักงาน (อนุมัติทันที)" : "ขอลา"}</h2>
      <label className="block text-sm">
        <span className="label">ประเภท</span>
        <select className="input" name="type" required>
          {Object.entries(LEAVE_TYPE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </label>
      <div className="flex flex-wrap gap-3 text-sm">
        <div><span className="label">ตั้งแต่</span><DateInput name="fromDate" label="ตั้งแต่วันที่" onChange={(v) => { setFrom(v); if (!to || to < v) setTo(v); }} /></div>
        <div><span className="label">ถึง</span><DateInput key={to} name="toDate" label="ถึงวันที่" defaultValue={to} onChange={setTo} /></div>
      </div>
      <label className="block text-sm">
        <span className="label">ช่วงเวลา</span>
        <select className="input" name="part" disabled={!single}>
          {Object.entries(LEAVE_PART).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        {!single && <span className="text-xs text-slate-500">ลาหลายวันนับเป็นเต็มวัน</span>}
      </label>
      <label className="block text-sm">
        <span className="label">เหตุผล *</span>
        <textarea className="input min-h-20" name="reason" required maxLength={500} placeholder="เช่น ไม่สบาย มีไข้" />
      </label>
      <p className="text-xs text-slate-500">ไม่นับวันอาทิตย์ · การลาไม่ได้รับค่าแรง</p>
      {err && <p role="alert" className="text-sm text-red-600">{err}</p>}
      <div className="flex gap-2">
        <button className="btn" disabled={busy}>{userId ? "บันทึกการลา" : "ส่งคำขอลา"}</button>
        {onCancel && <button type="button" className="btn-ghost" onClick={onCancel}>ยกเลิก</button>}
      </div>
    </form>
  );
}

/** แสดงคำขอลาหนึ่งรายการ + ปุ่มตามบทบาท */
export function LeaveItem({ l, actions }: { l: Leave; actions?: React.ReactNode }) {
  const [label, cls] = LEAVE_STATUS[l.status];
  return (
    <div className="space-y-1 py-3">
      <div className="flex flex-wrap items-center gap-2">
        {l.user && <span className="font-medium text-sky-900">{l.user.firstName} {l.user.lastName}</span>}
        <span className="badge bg-violet-100 text-violet-700">{LEAVE_TYPE[l.type]}</span>
        <span className="text-sm text-slate-600">{leaveRange(l)}{l.days != null && ` · ${l.days} วัน`}</span>
        <span className={`badge ml-auto ${cls}`}>{label}</span>
      </div>
      <p className="text-sm text-slate-700">เหตุผล: {l.reason}</p>
      {l.decisionNote && <p className="text-sm text-slate-500">หมายเหตุจากเจ้าของร้าน: {l.decisionNote}</p>}
      {l.usedThisYear && (
        <p className="text-xs text-slate-500">
          ปีนี้ลาแล้ว (อนุมัติ): {LEAVE_TYPE[l.type]} {l.usedThisYear.sameType} วัน · ทุกประเภท {l.usedThisYear.total} วัน
        </p>
      )}
      {actions}
    </div>
  );
}

/** ปุ่มอนุมัติ / ไม่อนุมัติ / ยกเลิก สำหรับเจ้าของร้าน */
export function LeaveDecision({ l, onDone }: { l: Leave; onDone: () => void }) {
  const [note, setNote] = useState("");
  const [err, setErr] = useState("");
  const act = (action: string) =>
    api(`/api/admin/leaves/${l.id}/decision`, { body: { action, note } }).then(onDone).catch((e) => setErr(e.message));
  if (l.status === "approved")
    return <button className="btn-ghost py-1 text-sm text-red-600" onClick={() => confirm("ยกเลิกการลานี้?") && act("cancel")}>ยกเลิกการลา</button>;
  if (l.status !== "pending") return null;
  return (
    <div className="flex flex-wrap items-center gap-2 pt-1">
      <input className="input w-56 flex-1 py-1 text-sm" placeholder="หมายเหตุ (ไม่บังคับ)" aria-label="หมายเหตุ" value={note} onChange={(e) => setNote(e.target.value)} />
      <button className="btn py-1" onClick={() => act("approve")}>อนุมัติ</button>
      <button className="btn-ghost py-1 text-red-600" onClick={() => act("reject")}>ไม่อนุมัติ</button>
      {err && <p className="w-full text-sm text-red-600">{err}</p>}
    </div>
  );
}
