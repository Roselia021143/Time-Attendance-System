import { test } from "node:test";
import assert from "node:assert/strict";
import { leaveDays, leaveOverlaps, rateOn, sumPay } from "./pay.ts";
import { periodRange } from "./time.ts";

const rates = [
  { effectiveFrom: "2026-10-01", rateSatang: 6000, otRateSatang: 9000 },
  { effectiveFrom: "2026-11-01", rateSatang: 7000, otRateSatang: 10000 },
];

test("rate history picks the rate in effect on that day", () => {
  assert.equal(rateOn(rates, "2026-09-30"), undefined);
  assert.equal(rateOn(rates, "2026-10-31")!.rateSatang, 6000);
  assert.equal(rateOn(rates, "2026-11-01")!.rateSatang, 7000);
});

test("pay sums per day with its own rate, pending OT separate, missing rate flagged", () => {
  const t = sumPay([
    { date: "2026-10-31", regularMin: 480, otApprovedMin: 30, otPendingMin: 0 }, // 480 + 45 บาท
    { date: "2026-11-02", regularMin: 450, otApprovedMin: 0, otPendingMin: 60 }, // 525 บาท, รอ 100
    { date: "2026-09-01", regularMin: 60, otApprovedMin: 0, otPendingMin: 0 }, // ไม่มีอัตรา
  ], rates);
  assert.equal(t.regularSatang, 48000 + 52500);
  assert.equal(t.otSatang, 4500);
  assert.equal(t.totalSatang, 48000 + 52500 + 4500);
  assert.equal(t.otPendingSatang, 10000);
  assert.equal(t.missingRateDays, 1);
  assert.equal(t.regularMin, 990);
});

test("leave days skip Sundays, half day = 0.5, clipping", () => {
  // ส. 31 ต.ค. – จ. 2 พ.ย. 2026 (อา. 1 พ.ย. ไม่นับ)
  assert.equal(leaveDays({ fromDate: "2026-10-31", toDate: "2026-11-02", part: "full" }), 2);
  assert.equal(leaveDays({ fromDate: "2026-11-03", toDate: "2026-11-03", part: "am" }), 0.5);
  assert.equal(leaveDays({ fromDate: "2026-10-31", toDate: "2026-11-02", part: "full" }, "2026-11-01", "2026-11-30"), 1);
});

test("overlap rules", () => {
  const am = { fromDate: "2026-11-03", toDate: "2026-11-03", part: "am" as const };
  assert.equal(leaveOverlaps(am, { ...am, part: "pm" }), false);
  assert.equal(leaveOverlaps(am, am), true);
  assert.equal(leaveOverlaps(am, { fromDate: "2026-11-01", toDate: "2026-11-05", part: "full" }), true);
  assert.equal(leaveOverlaps(am, { fromDate: "2026-11-04", toDate: "2026-11-05", part: "full" }), false);
});

test("year range", () => {
  assert.deepEqual(periodRange("year", "2026-11-01", 1), { from: "2025-01-01", to: "2025-12-31" });
});
