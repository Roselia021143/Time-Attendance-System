import { eq } from "drizzle-orm";
import { auth, err, hashPassword, verifyPassword, body } from "@/lib/auth";
import { db, schema } from "@/lib/db";

export async function POST(req: Request) {
  const u = await auth(req);
  if (u instanceof Response) return u;
  const { current, next } = await body(req);
  if (typeof current !== "string" || !(await verifyPassword(current, u.passwordHash))) return err(400, "รหัสผ่านเดิมไม่ถูกต้อง");
  if (typeof next !== "string" || next.length < 6) return err(400, "รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร");
  await db().update(schema.users).set({ passwordHash: await hashPassword(next) }).where(eq(schema.users.id, u.id));
  return Response.json({ ok: true });
}
