import { and, eq, gt } from "drizzle-orm";
import { db, schema } from "./db";

const { users, sessions } = schema;
const ITER = 100_000; // เพดาน PBKDF2 ของ Cloudflare Workers
const SESSION_MS = 30 * 86_400_000;
const enc = new TextEncoder();
const b64 = (b: ArrayBuffer | Uint8Array) => btoa(String.fromCharCode(...new Uint8Array(b)));
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0)) as Uint8Array<ArrayBuffer>;

async function pbkdf2(password: string, salt: Uint8Array<ArrayBuffer>, iter: number) {
  const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
  return crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations: iter }, key, 256);
}

export async function hashPassword(password: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return `pbkdf2$${ITER}$${b64(salt)}$${b64(await pbkdf2(password, salt, ITER))}`;
}

export async function verifyPassword(password: string, stored: string) {
  const [, iter, salt, hash] = stored.split("$");
  const got = new Uint8Array(await pbkdf2(password, unb64(salt), Number(iter)));
  const want = unb64(hash);
  let diff = got.length ^ want.length;
  for (let i = 0; i < got.length; i++) diff |= got[i] ^ want[i];
  return diff === 0;
}

const sha256 = async (s: string) =>
  [...new Uint8Array(await crypto.subtle.digest("SHA-256", enc.encode(s)))].map((b) => b.toString(16).padStart(2, "0")).join("");

export async function createSession(userId: number) {
  const token = b64(crypto.getRandomValues(new Uint8Array(32))).replace(/[+/=]/g, "");
  await db().insert(sessions).values({ tokenHash: await sha256(token), userId, expiresAt: Date.now() + SESSION_MS });
  return token;
}

export const sessionCookie = (token: string, maxAge = SESSION_MS / 1000) =>
  `sid=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${maxAge}`;

/** token จาก cookie (เว็บ) หรือ Authorization: Bearer (แอป Flutter) */
function readToken(req: Request) {
  const bearer = req.headers.get("authorization")?.match(/^Bearer (.+)$/)?.[1];
  return bearer ?? req.headers.get("cookie")?.match(/(?:^|;\s*)sid=([^;]+)/)?.[1];
}

export async function logout(req: Request) {
  const t = readToken(req);
  if (t) await db().delete(sessions).where(eq(sessions.tokenHash, await sha256(t)));
}

export type User = typeof users.$inferSelect;

/** คืน user หรือ Response 401/403 ให้ route ส่งกลับทันที */
export async function auth(req: Request, role?: "owner"): Promise<User | Response> {
  const t = readToken(req);
  if (t) {
    const [row] = await db()
      .select({ u: users })
      .from(sessions)
      .innerJoin(users, eq(users.id, sessions.userId))
      .where(and(eq(sessions.tokenHash, await sha256(t)), gt(sessions.expiresAt, Date.now()), eq(users.active, true)));
    if (row) return role && row.u.role !== role ? err(403, "ไม่มีสิทธิ์") : row.u;
  }
  return err(401, "กรุณาเข้าสู่ระบบ");
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- ตรวจทีละ field ใน route
export const body = (req: Request) => req.json().catch(() => ({})) as Promise<Record<string, any>>;

export const err = (status: number, error: string) => Response.json({ error }, { status });

export const publicUser = ({ passwordHash, failedLogins, lockedUntil, ...u }: User) => u;
