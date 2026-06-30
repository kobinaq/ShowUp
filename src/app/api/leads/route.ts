import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { notificationService } from "@/lib/services/notification.service";

const leadSchema = z.object({
  fullName: z.string().min(2).max(100),
  email: z.string().email().max(180),
  institution: z.string().min(2).max(150),
  role: z.string().min(2).max(50),
  message: z.string().max(1000).optional()
});

const buckets = new Map<string, { count: number; resetAt: number }>();
const limit = 5;
const windowMs = 60 * 60 * 1000;

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  if (!allowRequest(ip)) {
    return NextResponse.json({ error: "Too many submissions. Please try again later." }, { status: 429 });
  }

  const parsed = leadSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid submission", details: parsed.error.flatten() }, { status: 400 });
  }

  const lead = await prisma.leadInquiry.create({ data: parsed.data });

  try {
    await notificationService.sendEmail(
      process.env.LEAD_NOTIFICATION_EMAIL ?? "hello@showup.app",
      `New ShowUp demo request - ${parsed.data.institution}`,
      leadEmail(parsed.data)
    );
  } catch (error) {
    console.error("Lead notification failed", error);
  }

  return NextResponse.json({ success: true, id: lead.id });
}

function allowRequest(ip: string) {
  const now = Date.now();
  const current = buckets.get(ip);
  if (!current || current.resetAt <= now) {
    buckets.set(ip, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (current.count >= limit) return false;
  current.count += 1;
  return true;
}

function getClientIp(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip") || request.headers.get("cf-connecting-ip") || "unknown";
}

function leadEmail(lead: z.infer<typeof leadSchema>) {
  const message = lead.message ? `<p><strong>Message:</strong> ${escapeHtml(lead.message)}</p>` : "";
  return `
    <div style="font-family:Inter,Arial,sans-serif;color:#0D1F3C;line-height:1.6">
      <h1 style="margin:0 0 16px">New ShowUp demo request</h1>
      <p><strong>${escapeHtml(lead.fullName)}</strong> (${escapeHtml(lead.role)}) at <strong>${escapeHtml(lead.institution)}</strong> requested a demo.</p>
      <p><strong>Email:</strong> ${escapeHtml(lead.email)}</p>
      ${message}
    </div>
  `;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
