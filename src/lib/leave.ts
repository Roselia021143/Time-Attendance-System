import { and, gte, inArray, lte } from "drizzle-orm";
import { db, schema } from "./db";
import { leaveDays, leaveOverlaps, type LeaveSpan, type Rate } from "./pay";
import { isDate, today } from "./report";
import { addDays } from "./time";

const { leaveRequests: lr, payRates } = schema;

export const LEAVE_TYPES = ["sick", "personal", "vacation", "other"] as const;
const PARTS = ["full", "am", "pm"] as const;
const span = (from: string, to: string) => (Date.parse(to) - Date.parse(from)) / 86_400_000 + 1;

/** ตรวจคำขอลาจาก input; owner = เจ้าของร้านลงแทน (ไม่จำกัดย้อนหลัง/ล่วงหน้า) */
export async function readLeave(b: Record<string, unknown>, userId: number, owner: boolean) {
  const type = b.type as (typeof LEAVE_TYPES)[number];
  const part = (b.part ?? "full") as (typeof PARTS)[number];
  const reason = typeof b.reason === "string" ? b.reason.trim() : "";
  const { fromDate, toDate } = b;
  if (!LEAVE_TYPES.includes(type) || !PARTS.includes(part)) return "ประเภทการลาไม่ถูกต้อง";
  if (!isDate(fromDate) || !isDate(toDate) || fromDate > toDate) return "เลือกวันที่ให้ถูกต้อง";
  if (part !== "full" && fromDate !== toDate) return "ลาครึ่งวันได้เฉพาะลาวันเดียว";
  if (!reason) return "กรุณากรอกเหตุผลการลา";
  if (reason.length > 500) return "เหตุผลยาวเกินไป";
  if (span(fromDate, toDate) > (owner ? 60 : 30)) return `ลาได้ครั้งละไม่เกิน ${owner ? 60 : 30} วัน`;
  if (!owner) {
    if (fromDate < addDays(today(), -7)) return "ลาย้อนหลังได้ไม่เกิน 7 วัน (ให้เจ้าของร้านลงให้)";
    if (toDate > addDays(today(), 90)) return "ลาล่วงหน้าได้ไม่เกิน 90 วัน";
  }
  const l: LeaveSpan = { fromDate, toDate, part };
  if (leaveDays(l) === 0) return "ช่วงที่เลือกเป็นวันหยุดทั้งหมด";
  const existing = await activeLeaves([userId], fromDate, toDate, ["pending", "approved"]);
  if (existing.some((e) => leaveOverlaps(e, l))) return "ช่วงนี้มีคำขอลาอยู่แล้ว";
  return { ...l, type, reason };
}

/** คำขอลาที่ทับช่วง from..to */
export function activeLeaves(userIds: number[], from: string, to: string, status: ("pending" | "approved")[] = ["approved"]) {
  if (!userIds.length) return Promise.resolve([]);
  return db().select().from(lr).where(and(
    inArray(lr.userId, userIds), inArray(lr.status, status), lte(lr.fromDate, to), gte(lr.toDate, from),
  ));
}

/** userId -> จำนวนวันลา (อนุมัติแล้ว) ในช่วง */
export async function leaveDaysByUser(userIds: number[], from: string, to: string) {
  const out: Record<number, number> = {};
  for (const l of await activeLeaves(userIds, from, to)) out[l.userId] = (out[l.userId] ?? 0) + leaveDays(l, from, to);
  return out;
}

/** userId -> ประวัติค่าแรง */
export async function ratesByUser(userIds: number[]) {
  const out: Record<number, Rate[]> = {};
  if (!userIds.length) return out;
  for (const r of await db().select().from(payRates).where(inArray(payRates.userId, userIds))) (out[r.userId] ??= []).push(r);
  return out;
}
