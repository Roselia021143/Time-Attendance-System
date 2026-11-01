import { and, desc, eq, gte, inArray, lte } from "drizzle-orm";
import { auth, body, err, publicUser } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { activeLeaves, readLeave } from "@/lib/leave";
import { leaveDays } from "@/lib/pay";

const { users, leaveRequests: lr } = schema;

/** ?status=pending  หรือ ?userId=&from=&to= ; แต่ละรายการมี usedThisYear (วันลาที่อนุมัติแล้วในปีนั้น แยกประเภทเดียวกัน/ทั้งหมด) */
export async function GET(req: Request) {
  const u = await auth(req, "owner");
  if (u instanceof Response) return u;
  const q = new URL(req.url).searchParams;
  const conds = [];
  if (q.get("status") === "pending") conds.push(eq(lr.status, "pending"));
  else conds.push(inArray(lr.status, ["pending", "approved", "rejected"]));
  if (q.get("userId")) conds.push(eq(lr.userId, Number(q.get("userId"))));
  if (q.get("from")) conds.push(gte(lr.toDate, q.get("from")!));
  if (q.get("to")) conds.push(lte(lr.fromDate, q.get("to")!));
  const d = db();
  const rows = await d.select().from(lr).where(and(...conds)).orderBy(desc(lr.fromDate)).limit(200);
  const ids = [...new Set(rows.map((r) => r.userId))];
  const emps = ids.length ? await d.select().from(users).where(inArray(users.id, ids)) : [];

  // วันลาที่อนุมัติแล้วในปีของแต่ละคำขอ
  const years = [...new Set(rows.map((r) => r.fromDate.slice(0, 4)))];
  const approved = [...new Map((await Promise.all(years.map((y) => activeLeaves(ids, `${y}-01-01`, `${y}-12-31`))))
    .flat().map((a) => [a.id, a])).values()];
  const used = (userId: number, year: string, type?: string) =>
    approved
      .filter((a) => a.userId === userId && (!type || a.type === type))
      .reduce((n, a) => n + leaveDays(a, `${year}-01-01`, `${year}-12-31`), 0);

  return Response.json(rows.map((r) => {
    const y = r.fromDate.slice(0, 4);
    const e = emps.find((x) => x.id === r.userId);
    return {
      ...r,
      days: leaveDays(r),
      user: e && publicUser(e),
      usedThisYear: { sameType: used(r.userId, y, r.type), total: used(r.userId, y) },
    };
  }));
}

/** เจ้าของร้านลงลาแทน -> อนุมัติทันที */
export async function POST(req: Request) {
  const u = await auth(req, "owner");
  if (u instanceof Response) return u;
  const b = await body(req);
  if (!Number.isInteger(b.userId)) return err(400, "เลือกพนักงาน");
  const [emp] = await db().select().from(users).where(and(eq(users.id, b.userId), eq(users.role, "employee")));
  if (!emp) return err(404, "ไม่พบพนักงาน");
  const l = await readLeave(b, emp.id, true);
  if (typeof l === "string") return err(400, l);
  const now = Date.now();
  const [row] = await db().insert(lr).values({
    ...l, userId: emp.id, status: "approved", decidedBy: u.id, decidedAt: now, createdBy: u.id, createdAt: now,
  }).returning();
  return Response.json(row, { status: 201 });
}
