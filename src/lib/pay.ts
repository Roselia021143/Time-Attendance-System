import { addDays } from "./time.ts";

// ---------- ค่าแรง (เงินเป็นสตางค์ทั้งหมด) ----------
export type Rate = { effectiveFrom: string; rateSatang: number; otRateSatang: number };
type PayDay = { date: string; regularMin: number; otApprovedMin: number; otPendingMin: number };

/** อัตราที่มีผลในวันนั้น = แถวล่าสุดที่ effectiveFrom <= date */
export const rateOn = (rates: Rate[], date: string) =>
  rates.filter((r) => r.effectiveFrom <= date).sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom))[0];

export function sumPay(days: PayDay[], rates: Rate[]) {
  const t = { regularMin: 0, otMin: 0, regularSatang: 0, otSatang: 0, otPendingSatang: 0, totalSatang: 0, missingRateDays: 0 };
  for (const d of days) {
    t.regularMin += d.regularMin;
    t.otMin += d.otApprovedMin;
    const r = rateOn(rates, d.date);
    if (!r) {
      if (d.regularMin + d.otApprovedMin + d.otPendingMin > 0) t.missingRateDays++;
      continue;
    }
    t.regularSatang += Math.round((d.regularMin * r.rateSatang) / 60);
    t.otSatang += Math.round((d.otApprovedMin * r.otRateSatang) / 60);
    t.otPendingSatang += Math.round((d.otPendingMin * r.otRateSatang) / 60);
  }
  t.totalSatang = t.regularSatang + t.otSatang;
  return t;
}

// ---------- การลา ----------
export type LeaveSpan = { fromDate: string; toDate: string; part: "full" | "am" | "pm" };
// shortcut: วันหยุดประจำสัปดาห์ fix เป็นวันอาทิตย์, ย้ายไปหน้าตั้งค่าเมื่อทำปฏิทินวันหยุด
export const isDayOff = (date: string) => new Date(date + "T00:00:00Z").getUTCDay() === 0;

/** จำนวนวันลาในช่วง (ตัดด้วย clipFrom..clipTo ได้), ไม่นับวันหยุด, ครึ่งวัน = 0.5 */
export function leaveDays(l: LeaveSpan, clipFrom = l.fromDate, clipTo = l.toDate) {
  let n = 0;
  for (let d = l.fromDate > clipFrom ? l.fromDate : clipFrom; d <= l.toDate && d <= clipTo; d = addDays(d, 1)) if (!isDayOff(d)) n++;
  return l.part === "full" ? n : n / 2;
}

/** ทับกันไหม: ยกเว้นครึ่งเช้า + ครึ่งบ่ายของวันเดียวกัน */
export function leaveOverlaps(a: LeaveSpan, b: LeaveSpan) {
  if (a.fromDate > b.toDate || b.fromDate > a.toDate) return false;
  const halves = a.part !== "full" && b.part !== "full" && a.part !== b.part;
  return !(halves && a.fromDate === a.toDate && b.fromDate === b.toDate);
}

