// ตัวช่วยฝั่งเบราว์เซอร์: เรียก API และจัดรูปแบบตัวเลข/เวลา

export async function api<T = unknown>(path: string, init?: { method?: string; body?: unknown }): Promise<T> {
  const res = await fetch(path, {
    method: init?.method ?? (init?.body ? "POST" : "GET"),
    headers: init?.body ? { "content-type": "application/json" } : undefined,
    body: init?.body ? JSON.stringify(init.body) : undefined,
  });
  if (res.status === 401 && !path.startsWith("/api/auth")) {
    location.href = "/login";
    throw new Error("กรุณาเข้าสู่ระบบ");
  }
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(data.error ?? `เกิดข้อผิดพลาด (${res.status}) — ถ้าเพิ่งอัปเดตระบบ ให้รัน npm run db:migrate:local`);
  return data;
}

export const hrs = (min: number) => {
  const h = Math.floor(min / 60), m = min % 60;
  return h && m ? `${h} ชม. ${m} น.` : h ? `${h} ชม.` : `${m} น.`;
};

const fmt = (opt: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("th-TH", { timeZone: "Asia/Bangkok", ...opt });
export const timeOf = (ms: number | null) => (ms == null ? "—" : fmt({ hour: "2-digit", minute: "2-digit" }).format(ms));
export const dateLabel = (d: string) => fmt({ weekday: "short", day: "numeric", month: "short" }).format(Date.parse(d + "T12:00:00+07:00"));
export const monthLabel = (m: string) => fmt({ month: "long", year: "numeric" }).format(Date.parse(m + "-15T12:00:00+07:00"));
export const shiftMonth = (m: string, n: number) => {
  const d = new Date(Date.UTC(+m.slice(0, 4), +m.slice(5, 7) - 1 + n, 1));
  return d.toISOString().slice(0, 7);
};
export const thisMonth = () => new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 7);

export async function logout() {
  await fetch("/api/auth/logout", { method: "POST" });
  location.href = "/login";
}

export type Profile = { id: number; username: string; role: string; firstName: string; lastName: string; nickname: string; phone: string; lineId: string; active: boolean };
export type Day = {
  userId: number; date: string; regularMin: number; otRawMin: number; otApprovedMin: number; otPendingMin: number;
  lateMin: number; forgotten: boolean; open: boolean;
  sessions: { id: number; clockIn: number; clockOut: number | null; edited: boolean }[];
};
export type Totals = { daysWorked: number; regularMin: number; otApprovedMin: number; otPendingMin: number; lateDays: number; lateMin: number; forgotten: number };

export const baht = (satang: number) =>
  (satang / 100).toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " ฿";

export type Pay = { regularMin: number; otMin: number; regularSatang: number; otSatang: number; otPendingSatang: number; totalSatang: number; missingRateDays: number };
export type Rate = { id: number; effectiveFrom: string; rateSatang: number; otRateSatang: number };

export const LEAVE_TYPE: Record<string, string> = { sick: "ลาป่วย", personal: "ลากิจ", vacation: "ลาพักร้อน", other: "อื่น ๆ" };
export const LEAVE_PART: Record<string, string> = { full: "เต็มวัน", am: "ครึ่งเช้า", pm: "ครึ่งบ่าย" };
export const LEAVE_STATUS: Record<string, [string, string]> = {
  pending: ["รออนุมัติ", "bg-sky-100 text-sky-700"],
  approved: ["อนุมัติแล้ว", "bg-emerald-100 text-emerald-700"],
  rejected: ["ไม่อนุมัติ", "bg-red-100 text-red-700"],
  cancelled: ["ยกเลิก", "bg-slate-100 text-slate-500"],
};
export type Leave = {
  id: number; userId: number; type: string; fromDate: string; toDate: string; part: string; reason: string;
  status: string; decisionNote: string; days?: number; user?: Profile; usedThisYear?: { sameType: number; total: number };
};
export const leaveRange = (l: Leave) =>
  l.fromDate === l.toDate ? `${dateLabel(l.fromDate)} (${LEAVE_PART[l.part]})` : `${dateLabel(l.fromDate)} – ${dateLabel(l.toDate)}`;
