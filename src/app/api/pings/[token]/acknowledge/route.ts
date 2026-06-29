import { NextResponse, type NextRequest } from "next/server";
import { acknowledgePing } from "@/lib/services/ping.service";

type Params = { params: Promise<{ token: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const { token } = await params;
  const result = await acknowledgePing(token);
  const copy = {
    acknowledged: ["Response Recorded", `Thank you, ${result.lecturerName ?? "lecturer"}. Your response has been noted.`],
    already_acknowledged: ["Already Recorded", "Your response was already noted. Thank you."],
    expired: ["Link Expired", "This link has expired because class time has passed."],
    not_found: ["Invalid Link", "This link is not valid. Please contact your department."]
  }[result.status];

  return new NextResponse(buildPage(copy[0], copy[1]), { headers: { "content-type": "text/html" } });
}

function buildPage(title: string, message: string) {
  return `<!DOCTYPE html><html><body style="font-family:Inter,Arial,sans-serif;background:#F4F6F9;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0"><main style="background:white;border-radius:10px;padding:40px 28px;text-align:center;max-width:420px;width:90%"><h1 style="color:#0D1F3C;margin-bottom:8px">${title}</h1><p style="color:#6B7280">${message}</p><p style="color:#6B7280;font-size:12px;margin-top:28px">ShowUp · University Quality Assurance Platform</p></main></body></html>`;
}
