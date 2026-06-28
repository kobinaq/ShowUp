import { Role } from "@prisma/client";
import { withAuth, json } from "@/lib/middleware/withAuth";
import { flagService } from "@/lib/services/flag.service";

type Params = { params: Promise<{ id: string }> };

export const PUT = withAuth<Params>(async (request, { params }) => {
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const flag = await flagService.resolve(id, body.internalNotes);
  return json({ data: flag });
}, [Role.SUPER_ADMIN, Role.QA_OFFICER]);
