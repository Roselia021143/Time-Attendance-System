import { eq } from "drizzle-orm";
import { auth, err, publicUser } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { getDays, today, totals, workingNow } from "@/lib/report";
import { periodRange } from "@/lib/time";
import { leaveDaysByUser } from "@/lib/leave";

const { users } = schema;

/** สรุปรายเดือนทุกคน ?month=YYYY-MM  เพิ่ม &format=csv เพื่อดาวน์โหลด */
export async function GET(req: Request) {
  const u = await auth(req, "owner");
  if (u instanceof Response) return u;
  const q = new URL(req.url).searchParams;
  const month = q.get("month") ?? today().slice(0, 7);
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return err(400, "month ต้องเป็น YYYY-MM");
  const { from, to } = periodRange("month", `${month}-01`);
  const emps = await db().select().from(users).where(eq(users.role, "employee")).orderBy(users.firstName);
  const days = await getDays(emps.map((e) => e.id), from, to);
  const [working, leave] = await Promise.all([workingNow(), leaveDaysByUser(emps.map((e) => e.id), from, to)]);
  const rows = emps.map((e) => ({ user: publicUser(e), workingSince: working[e.id] ?? null, leaveDays: leave[e.id] ?? 0, ...totals(days.filter((d) => d.userId === e.id)) }));

  if (q.get("format") !== "csv") return Response.json({ month, rows });
  const h = (m: number) => (m / 60).toFixed(2);
  const cell = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const csv = [
    ["username", "ชื่อ", "นามสกุล", "ชื่อเล่น", "วันทำงาน", "ชม.ปกติ", "OT อนุมัติ (ชม.)", "OT รออนุมัติ (ชม.)", "วันที่สาย", "สายรวม (นาที)", "ลืมออกงาน (ครั้ง)", "ลา (วัน)"],
    ...rows.map((r) => [r.user.username, r.user.firstName, r.user.lastName, r.user.nickname, r.daysWorked, h(r.regularMin), h(r.otApprovedMin), h(r.otPendingMin), r.lateDays, r.lateMin, r.forgotten, r.leaveDays]),
  ].map((r) => r.map(cell).join(",")).join("\r\n");
  // BOM ให้ Excel อ่านภาษาไทยถูก
  return new Response("﻿" + csv, {
    headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="summary-${month}.csv"` },
  });
}
