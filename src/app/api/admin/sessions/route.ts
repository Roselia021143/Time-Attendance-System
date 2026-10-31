import { and, eq } from "drizzle-orm";
import { auth, err, body } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { ensureDay, readTimes } from "@/lib/report";

const { users, workSessions: ws, auditLogs } = schema;

/** เจ้าของร้านเพิ่มรอบให้พนักงาน: { userId, date, in, out, reason } */
export async function POST(req: Request) {
  const u = await auth(req, "owner");
  if (u instanceof Response) return u;
  const b = await body(req);
  const t = readTimes(b.date, b.in, b.out);
  if (typeof t === "string") return err(400, t);
  const d = db();
  if (!(await d.select().from(users).where(and(eq(users.id, b.userId), eq(users.role, "employee")))).length) return err(404, "ไม่พบพนักงาน");
  await ensureDay(b.userId, b.date);
  const [row] = await d.insert(ws).values({ userId: b.userId, workDate: b.date, ...t, edited: true }).returning();
  await d.insert(auditLogs).values({
    actorId: u.id, action: "session.create", target: String(row.id), before: null, after: JSON.stringify(row),
    reason: String(b.reason ?? "").slice(0, 500), createdAt: Date.now(),
  });
  return Response.json(row, { status: 201 });
}
