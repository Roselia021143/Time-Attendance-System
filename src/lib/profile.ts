const PROFILE = ["firstName", "lastName", "nickname", "phone", "lineId"] as const;

/** ตรวจ input ฟอร์มพนักงาน ใช้ร่วมกับ PATCH */
export function readProfile(b: Record<string, unknown>, partial: boolean) {
  const out: Partial<Record<(typeof PROFILE)[number] | "username", string>> = {};
  for (const k of [...PROFILE, "username"] as const) {
    if (b[k] === undefined && partial) continue;
    const v = typeof b[k] === "string" ? (b[k] as string).trim() : "";
    if (v.length > 100) return `${k} ยาวเกินไป`;
    out[k] = v;
  }
  if (!partial || out.username !== undefined) {
    if (!/^[a-zA-Z0-9._-]{3,32}$/.test(out.username ?? "")) return "username ต้องเป็น a-z, 0-9, . _ - ความยาว 3-32";
  }
  if ((!partial || out.firstName !== undefined) && !out.firstName) return "กรอกชื่อจริง";
  if ((!partial || out.lastName !== undefined) && !out.lastName) return "กรอกนามสกุล";
  return out;
}
