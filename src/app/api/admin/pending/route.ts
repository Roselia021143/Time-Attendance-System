import { and, eq, gte, isNull, lt } from "drizzle-orm";
import { auth, publicUser } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { getDays, today } from "@/lib/report";
import { periodRange } from "@/lib/time";

const { users, dayRecords, workSessions: ws } = schema;

/** รายการรอดำเนินการ: OT รออนุมัติ + ลืมออกงาน */
export async function GET(req: Request) {
  const u = await auth(req, "owner");
  if (u instanceof Response) return u;
  // shortcut: ดูย้อนหลังแค่ 3 เดือน (ปัจจุบัน + 2 เดือนก่อน), ถ้าต้องการเก่ากว่านี้ให้ดูจากหน้ารายคน
  const from = periodRange("month", today(), 2).from;
  const d = db();
  const [undecided, forgot, emps] = await Promise.all([
    d.selectDistinct({ userId: dayRecords.userId }).from(dayRecords)
      .where(and(gte(dayRecords.workDate, from), isNull(dayRecords.otApprovedMin))),
    d.selectDistinct({ userId: ws.userId }).from(ws)
      .where(and(gte(ws.workDate, from), lt(ws.workDate, today()), isNull(ws.clockOut))),
    d.select().from(users).where(eq(users.role, "employee")),
  ]);
  const ids = [...new Set([...undecided, ...forgot].map((r) => r.userId))];
  const days = (await getDays(ids, from, today())).filter((x) => x.otPendingMin > 0 || x.forgotten);
  const byId = new Map(emps.map((e) => [e.id, publicUser(e)]));
  return Response.json(days.map((x) => ({ ...x, user: byId.get(x.userId) })));
}
