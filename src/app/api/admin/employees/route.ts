import { eq } from "drizzle-orm";
import { auth, err, hashPassword, publicUser, body } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { readProfile } from "@/lib/profile";
import { today, workingNow } from "@/lib/report";
import { ratesByUser } from "@/lib/leave";
import { rateOn } from "@/lib/pay";

const { users } = schema;
export async function GET(req: Request) {
  const u = await auth(req, "owner");
  if (u instanceof Response) return u;
  const list = await db().select().from(users).where(eq(users.role, "employee")).orderBy(users.firstName);
  const [working, rates] = await Promise.all([workingNow(), ratesByUser(list.map((e) => e.id))]);
  return Response.json(list.map((e) => ({ ...publicUser(e), workingSince: working[e.id] ?? null, rate: rateOn(rates[e.id] ?? [], today()) ?? null })));
}

export async function POST(req: Request) {
  const u = await auth(req, "owner");
  if (u instanceof Response) return u;
  const b = await body(req);
  const p = readProfile(b, false);
  if (typeof p === "string") return err(400, p);
  if (typeof b.password !== "string" || b.password.length < 6) return err(400, "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร");
  const d = db();
  if ((await d.select({ id: users.id }).from(users).where(eq(users.username, p.username!))).length) return err(409, "username นี้ถูกใช้แล้ว");
  const [row] = await d.insert(users).values({
    ...(p as Required<typeof p>),
    role: "employee",
    passwordHash: await hashPassword(b.password),
    createdAt: Date.now(),
  }).returning();
  return Response.json(publicUser(row), { status: 201 });
}
