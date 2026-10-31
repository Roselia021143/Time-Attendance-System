import { and, eq, ne } from "drizzle-orm";
import { auth, err, hashPassword, publicUser, body } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { readProfile } from "@/lib/profile";

const { users, sessions } = schema;

/** แก้ข้อมูล / เปิด-ปิดใช้งาน (active) / รีเซ็ตรหัส (password) */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const u = await auth(req, "owner");
  if (u instanceof Response) return u;
  const id = Number((await params).id);
  const b = await body(req);
  const p = readProfile(b, true);
  if (typeof p === "string") return err(400, p);
  const d = db();
  const [emp] = await d.select().from(users).where(and(eq(users.id, id), eq(users.role, "employee")));
  if (!emp) return err(404, "ไม่พบพนักงาน");
  if (p.username && (await d.select({ id: users.id }).from(users).where(and(eq(users.username, p.username), ne(users.id, id)))).length)
    return err(409, "username นี้ถูกใช้แล้ว");

  const set: Partial<typeof users.$inferInsert> = { ...p };
  let kick = false;
  if (b.password !== undefined) {
    if (typeof b.password !== "string" || b.password.length < 6) return err(400, "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร");
    set.passwordHash = await hashPassword(b.password);
    set.failedLogins = 0;
    set.lockedUntil = 0;
    kick = true;
  }
  if (typeof b.active === "boolean") {
    set.active = b.active;
    kick ||= !b.active;
  }
  const [row] = await d.update(users).set(set).where(eq(users.id, id)).returning();
  if (kick) await d.delete(sessions).where(eq(sessions.userId, id));
  return Response.json(publicUser(row));
}
