import { and, desc, eq } from "drizzle-orm";
import { auth, body, err } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { isDate, today } from "@/lib/report";

const { users, payRates } = schema;

/** บาท (ทศนิยมได้ 2 ตำแหน่ง) -> สตางค์ */
const toSatang = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 && n <= 100_000 ? Math.round(n * 100) : null;
};

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const u = await auth(req, "owner");
  if (u instanceof Response) return u;
  const id = Number((await params).id);
  return Response.json(await db().select().from(payRates).where(eq(payRates.userId, id)).orderBy(desc(payRates.effectiveFrom)));
}

/** { rate, otRate, effectiveFrom } — วันเดียวกันซ้ำ = แทนที่ */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const u = await auth(req, "owner");
  if (u instanceof Response) return u;
  const id = Number((await params).id);
  const b = await body(req);
  const rateSatang = toSatang(b.rate), otRateSatang = toSatang(b.otRate);
  const effectiveFrom = b.effectiveFrom || today();
  if (rateSatang == null || otRateSatang == null) return err(400, "ค่าแรงต้องเป็นตัวเลขมากกว่า 0");
  if (!isDate(effectiveFrom)) return err(400, "วันที่มีผลไม่ถูกต้อง");
  const d = db();
  if (!(await d.select().from(users).where(and(eq(users.id, id), eq(users.role, "employee")))).length) return err(404, "ไม่พบพนักงาน");
  await d.delete(payRates).where(and(eq(payRates.userId, id), eq(payRates.effectiveFrom, effectiveFrom)));
  const [row] = await d.insert(payRates).values({ userId: id, effectiveFrom, rateSatang, otRateSatang, createdAt: Date.now() }).returning();
  await d.insert(schema.auditLogs).values({
    actorId: u.id, action: "rate.set", target: String(id), before: null, after: JSON.stringify(row), createdAt: Date.now(),
  });
  return Response.json(row, { status: 201 });
}
