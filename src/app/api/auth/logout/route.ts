import { logout, sessionCookie } from "@/lib/auth";

export async function POST(req: Request) {
  await logout(req);
  return Response.json({ ok: true }, { headers: { "set-cookie": sessionCookie("", 0) } });
}
