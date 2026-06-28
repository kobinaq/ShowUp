import { coverageService } from "@/lib/services/coverage.service";
import { withAuth, json } from "@/lib/middleware/withAuth";

type Params = { params: { courseId: string } };

export const GET = withAuth<Params>(async (_request, { params }) => {
  return json({ data: await coverageService.calculate(params.courseId) });
});
