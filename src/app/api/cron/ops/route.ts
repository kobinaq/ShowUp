import { authorizeCron } from "@/lib/cron/authorize";
import { runOpsJobs } from "@/lib/services/ops-jobs";

async function run(request: Request) {
  if (!authorizeCron(request.headers.get("authorization"), process.env.CRON_SECRET)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await runOpsJobs();
  return Response.json({ data: result });
}

export const GET = run;
export const POST = run;
