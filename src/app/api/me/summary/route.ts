import { auth } from "@/lib/auth";
import { getDays, today, totals } from "@/lib/report";
import { periodRange } from "@/lib/time";

/** ?period=week|month&offset=0 (offset = ย้อนหลังกี่ช่วง) */
export async function GET(req: Request) {
  const u = await auth(req);
  if (u instanceof Response) return u;
  const q = new URL(req.url).searchParams;
  const period = q.get("period") === "week" ? "week" : "month";
  const offset = Math.max(0, Math.min(120, Number(q.get("offset")) || 0));
  const { from, to } = periodRange(period, today(), offset);
  const days = await getDays([u.id], from, to);
  return Response.json({ from, to, totals: totals(days), days });
}
