import { and, eq } from "drizzle-orm";
import { auth, publicUser } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { currentRules, getDays, today } from "@/lib/report";
import { activeLeaves } from "@/lib/leave";
import { leaveCovers } from "@/lib/pay";

const { users } = schema;

/** สถานะวันนี้ของพนักงานที่เปิดใช้งานทุกคน */
export async function GET(req: Request) {
  const u = await auth(req, "owner");
  if (u instanceof Response) return u;
  const t = today();
  const emps = await db().select().from(users)
    .where(and(eq(users.role, "employee"), eq(users.active, true))).orderBy(users.firstName);
  const ids = emps.map((e) => e.id);
  const [days, leaves] = await Promise.all([getDays(ids, t, t), activeLeaves(ids, t, t)]);
  return Response.json({
    date: t,
    rules: await currentRules(),
    rows: emps.map((e) => ({
      user: publicUser(e),
      day: days.find((d) => d.userId === e.id) ?? null,
      leave: leaves.find((l) => l.userId === e.id && leaveCovers(l, t)) ?? null,
    })),
  });
}
