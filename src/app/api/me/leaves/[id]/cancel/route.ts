import { and, eq } from "drizzle-orm";
import { auth, err } from "@/lib/auth";
import { db, schema } from "@/lib/db";

const { leaveRequests: lr } = schema;

/** พนักงานยกเลิกได้เฉพาะคำขอที่ยังรออนุมัติ */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const u = await auth(req);
  if (u instanceof Response) return u;
  const where = and(eq(lr.id, Number((await params).id)), eq(lr.userId, u.id), eq(lr.status, "pending"));
  const [row] = await db().update(lr).set({ status: "cancelled", decidedAt: Date.now(), decidedBy: u.id }).where(where).returning();
  return row ? Response.json(row) : err(400, "ยกเลิกได้เฉพาะคำขอที่ยังรออนุมัติ");
}
