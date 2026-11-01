import { eq } from "drizzle-orm";
import { auth, body, err } from "@/lib/auth";
import { db, schema } from "@/lib/db";

const { leaveRequests: lr, auditLogs } = schema;

// action ที่ทำได้จากแต่ละสถานะ
const NEXT = { approve: ["pending", "approved"], reject: ["pending", "rejected"], cancel: ["approved", "cancelled"] } as const;

/** { action: "approve" | "reject" | "cancel", note? } — cancel ใช้กับคำขอที่อนุมัติแล้ว */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const u = await auth(req, "owner");
  if (u instanceof Response) return u;
  const { action, note } = await body(req);
  const rule = NEXT[action as keyof typeof NEXT];
  if (!rule) return err(400, "action ไม่ถูกต้อง");
  const d = db();
  const [row] = await d.select().from(lr).where(eq(lr.id, Number((await params).id)));
  if (!row) return err(404, "ไม่พบคำขอลา");
  if (row.status !== rule[0]) return err(409, "สถานะคำขอเปลี่ยนไปแล้ว กรุณารีเฟรช");
  const [after] = await d.update(lr).set({
    status: rule[1], decisionNote: typeof note === "string" ? note.trim().slice(0, 500) : "", decidedBy: u.id, decidedAt: Date.now(),
  }).where(eq(lr.id, row.id)).returning();
  await d.insert(auditLogs).values({
    actorId: u.id, action: `leave.${action}`, target: String(row.id), before: JSON.stringify(row), after: JSON.stringify(after), createdAt: Date.now(),
  });
  return Response.json(after);
}
