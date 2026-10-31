import { and, eq } from "drizzle-orm";
import { auth, err, publicUser } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { getDays, today, totals } from "@/lib/report";
import { periodRange } from "@/lib/time";

const { users } = schema;

/** รายละเอียดรายวันของพนักงานหนึ่งคน ?month=YYYY-MM */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const u = await auth(req, "owner");
  if (u instanceof Response) return u;
  const id = Number((await params).id);
  const month = new URL(req.url).searchParams.get("month") ?? today().slice(0, 7);
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return err(400, "month ต้องเป็น YYYY-MM");
  const [emp] = await db().select().from(users).where(and(eq(users.id, id), eq(users.role, "employee")));
  if (!emp) return err(404, "ไม่พบพนักงาน");
  const { from, to } = periodRange("month", `${month}-01`);
  const days = await getDays([id], from, to);
  return Response.json({ user: publicUser(emp), month, totals: totals(days), days });
}
