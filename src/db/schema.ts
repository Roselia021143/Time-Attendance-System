import { sqliteTable, text, integer, primaryKey, index } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role", { enum: ["owner", "employee"] }).notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  nickname: text("nickname").notNull().default(""),
  phone: text("phone").notNull().default(""),
  lineId: text("line_id").notNull().default(""),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  failedLogins: integer("failed_logins").notNull().default(0),
  lockedUntil: integer("locked_until").notNull().default(0), // ms epoch
  createdAt: integer("created_at").notNull(),
});

export const sessions = sqliteTable("sessions", {
  tokenHash: text("token_hash").primaryKey(), // sha256 ของ token ไม่เก็บ token จริง
  userId: integer("user_id").notNull().references(() => users.id),
  expiresAt: integer("expires_at").notNull(),
});

// เวลาทั้งหมดเป็น ms epoch (UTC); workDate = วันที่ตามเวลาไทย YYYY-MM-DD
export const workSessions = sqliteTable(
  "work_sessions",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: integer("user_id").notNull().references(() => users.id),
    workDate: text("work_date").notNull(),
    clockIn: integer("clock_in").notNull(),
    clockOut: integer("clock_out"),
    edited: integer("edited", { mode: "boolean" }).notNull().default(false),
  },
  (t) => [index("ws_user_date").on(t.userId, t.workDate)],
);

// หนึ่งแถวต่อคนต่อวัน: เก็บกฎที่ใช้ ณ วันนั้น + ผลอนุมัติ OT
export const dayRecords = sqliteTable(
  "day_records",
  {
    userId: integer("user_id").notNull().references(() => users.id),
    workDate: text("work_date").notNull(),
    rules: text("rules").notNull(), // JSON ของ Rules
    otApprovedMin: integer("ot_approved_min"), // null = ยังไม่ตัดสิน, 0 = ปฏิเสธ
  },
  (t) => [primaryKey({ columns: [t.userId, t.workDate] })],
);

export const settings = sqliteTable("settings", {
  id: integer("id").primaryKey(),
  rules: text("rules").notNull(),
});

export const auditLogs = sqliteTable("audit_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  actorId: integer("actor_id").notNull(),
  action: text("action").notNull(),
  target: text("target").notNull(),
  before: text("before"),
  after: text("after"),
  reason: text("reason").notNull().default(""),
  createdAt: integer("created_at").notNull(),
});
