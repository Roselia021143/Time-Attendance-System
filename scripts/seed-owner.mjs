// สร้างบัญชีเจ้าของร้าน: OWNER_USERNAME=... OWNER_PASSWORD=... node scripts/seed-owner.mjs --local|--remote
import { execFileSync } from "node:child_process";
import { writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const { OWNER_USERNAME: user, OWNER_PASSWORD: pass, OWNER_FIRST = "เจ้าของ", OWNER_LAST = "ร้าน" } = process.env;
const target = process.argv[2];
if (!user || !pass || pass.length < 6 || !["--local", "--remote"].includes(target)) {
  console.error("ใช้: OWNER_USERNAME=owner OWNER_PASSWORD=รหัส(≥6) node scripts/seed-owner.mjs --local|--remote");
  process.exit(1);
}
if (!/^[a-zA-Z0-9._-]{3,32}$/.test(user)) throw new Error("username ไม่ถูกต้อง");

// รูปแบบเดียวกับ src/lib/auth.ts
const ITER = 100_000;
const salt = crypto.getRandomValues(new Uint8Array(16));
const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(pass), "PBKDF2", false, ["deriveBits"]);
const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations: ITER }, key, 256);
const b64 = (b) => Buffer.from(b).toString("base64");
const hash = `pbkdf2$${ITER}$${b64(salt)}$${b64(bits)}`;

const q = (s) => `'${s.replace(/'/g, "''")}'`;
const sql = `INSERT INTO users (username, password_hash, role, first_name, last_name, created_at)
VALUES (${q(user)}, ${q(hash)}, 'owner', ${q(OWNER_FIRST)}, ${q(OWNER_LAST)}, ${Date.now()})
ON CONFLICT(username) DO UPDATE SET password_hash = excluded.password_hash, role = 'owner', active = 1;`;

// ส่งผ่านไฟล์ เพราะ cmd.exe บน Windows ทำ quote ใน --command เพี้ยน
const file = join(tmpdir(), `seed-owner-${Date.now()}.sql`);
writeFileSync(file, sql);
try {
  execFileSync("npx", ["wrangler", "d1", "execute", "DB", target, `--file=${file}`, "--yes"], { stdio: "inherit", shell: process.platform === "win32" });
} finally {
  rmSync(file);
}
console.log(`สร้าง/อัปเดตบัญชีเจ้าของร้าน "${user}" แล้ว`);
