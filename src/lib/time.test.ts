import { test } from "node:test";
import assert from "node:assert/strict";
import { computeDay, periodRange, toMs, bkkDate } from "./time.ts";

const R = { workStart: "09:00", workEnd: "18:00", breakStart: "12:00", breakEnd: "13:00" };
const d = "2026-11-02";
const s = (i: string, o: string | null) => ({ clockIn: toMs(d, i), clockOut: o ? toMs(d, o) : null });

test("full day = 8h, OT after 18:00 pending, early not counted", () => {
  const r = computeDay(R, [s("08:30", "20:30")], null, "2026-11-03", d);
  assert.equal(r.regularMin, 480);
  assert.equal(r.otRawMin, 150);
  assert.equal(r.otPendingMin, 150);
  assert.equal(r.lateMin, 0);
});

test("multiple sessions, late, approved OT", () => {
  const r = computeDay(R, [s("09:20", "12:00"), s("13:00", "19:00")], 30, "2026-11-03", d);
  assert.equal(r.regularMin, 160 + 300);
  assert.equal(r.lateMin, 20);
  assert.equal(r.otApprovedMin, 30);
  assert.equal(r.otPendingMin, 0);
});

test("session closed at 00:00 next day counts to midnight", () => {
  const r = computeDay(R, [{ clockIn: toMs(d, "17:00"), clockOut: toMs("2026-11-03", "00:00") }], null, "2026-11-03", d);
  assert.equal(r.otRawMin, 360);
});

test("no late on day off (Sunday)", () => {
  const sun = "2026-11-01";
  const r = computeDay(R, [{ clockIn: toMs(sun, "10:00"), clockOut: toMs(sun, "15:00") }], null, "2026-11-02", sun);
  assert.equal(r.lateMin, 0);
  assert.equal(r.regularMin, 240); // ชั่วโมงยังนับตามกฎปกติ
});

test("forgotten vs open", () => {
  assert.equal(computeDay(R, [s("09:00", null)], null, "2026-11-03", d).forgotten, true);
  const today = computeDay(R, [s("09:00", null)], null, d, d);
  assert.equal(today.open, true);
  assert.equal(today.forgotten, false);
});

test("period ranges + bangkok date", () => {
  assert.deepEqual(periodRange("week", "2026-11-04"), { from: "2026-11-02", to: "2026-11-08" });
  assert.deepEqual(periodRange("week", "2026-11-08", 1), { from: "2026-10-26", to: "2026-11-01" });
  assert.deepEqual(periodRange("month", "2026-01-15", 1), { from: "2025-12-01", to: "2025-12-31" });
  assert.equal(bkkDate(Date.parse("2026-11-01T17:30:00Z")), "2026-11-02");
});
