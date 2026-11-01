import { desc, eq } from "drizzle-orm";
import { auth, body, err } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { readLeave } from "@/lib/leave";

const { leaveRequests: lr } = schema;

export async function GET(req: Request) {
  const u = await auth(req);
  if (u instanceof Response) return u;
  return Response.json(await db().select().from(lr).where(eq(lr.userId, u.id)).orderBy(desc(lr.fromDate)).limit(50));
}

/** { type, fromDate, toDate, part, reason } */
export async function POST(req: Request) {
  const u = await auth(req);
  if (u instanceof Response) return u;
  const l = await readLeave(await body(req), u.id, false);
  if (typeof l === "string") return err(400, l);
  const [row] = await db().insert(lr).values({ ...l, userId: u.id, createdBy: u.id, createdAt: Date.now() }).returning();
  return Response.json(row, { status: 201 });
}
