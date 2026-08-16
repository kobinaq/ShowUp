import { rotateDueReps } from "@/lib/services/rotation.service";

async function rotate(request: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected || request.headers.get("authorization") !== `Bearer ${expected}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await rotateDueReps();
  return Response.json({ data: result });
}

export const GET = rotate;
export const POST = rotate;
