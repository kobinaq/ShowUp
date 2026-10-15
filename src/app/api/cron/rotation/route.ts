import { authorizeCron } from "@/lib/cron/authorize";
import { rotateDueReps } from "@/lib/services/rotation.service";

async function rotate(request: Request) {
  if (!authorizeCron(request.headers.get("authorization"), process.env.CRON_SECRET)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await rotateDueReps();
  return Response.json({ data: result });
}

export const GET = rotate;
export const POST = rotate;
