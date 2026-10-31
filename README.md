# Time Attendance System

ระบบลงเวลาเข้า-ออกงานสำหรับร้าน (Phase 1)

Next.js + Tailwind บน Cloudflare Workers (OpenNext) + D1 — spec อยู่ใน Project: `spec-phase1.md`

## เริ่มต้นบนเครื่อง

```bash
npm install
npm run db:migrate:local
# สร้างบัญชีเจ้าของร้าน (PowerShell: $env:OWNER_USERNAME="owner"; $env:OWNER_PASSWORD="รหัสผ่าน"; npm run seed:local)
OWNER_USERNAME=owner OWNER_PASSWORD=รหัสผ่าน npm run seed:local
npm run dev          # http://localhost:3000
npm test             # ทดสอบกฎคำนวณชั่วโมง
```

## Deploy ขึ้น Cloudflare

```bash
npx wrangler login
npx wrangler d1 create checkin-db      # คัดลอก database_id ไปใส่ใน wrangler.jsonc
npm run db:migrate:remote
OWNER_USERNAME=owner OWNER_PASSWORD=รหัสผ่าน npm run seed:remote
npm run deploy
```

เปลี่ยนตาราง: แก้ `src/db/schema.ts` → `npm run db:generate` → migrate

## โครงสร้าง

| ที่ | ทำอะไร |
|---|---|
| `src/lib/time.ts` | กฎคำนวณชั่วโมง/OT/สาย/ลืมออก (เวลาไทย) + test |
| `src/lib/auth.ts` | PBKDF2, session token (cookie `sid` หรือ `Authorization: Bearer`) |
| `src/lib/report.ts` | ดึงข้อมูลรายวัน + รวมยอด |
| `src/app/api/**` | API ทั้งหมด (ใช้ต่อกับแอป Flutter ใน Phase 3 ได้) |
| `/login` `/clock` `/admin` | หน้าเว็บ |

## API

| Method | Path | ใคร |
|---|---|---|
| POST | `/api/auth/login` `{username,password}` → `{token, role}` | ทุกคน |
| POST | `/api/auth/logout` | ทุกคน |
| GET | `/api/me` | login แล้ว |
| POST | `/api/me/password` `{current,next}` | login แล้ว |
| POST | `/api/clock` (สลับ เข้า/ออก) | login แล้ว |
| GET | `/api/me/summary?period=week\|month&offset=0` | login แล้ว |
| GET/POST | `/api/admin/employees` | owner |
| PATCH | `/api/admin/employees/:id` (ข้อมูล, `active`, `password`) | owner |
| GET | `/api/admin/employees/:id/days?month=YYYY-MM` | owner |
| GET | `/api/admin/today` (สถานะวันนี้) | owner |
| GET | `/api/admin/summary?month=YYYY-MM[&format=csv]` | owner |
| GET | `/api/admin/pending` | owner |
| POST | `/api/admin/ot` `{userId,date,minutes}` (0 = ปฏิเสธ) | owner |
| POST | `/api/admin/sessions` `{userId,date,in,out,reason}` | owner |
| PATCH/DELETE | `/api/admin/sessions/:id` | owner |
| GET/PUT | `/api/admin/settings` | owner |
