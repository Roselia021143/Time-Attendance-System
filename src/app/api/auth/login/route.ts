import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { createSession, err, sessionCookie, verifyPassword, body } from "@/lib/auth";

const { users } = schema;

export async function POST(req: Request) {
  const { username, password } = await body(req);
  if (typeof username !== "string" || typeof password !== "string") return err(400, "กรอกชื่อผู้ใช้และรหัสผ่าน");
  const d = db();
  const [u] = await d.select().from(users).where(eq(users.username, username.trim()));
  const bad = err(401, "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง");
  if (!u || !u.active) return bad;
  if (u.lockedUntil > Date.now()) return err(423, "ล็อกชั่วคราว 15 นาที เนื่องจากใส่รหัสผิดหลายครั้ง");
  if (!(await verifyPassword(password, u.passwordHash))) {
    const n = u.failedLogins + 1;
    await d.update(users)
      .set(n >= 5 ? { failedLogins: 0, lockedUntil: Date.now() + 15 * 60_000 } : { failedLogins: n })
      .where(eq(users.id, u.id));
    return bad;
  }
  await d.update(users).set({ failedLogins: 0, lockedUntil: 0 }).where(eq(users.id, u.id));
  const token = await createSession(u.id);
  return Response.json({ token, role: u.role }, { headers: { "set-cookie": sessionCookie(token) } });
}
