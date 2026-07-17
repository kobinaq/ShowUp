import { type NextRequest } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import {
  DEMO_COOKIE,
  DEMO_ROLES,
  demoCookieOptions,
  isDemoModeEnabled,
  parseDemoSession,
  roleHomeForDemo,
  signDemoSession,
  verifyDemoAccessToken,
  type DemoRole
} from "@/lib/auth/demo";
import { badRequest, json } from "@/lib/middleware/withAuth";

const roleSchema = z.enum([
  Role.QA_OFFICER,
  Role.VC,
  Role.HOD,
  Role.CLASS_REP,
  Role.SUPER_ADMIN,
  Role.IT
]);

const startSchema = z.object({
  accessToken: z.string().min(1),
  role: roleSchema.default(Role.QA_OFFICER),
  phone: z.string().min(8).max(20).optional()
});

const updateSchema = z.object({
  role: roleSchema.optional(),
  phone: z.string().min(8).max(20).nullable().optional()
});

export async function GET() {
  return json({
    enabled: isDemoModeEnabled(),
    roles: DEMO_ROLES
  });
}

export async function POST(request: NextRequest) {
  if (!isDemoModeEnabled()) return json({ error: "Live demo is not enabled on this deployment" }, { status: 503 });

  const body = startSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return badRequest("Invalid demo session request", body.error.flatten());
  if (!verifyDemoAccessToken(body.data.accessToken)) return json({ error: "Invalid demo access code" }, { status: 401 });

  const value = await signDemoSession({ role: body.data.role as DemoRole, phone: body.data.phone });
  const response = json({
    ok: true,
    role: body.data.role,
    home: roleHomeForDemo(body.data.role),
    phone: body.data.phone ?? null
  });
  response.cookies.set(DEMO_COOKIE, value, demoCookieOptions());
  return response;
}

export async function PATCH(request: NextRequest) {
  if (!isDemoModeEnabled()) return json({ error: "Live demo is not enabled on this deployment" }, { status: 503 });

  const session = await parseDemoSession(request.cookies.get(DEMO_COOKIE)?.value);
  if (!session) return json({ error: "No active demo session" }, { status: 401 });

  const body = updateSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return badRequest("Invalid demo update", body.error.flatten());

  const role = (body.data.role ?? session.role) as DemoRole;
  const phone =
    body.data.phone === null ? undefined : body.data.phone !== undefined ? body.data.phone : session.phone;
  const value = await signDemoSession({ role, phone });
  const response = json({ ok: true, role, home: roleHomeForDemo(role), phone: phone ?? null });
  response.cookies.set(DEMO_COOKIE, value, demoCookieOptions());
  return response;
}

export async function DELETE() {
  const response = json({ ok: true });
  response.cookies.set(DEMO_COOKIE, "", { ...demoCookieOptions(0), maxAge: 0 });
  return response;
}
