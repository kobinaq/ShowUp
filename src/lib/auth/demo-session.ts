import { Role } from "@prisma/client";

export const DEMO_COOKIE = "showup_demo";
export const DEMO_ROLES = [
  Role.QA_OFFICER,
  Role.VC,
  Role.HOD,
  Role.CLASS_REP,
  Role.SUPER_ADMIN,
  Role.IT
] as const;

export type DemoRole = (typeof DEMO_ROLES)[number];

export type DemoSessionPayload = {
  role: DemoRole;
  phone?: string;
  exp: number;
};

export const DEMO_TTL_MS = 1000 * 60 * 60 * 8;

export function isDemoModeEnabled() {
  return Boolean(process.env.DEMO_ACCESS_TOKEN?.trim());
}

export function demoCookieOptions(maxAgeSeconds = Math.floor(DEMO_TTL_MS / 1000)) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: maxAgeSeconds
  };
}

export function roleHomeForDemo(role: Role) {
  if (role === Role.CLASS_REP) return "/rep/submit";
  if (role === Role.VC) return "/analytics";
  if (role === Role.SUPER_ADMIN || role === Role.IT) return "/admin";
  if (role === Role.HOD) return "/courses";
  return "/dashboard";
}

function signingSecret() {
  return process.env.DEMO_ACCESS_TOKEN?.trim() ?? "";
}

async function hmacSign(encoded: string) {
  const secret = signingSecret();
  if (!secret) return null;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(encoded));
  return bufferToBase64Url(signature);
}

async function hmacVerify(encoded: string, sig: string) {
  const expected = await hmacSign(encoded);
  if (!expected || expected.length !== sig.length) return false;
  let mismatch = 0;
  for (let i = 0; i < expected.length; i += 1) mismatch |= expected.charCodeAt(i) ^ sig.charCodeAt(i);
  return mismatch === 0;
}

function bufferToBase64Url(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export function verifyDemoAccessToken(token: string) {
  const expected = process.env.DEMO_ACCESS_TOKEN?.trim();
  if (!expected || !token || token.length !== expected.length) return false;
  let mismatch = 0;
  for (let i = 0; i < expected.length; i += 1) mismatch |= expected.charCodeAt(i) ^ token.charCodeAt(i);
  return mismatch === 0;
}

export async function signDemoSession(payload: Omit<DemoSessionPayload, "exp"> & { exp?: number }) {
  const body: DemoSessionPayload = {
    role: payload.role,
    phone: payload.phone?.trim() || undefined,
    exp: payload.exp ?? Date.now() + DEMO_TTL_MS
  };
  const encoded = utf8ToBase64Url(JSON.stringify(body));
  const sig = await hmacSign(encoded);
  if (!sig) throw new Error("DEMO_ACCESS_TOKEN is not configured");
  return `${encoded}.${sig}`;
}

export async function parseDemoSession(raw: string | undefined | null): Promise<DemoSessionPayload | null> {
  if (!raw || !signingSecret()) return null;
  const [encoded, sig] = raw.split(".");
  if (!encoded || !sig) return null;
  if (!(await hmacVerify(encoded, sig))) return null;
  try {
    const payload = JSON.parse(base64UrlToUtf8(encoded)) as DemoSessionPayload;
    if (!payload?.role || !DEMO_ROLES.includes(payload.role as DemoRole)) return null;
    if (!payload.exp || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

/** Fast Edge gate — shape check only; full verify happens in Node handlers. */
export function hasDemoCookieShape(raw: string | undefined | null) {
  if (!raw) return false;
  const [encoded, sig] = raw.split(".");
  return Boolean(encoded && sig && encoded.length > 8 && sig.length > 8);
}

function utf8ToBase64Url(value: string) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlToUtf8(value: string) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((value.length + 3) % 4);
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}
