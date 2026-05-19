import { NextRequest } from 'next/server';
import { z } from 'zod';
import { isCronAuthorized } from '@/lib/utils/auth';
import { ok, fail, handleUnknownError } from '@/lib/utils/response';
import { runNotifications, type NotifyMode } from '@/lib/services/notifier';

const Body = z
  .object({
    mode: z.enum(['auto', 'realtime', 'daily', 'weekly', 'deadline']).default('auto'),
    dry_run: z.boolean().default(false),
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
    const mode = (body?.mode ?? 'auto') as NotifyMode;
    const dry_run = body?.dry_run ?? false;
    const report = await runNotifications({ mode, dry_run });
    return ok(report);
  } catch (e) {
    return handleUnknownError(e);
  }
}
