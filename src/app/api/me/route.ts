import { and, eq, isNull } from "drizzle-orm";
import { auth, publicUser } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { today } from "@/lib/report";

const { workSessions: ws } = schema;

/** ข้อมูลผู้ใช้ + รอบที่กำลังเปิดอยู่วันนี้ (ถ้ามี) */
export async function GET(req: Request) {
  const u = await auth(req);
  if (u instanceof Response) return u;
  const [open] = await db().select().from(ws)
    .where(and(eq(ws.userId, u.id), eq(ws.workDate, today()), isNull(ws.clockOut)));
  return Response.json({ user: publicUser(u), openSince: open?.clockIn ?? null });
}
