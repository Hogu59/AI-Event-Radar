import { NextRequest } from 'next/server';
import { z } from 'zod';
import { getSupabaseAdmin } from '@/lib/db/supabase-admin';
import { ok, handleUnknownError } from '@/lib/utils/response';
import { requireAdmin } from '@/lib/utils/auth';

const Query = z.object({
  source: z.enum(['festa', 'eventus', 'luma', 'dev_event', 'devpost']).optional(),
  status: z.enum(['success', 'partial', 'failed']).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const sp = req.nextUrl.searchParams;
    const parsed = Query.parse(Object.fromEntries(sp.entries()));

    const admin = getSupabaseAdmin();
    let query = admin
      .from('source_run_logs')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(parsed.limit);

    if (parsed.source) query = query.eq('source', parsed.source);
    if (parsed.status) query = query.eq('status', parsed.status);

    const { data: runs, error } = await query;
    if (error) throw error;

    const since24h = new Date(Date.now() - 86_400_000).toISOString();
    const { data: stats } = await admin
      .from('source_run_logs')
      .select('status, events_new')
      .gte('started_at', since24h);

    const stats_24h = {
      total_runs: stats?.length ?? 0,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      successful: stats?.filter((r: any) => r.status === 'success').length ?? 0,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      failed: stats?.filter((r: any) => r.status === 'failed').length ?? 0,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      total_new_events: (stats ?? []).reduce((acc: number, r: any) => acc + (r.events_new ?? 0), 0),
    };

    return ok({ runs: runs ?? [], stats_24h });
  } catch (e) {
    return handleUnknownError(e);
  }
}
