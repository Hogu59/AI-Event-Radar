import { NextRequest } from 'next/server';
import { z } from 'zod';
import { ok, handleUnknownError } from '@/lib/utils/response';
import { requireAdmin } from '@/lib/utils/auth';
import { runCollection } from '@/lib/services/collector';
import type { SourceId } from '@/lib/sources/types';

const SourceEnum = z.enum(['festa', 'eventus', 'luma', 'dev_event', 'devpost']);

const Body = z.object({
  source: z.union([SourceEnum, z.literal('all')]),
});

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const body = Body.parse(await req.json().catch(() => ({})));

    const sources: SourceId[] | undefined =
      body.source === 'all' ? undefined : [body.source as SourceId];

    // Fire-and-forget: do not await the collection so the admin UI gets an
    // immediate response. Errors are surfaced via source_run_logs by the
    // collector itself.
    void runCollection({ sources, triggered_by: 'manual' }).catch((e) => {
      // eslint-disable-next-line no-console
      console.error('[admin/source-runs/retry] collection failed:', e);
    });

    return ok({ triggered: true, source: body.source });
  } catch (e) {
    return handleUnknownError(e);
  }
}
