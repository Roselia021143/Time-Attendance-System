// กฎคำนวณชั่วโมง ทั้งหมดเป็นเวลาไทย (UTC+7 ไม่มี DST)
const TZ_MS = 7 * 3600_000;

export type Rules = { workStart: string; workEnd: string; breakStart: string; breakEnd: string };
export type Sess = { clockIn: number; clockOut: number | null };

export const bkkDate = (ms: number) => new Date(ms + TZ_MS).toISOString().slice(0, 10);
export const bkkTime = (ms: number) => new Date(ms + TZ_MS).toISOString().slice(11, 16);
const minOfDay = (ms: number) => Math.floor(((ms + TZ_MS) % 86_400_000) / 60_000);
const hm = (s: string) => Number(s.slice(0, 2)) * 60 + Number(s.slice(3, 5));
const overlap = (a: number, b: number, c: number, d: number) => Math.max(0, Math.min(b, d) - Math.max(a, c));

// วันหยุด / ลาเต็มวัน ไม่นับสาย · ลาครึ่งเช้า เริ่มนับจากเวลาจบพัก
const lateMin = (first: number | null, start: number, date: string, leave?: string) =>
  first != null && first > start && !isDayOff(date) && leave !== "full" ? first - start : 0;

/** "YYYY-MM-DD" + "HH:MM" เวลาไทย -> ms epoch */
// shortcut: วันหยุดประจำสัปดาห์ fix เป็นวันอาทิตย์, ย้ายไปหน้าตั้งค่าเมื่อทำปฏิทินวันหยุด
export const isDayOff = (date: string) => new Date(date + "T00:00:00Z").getUTCDay() === 0;

export function toMs(date: string, time: string) {
  const [y, m, d] = date.split("-").map(Number);
  return Date.UTC(y, m - 1, d) + hm(time) * 60_000 - TZ_MS;
}

/** leave = ส่วนของวันที่ลา (อนุมัติแล้ว) ใช้ปรับการนับมาสาย */
export function computeDay(rules: Rules, sessions: Sess[], otApprovedMin: number | null, today: string, date: string, leave?: "full" | "am" | "pm") {
  const S = hm(rules.workStart), E = hm(rules.workEnd), bS = hm(rules.breakStart), bE = hm(rules.breakEnd);
  let regularMin = 0, otRawMin = 0, forgotten = false, open = false;
  for (const s of sessions) {
    if (s.clockOut == null) {
      if (date < today) forgotten = true;
      else open = true;
      continue;
    }
    const a = minOfDay(s.clockIn), b = s.clockOut - s.clockIn >= 86_400_000 ? 1440 : minOfDay(s.clockOut) || 1440;
    regularMin += overlap(a, b, S, E) - overlap(a, b, Math.max(bS, S), Math.min(bE, E));
    otRawMin += overlap(a, b, E, 1440);
  }
  const first = sessions.length ? Math.min(...sessions.map((s) => minOfDay(s.clockIn))) : null;
  return {
    regularMin,
    otRawMin,
    otApprovedMin: otApprovedMin ?? 0,
    // ยังไม่ตัดสิน และไม่มีรอบลืมออก/ยังเปิดอยู่ -> รออนุมัติ
    otPendingMin: otApprovedMin == null && !open ? otRawMin : 0,
    lateMin: lateMin(first, leave === "am" ? bE : S, date, leave),
    forgotten,
    open,
  };
}

export const addDays = (date: string, n: number) => new Date(Date.parse(date) + n * 86_400_000).toISOString().slice(0, 10);

export type Period = "week" | "month" | "year";

/** ช่วงวันที่ตามปฏิทิน: สัปดาห์เริ่มวันจันทร์ / เดือน / ปี, offset = ย้อนหลังกี่ช่วง */
export function periodRange(period: Period, today: string, offset = 0) {
  if (period === "year") {
    const y = Number(today.slice(0, 4)) - offset;
    return { from: `${y}-01-01`, to: `${y}-12-31` };
  }
  if (period === "week") {
    const dow = (new Date(today).getUTCDay() + 6) % 7; // จันทร์ = 0
    const from = addDays(today, -dow - 7 * offset);
    return { from, to: addDays(from, 6) };
  }
  const [y, m] = today.split("-").map(Number);
  const first = new Date(Date.UTC(y, m - 1 - offset, 1));
  const last = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0));
  return { from: first.toISOString().slice(0, 10), to: last.toISOString().slice(0, 10) };
}
