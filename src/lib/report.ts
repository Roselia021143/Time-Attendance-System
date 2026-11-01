import { and, between, eq, gte, inArray, isNull, lte } from "drizzle-orm";
import { db, schema } from "./db";
import { bkkDate, computeDay, toMs, type Rules } from "./time";

const { workSessions, dayRecords, settings, leaveRequests } = schema;

export const today = () => bkkDate(Date.now());

export async function currentRules(): Promise<Rules> {
  const [row] = await db().select().from(settings).where(eq(settings.id, 1));
  return JSON.parse(row.rules);
}

/** สร้างแถว day_records ของวันนั้นถ้ายังไม่มี โดย snapshot กฎปัจจุบัน */
export async function ensureDay(userId: number, workDate: string) {
  await db()
    .insert(dayRecords)
    .values({ userId, workDate, rules: JSON.stringify(await currentRules()) })
    .onConflictDoNothing();
}

export type Day = ReturnType<typeof computeDay> & {
  userId: number;
  date: string;
  sessions: { id: number; clockIn: number; clockOut: number | null; edited: boolean }[];
};

/** รายวันที่มีการลงเวลา ของ userIds ในช่วง from..to */
export async function getDays(userIds: number[], from: string, to: string): Promise<Day[]> {
  if (!userIds.length) return [];
  const d = db();
  const [ws, recs, leaves] = await Promise.all([
    d.select().from(workSessions)
      .where(and(inArray(workSessions.userId, userIds), between(workSessions.workDate, from, to)))
      .orderBy(workSessions.clockIn),
    d.select().from(dayRecords)
      .where(and(inArray(dayRecords.userId, userIds), between(dayRecords.workDate, from, to))),
    // ลาที่อนุมัติแล้ว ใช้ปรับการนับมาสาย
    d.select().from(leaveRequests).where(and(
      inArray(leaveRequests.userId, userIds), eq(leaveRequests.status, "approved"),
      lte(leaveRequests.fromDate, to), gte(leaveRequests.toDate, from),
    )),
  ]);
  const leaveOn = (userId: number, date: string) =>
    leaves.find((l) => l.userId === userId && l.fromDate <= date && date <= l.toDate)?.part;
  const rec = new Map(recs.map((r) => [`${r.userId}|${r.workDate}`, r]));
  const groups = new Map<string, typeof ws>();
  for (const s of ws) {
    const k = `${s.userId}|${s.workDate}`;
    groups.set(k, [...(groups.get(k) ?? []), s]);
  }
  const fallback = await currentRules();
  const t = today();
  return [...groups].map(([k, list]) => {
    const r = rec.get(k);
    const rules = r ? JSON.parse(r.rules) : fallback;
    return {
      userId: list[0].userId,
      date: list[0].workDate,
      sessions: list.map(({ id, clockIn, clockOut, edited }) => ({ id, clockIn, clockOut, edited })),
      ...computeDay(rules, list, r?.otApprovedMin ?? null, t, list[0].workDate, leaveOn(list[0].userId, list[0].workDate)),
    };
  }).sort((a, b) => a.date.localeCompare(b.date));
}

export function totals(days: Day[]) {
  return days.reduce(
    (t, d) => ({
      daysWorked: t.daysWorked + 1,
      regularMin: t.regularMin + d.regularMin,
      otApprovedMin: t.otApprovedMin + d.otApprovedMin,
      otPendingMin: t.otPendingMin + d.otPendingMin,
      lateDays: t.lateDays + (d.lateMin > 0 ? 1 : 0),
      lateMin: t.lateMin + d.lateMin,
      forgotten: t.forgotten + (d.forgotten ? 1 : 0),
    }),
    { daysWorked: 0, regularMin: 0, otApprovedMin: 0, otPendingMin: 0, lateDays: 0, lateMin: 0, forgotten: 0 },
  );
}

export const isDate = (s: unknown): s is string => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(Date.parse(s));
export const isTime = (s: unknown): s is string => typeof s === "string" && /^([01]\d|2[0-3]):[0-5]\d$|^24:00$/.test(s);

/** แปลง {date, in, out} เวลาไทยเป็น ms พร้อมตรวจ; ใช้ร่วมกับ PATCH */
export function readTimes(date: unknown, tin: unknown, tout: unknown) {
  if (!isDate(date) || !isTime(tin) || !isTime(tout)) return "กรอกวันที่และเวลาให้ครบ (HH:MM)";
  const clockIn = toMs(date, tin), clockOut = toMs(date, tout);
  if (clockOut <= clockIn) return "เวลาออกต้องหลังเวลาเข้า";
  return { clockIn, clockOut };
}

/** userId -> เวลาเข้างานของรอบที่ยังเปิดอยู่วันนี้ */
export async function workingNow() {
  const rows = await db().select().from(workSessions)
    .where(and(eq(workSessions.workDate, today()), isNull(workSessions.clockOut)));
  return Object.fromEntries(rows.map((r) => [r.userId, r.clockIn])) as Record<number, number>;
}
