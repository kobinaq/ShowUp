import { z } from "zod";

export const idSchema = z.string().min(8);
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20)
});

export function parseSearch<T extends z.ZodRawShape>(url: string, shape: T) {
  const params = Object.fromEntries(new URL(url).searchParams.entries());
  return z.object(shape).parse(params);
}
