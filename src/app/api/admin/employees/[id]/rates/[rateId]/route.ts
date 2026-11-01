import { and, eq } from "drizzle-orm";
import { auth, err } from "@/lib/auth";
import { db, schema } from "@/lib/db";

const { payRates } = schema;

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string; rateId: string }> }) {
  const u = await auth(req, "owner");
  if (u instanceof Response) return u;
  const { id, rateId } = await params;
  const where = and(eq(payRates.id, Number(rateId)), eq(payRates.userId, Number(id)));
  const [row] = await db().select().from(payRates).where(where);
  if (!row) return err(404, "ไม่พบรายการ");
  await db().delete(payRates).where(where);
  await db().insert(schema.auditLogs).values({
    actorId: u.id, action: "rate.delete", target: id, before: JSON.stringify(row), after: null, createdAt: Date.now(),
  });
  return Response.json({ ok: true });
}
