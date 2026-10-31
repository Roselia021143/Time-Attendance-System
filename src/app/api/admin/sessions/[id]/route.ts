import { eq } from "drizzle-orm";
import { auth, err, body } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { readTimes } from "@/lib/report";

const { workSessions: ws, auditLogs } = schema;

async function load(req: Request, params: Promise<{ id: string }>) {
  const u = await auth(req, "owner");
  if (u instanceof Response) return u;
  const [row] = await db().select().from(ws).where(eq(ws.id, Number((await params).id)));
  return row ? { u, row } : err(404, "ไม่พบรายการ");
}

const log = (actorId: number, action: string, before: unknown, after: unknown, reason: unknown) =>
  db().insert(auditLogs).values({
    actorId, action, target: String((before as { id: number }).id),
    before: JSON.stringify(before), after: after == null ? null : JSON.stringify(after),
    reason: String(reason ?? "").slice(0, 500), createdAt: Date.now(),
  });

/** แก้เวลา: { in, out, reason } (HH:MM ของวันเดิม) */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const r = await load(req, params);
  if (r instanceof Response) return r;
  const b = await body(req);
  const t = readTimes(r.row.workDate, b.in, b.out);
  if (typeof t === "string") return err(400, t);
  const [after] = await db().update(ws).set({ ...t, edited: true }).where(eq(ws.id, r.row.id)).returning();
  await log(r.u.id, "session.update", r.row, after, b.reason);
  return Response.json(after);
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const r = await load(req, params);
  if (r instanceof Response) return r;
  await db().delete(ws).where(eq(ws.id, r.row.id));
  await log(r.u.id, "session.delete", r.row, null, new URL(req.url).searchParams.get("reason"));
  return Response.json({ ok: true });
}
