import { NextRequest } from 'next/server';
import { z } from 'zod';
import { isCronAuthorized } from '@/lib/utils/auth';
import { ok, fail, handleUnknownError } from '@/lib/utils/response';
import { runCollection } from '@/lib/services/collector';
import type { SourceId } from '@/lib/sources/types';

const Body = z
  .object({
    sources: z.array(z.enum(['festa', 'eventus', 'luma', 'dev_event', 'devpost'])).optional(),
  })
  .partial()
  .optional();

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    if (!isCronAuthorized(req)) return fail('UNAUTHORIZED', 'CRON_SECRET이 유효하지 않습니다.');
    const body = req.headers.get('content-length')
      ? Body.parse(await req.json().catch(() => ({})))
      : undefined;
    const summaries = await runCollection({
      sources: body?.sources as SourceId[] | undefined,
      triggered_by: 'cron',
    });
    const allFailed = summaries.length > 0 && summaries.every((s) => s.status === 'failed');
    if (allFailed) return fail('INTERNAL_ERROR', '모든 소스 수집 실패');
    return ok({ runs: summaries });
  } catch (e) {
    return handleUnknownError(e);
  }
}
