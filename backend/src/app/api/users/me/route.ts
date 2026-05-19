import { NextRequest } from 'next/server';
import { z } from 'zod';
import { createSupabaseServerClient } from '@/lib/db/supabase';
import { ok, fail, handleUnknownError } from '@/lib/utils/response';
import { requireUser } from '@/lib/utils/auth';

const PatchBody = z.object({
  display_name: z.string().min(1).max(50).optional(),
  digest_frequency: z.enum(['realtime', 'daily', 'weekly', 'off']).optional(),
  notification_channel: z.literal('email').optional(),
});

const USER_COLUMNS =
  'id, email, display_name, auth_provider, role, notification_channel, digest_frequency, created_at, last_active_at';

export async function GET() {
  try {
    const user = await requireUser();
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from('users')
      .select(USER_COLUMNS)
      .eq('id', user.id)
      .maybeSingle();
    if (error) throw error;
    if (!data) return fail('NOT_FOUND', '사용자를 찾을 수 없습니다.');
    return ok({ user: data });
  } catch (e) {
    return handleUnknownError(e);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await requireUser();
    const patch = PatchBody.parse(await req.json());

    const update: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(patch)) {
      if (v !== undefined) update[k] = v;
    }

    if (Object.keys(update).length === 0) {
      return fail('BAD_REQUEST', '변경할 필드가 없습니다.');
    }

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from('users')
      .update(update)
      .eq('id', user.id)
      .select(USER_COLUMNS)
      .maybeSingle();
    if (error) throw error;
    if (!data) return fail('NOT_FOUND', '사용자를 찾을 수 없습니다.');
    return ok({ user: data });
  } catch (e) {
    return handleUnknownError(e);
  }
}
