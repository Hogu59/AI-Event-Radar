import { NextRequest } from 'next/server';
import { z } from 'zod';
import { createSupabaseServerClient } from '@/lib/db/supabase';
import { ok, handleUnknownError } from '@/lib/utils/response';
import { PaginationSchema, buildPaginationMeta, rangeFor } from '@/lib/utils/pagination';

const csv = (s?: string) => (s ? s.split(',').map((v) => v.trim()).filter(Boolean) : undefined);

const Query = z.object({
  q: z.string().optional(),
  sources: z.string().optional(),
  location_types: z.string().optional(),
  cities: z.string().optional(),
  categories: z.string().optional(),
  start_after: z.string().datetime().optional(),
  start_before: z.string().datetime().optional(),
  is_ai_related: z
    .union([z.literal('true'), z.literal('false')])
    .optional()
    .default('true'),
  sort: z
    .enum(['start_at_asc', 'start_at_desc', 'collected_at_desc'])
    .default('start_at_asc'),
});

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const parsed = Query.parse(Object.fromEntries(sp.entries()));
    const pag = PaginationSchema.parse({
      page: sp.get('page') ?? undefined,
      page_size: sp.get('page_size') ?? undefined,
    });

    const supabase = await createSupabaseServerClient();
    let query = supabase
      .from('events')
      .select(
        'id, source, source_url, title, description, start_at, end_at, timezone, location_type, location_name, city, country, host_name, price, categories, keywords_matched, thumbnail_url, is_ai_related, collected_at',
        { count: 'exact' },
      );

    if (parsed.is_ai_related === 'true') query = query.eq('is_ai_related', true);
    const sources = csv(parsed.sources);
    if (sources && sources.length) query = query.in('source', sources);
    const locTypes = csv(parsed.location_types);
    if (locTypes && locTypes.length) query = query.in('location_type', locTypes);
    const cities = csv(parsed.cities);
    if (cities && cities.length) query = query.in('city', cities);
    const cats = csv(parsed.categories);
    if (cats && cats.length) query = query.overlaps('categories', cats);
    const startAfter = parsed.start_after ?? new Date().toISOString();
    query = query.gte('start_at', startAfter);
    if (parsed.start_before) query = query.lte('start_at', parsed.start_before);
    if (parsed.q) {
      const term = parsed.q.replace(/[%_]/g, '\\$&');
      query = query.or(
        `title.ilike.%${term}%,description.ilike.%${term}%,host_name.ilike.%${term}%`,
      );
    }

    switch (parsed.sort) {
      case 'start_at_asc':
        query = query.order('start_at', { ascending: true });
        break;
      case 'start_at_desc':
        query = query.order('start_at', { ascending: false });
        break;
      case 'collected_at_desc':
        query = query.order('collected_at', { ascending: false });
        break;
    }

    const [from, to] = rangeFor(pag);
    query = query.range(from, to);

    const { data, count, error } = await query;
    if (error) throw error;

    return ok({
      events: data ?? [],
      pagination: buildPaginationMeta({ ...pag, total: count ?? 0 }),
    });
  } catch (e) {
    return handleUnknownError(e);
  }
}
