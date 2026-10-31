import { eq } from "drizzle-orm";
import { auth, err, body } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { currentRules } from "@/lib/report";

const { settings } = schema;
const re = /^([01]\d|2[0-3]):[0-5]\d$/;

export async function GET(req: Request) {
  const u = await auth(req, "owner");
  if (u instanceof Response) return u;
  return Response.json(await currentRules());
}

/** มีผลกับวันที่ยังไม่มีใครลงเวลา (วันที่ลงแล้วใช้กฎที่บันทึกไว้ตอนนั้น) */
export async function PUT(req: Request) {
  const u = await auth(req, "owner");
  if (u instanceof Response) return u;
  const { workStart, workEnd, breakStart, breakEnd } = await body(req);
  if (![workStart, workEnd, breakStart, breakEnd].every((v) => typeof v === "string" && re.test(v))) return err(400, "รูปแบบเวลาต้องเป็น HH:MM");
  if (!(workStart < workEnd && breakStart <= breakEnd && workStart <= breakStart && breakEnd <= workEnd))
    return err(400, "ลำดับเวลาไม่ถูกต้อง: เริ่มงาน ≤ เริ่มพัก ≤ จบพัก ≤ เลิกงาน");
  const rules = { workStart, workEnd, breakStart, breakEnd };
  await db().update(settings).set({ rules: JSON.stringify(rules) }).where(eq(settings.id, 1));
  return Response.json(rules);
}
