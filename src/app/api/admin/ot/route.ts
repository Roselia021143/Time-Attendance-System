import { and, eq } from "drizzle-orm";
import { auth, err, body } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { ensureDay, isDate } from "@/lib/report";

const { dayRecords } = schema;

/** อนุมัติ OT: { userId, date, minutes } (0 = ปฏิเสธ, null = ยกเลิกการตัดสิน) */
export async function POST(req: Request) {
  const u = await auth(req, "owner");
  if (u instanceof Response) return u;
  const { userId, date, minutes, reason } = await body(req);
  if (!Number.isInteger(userId) || !isDate(date)) return err(400, "ข้อมูลไม่ครบ");
  if (minutes !== null && !(Number.isInteger(minutes) && minutes >= 0 && minutes <= 1440)) return err(400, "จำนวน OT ไม่ถูกต้อง");
  const d = db();
  await ensureDay(userId, date);
  const where = and(eq(dayRecords.userId, userId), eq(dayRecords.workDate, date));
  const [before] = await d.select().from(dayRecords).where(where);
  await d.update(dayRecords).set({ otApprovedMin: minutes }).where(where);
  await d.insert(schema.auditLogs).values({
    actorId: u.id, action: "ot", target: `${userId}|${date}`,
    before: JSON.stringify(before.otApprovedMin), after: JSON.stringify(minutes),
    reason: typeof reason === "string" ? reason.slice(0, 500) : "", createdAt: Date.now(),
  });
  return Response.json({ ok: true });
}
