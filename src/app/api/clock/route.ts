import { and, eq, isNull } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { ensureDay, today } from "@/lib/report";

const { workSessions: ws } = schema;

/** กดครั้งเดียว: ถ้ามีรอบเปิดอยู่วันนี้ = ออกงาน, ไม่มี = เข้างาน */
export async function POST(req: Request) {
  const u = await auth(req);
  if (u instanceof Response) return u;
  const d = db(), now = Date.now(), date = today();
  const [open] = await d.select().from(ws).where(and(eq(ws.userId, u.id), eq(ws.workDate, date), isNull(ws.clockOut)));
  if (open) {
    await d.update(ws).set({ clockOut: now }).where(eq(ws.id, open.id));
    return Response.json({ action: "out", at: now });
  }
  await ensureDay(u.id, date);
  await d.insert(ws).values({ userId: u.id, workDate: date, clockIn: now });
  return Response.json({ action: "in", at: now });
}
