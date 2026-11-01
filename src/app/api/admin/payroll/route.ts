import { eq } from "drizzle-orm";
import { auth, err, publicUser } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { ratesByUser } from "@/lib/leave";
import { sumPay } from "@/lib/pay";
import { getDays, today } from "@/lib/report";
import { periodRange, type Period } from "@/lib/time";

const { users } = schema;
const PERIODS: Period[] = ["week", "month", "year"];

/** สรุปค่าแรง ?period=week|month|year&offset=0  [&format=csv]  [&userId=… (โหมดปี: แยก 12 เดือน)] */
export async function GET(req: Request) {
  const u = await auth(req, "owner");
  if (u instanceof Response) return u;
  const q = new URL(req.url).searchParams;
  const period = (q.get("period") ?? "month") as Period;
  if (!PERIODS.includes(period)) return err(400, "period ไม่ถูกต้อง");
  const offset = Math.max(0, Math.min(520, Number(q.get("offset")) || 0));
  const { from, to } = periodRange(period, today(), offset);

  const userId = Number(q.get("userId")) || null;
  const emps = await db().select().from(users).where(userId ? eq(users.id, userId) : eq(users.role, "employee")).orderBy(users.firstName);
  const ids = emps.map((e) => e.id);
  const [days, rates] = await Promise.all([getDays(ids, from, to), ratesByUser(ids)]);

  if (userId) {
    const r = rates[userId] ?? [];
    const months = Array.from({ length: 12 }, (_, i) => {
      const m = `${from.slice(0, 4)}-${String(i + 1).padStart(2, "0")}`;
      return { month: m, ...sumPay(days.filter((d) => d.date.startsWith(m)), r) };
    });
    return Response.json({ from, to, user: emps[0] && publicUser(emps[0]), months });
  }

  const rows = emps
    .map((e) => ({ user: publicUser(e), hasRate: !!rates[e.id]?.length, ...sumPay(days.filter((d) => d.userId === e.id), rates[e.id] ?? []) }))
    .filter((r) => r.user.active || r.regularMin + r.otMin > 0);
  const total = sumPay([], []); // ศูนย์ทุกช่อง
  for (const r of rows) for (const k of ["regularMin", "otMin", "regularSatang", "otSatang", "otPendingSatang", "totalSatang", "missingRateDays"] as const) total[k] += r[k];

  if (q.get("format") !== "csv") return Response.json({ period, from, to, rows, total });
  const b = (s: number) => (s / 100).toFixed(2), h = (m: number) => (m / 60).toFixed(2);
  const cell = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const csv = [
    ["username", "ชื่อ", "นามสกุล", "ชม.ปกติ", "ค่าแรงปกติ (บาท)", "ชม.OT", "ค่า OT (บาท)", "รวม (บาท)", "OT รออนุมัติ (บาท)", "วันที่ไม่มีอัตราค่าแรง"],
    ...rows.map((r) => [r.user.username, r.user.firstName, r.user.lastName, h(r.regularMin), b(r.regularSatang), h(r.otMin), b(r.otSatang), b(r.totalSatang), b(r.otPendingSatang), r.missingRateDays]),
    ["", "รวมทั้งร้าน", "", h(total.regularMin), b(total.regularSatang), h(total.otMin), b(total.otSatang), b(total.totalSatang), b(total.otPendingSatang), total.missingRateDays],
  ].map((r) => r.map(cell).join(",")).join("\r\n");
  return new Response("﻿" + csv, {
    headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="payroll-${from}_${to}.csv"` },
  });
}
