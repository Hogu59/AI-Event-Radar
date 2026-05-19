import { z } from 'zod';

export const PaginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  page_size: z.coerce.number().int().min(1).max(100).default(20),
});

export type Pagination = z.infer<typeof PaginationSchema>;

export function rangeFor({ page, page_size }: Pagination): [number, number] {
  const from = (page - 1) * page_size;
  const to = from + page_size - 1;
  return [from, to];
}

export function buildPaginationMeta({
  page,
  page_size,
  total,
}: Pagination & { total: number }) {
  return {
    page,
    page_size,
    total,
    total_pages: Math.max(1, Math.ceil(total / page_size)),
  };
}
