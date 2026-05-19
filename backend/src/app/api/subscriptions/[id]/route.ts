import { NextRequest } from 'next/server';
import { z } from 'zod';
import { createSupabaseServerClient } from '@/lib/db/supabase';
import { ok, fail, handleUnknownError } from '@/lib/utils/response';
import { requireUser } from '@/lib/utils/auth';

const SourceEnum = z.enum(['festa', 'eventus', 'luma', 'dev_event', 'devpost']);
const LocationTypeEnum = z.enum(['online', 'offline', 'hybrid']);

const PatchBody = z.object({
  name: z.string().min(1).max(100).optional(),
  keywords: z.array(z.string().min(1).max(50)).min(1).max(20).optional(),
  sources: z.array(SourceEnum).nullable().optional(),
  location_types: z.array(LocationTypeEnum).nullable().optional(),
  cities: z.array(z.string().min(1).max(50)).nullable().optional(),
  notify_on_new: z.boolean().optional(),
  notify_on_deadline: z.boolean().optional(),
  is_active: z.boolean().optional(),
});

async function loadSub(id: string, userId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('subscriptions')
    .select('id, user_id')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return { sub: null, supabase, owned: false };
  return { sub: data, supabase, owned: data.user_id === userId };
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const patch = PatchBody.parse(await req.json());

    const { sub, supabase, owned } = await loadSub(id, user.id);
    if (!sub) return fail('NOT_FOUND', '구독을 찾을 수 없습니다.');
    if (!owned) return fail('FORBIDDEN', '본인 구독이 아닙니다.');

    const update: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(patch)) {
      if (v !== undefined) update[k] = v;
    }

    const { data, error } = await supabase
      .from('subscriptions')
      .update(update)
      .eq('id', id)
      .select(
        'id, name, keywords, sources, location_types, cities, notify_on_new, notify_on_deadline, is_active, created_at',
      )
      .single();
    if (error) throw error;
    return ok({ subscription: data });
  } catch (e) {
    return handleUnknownError(e);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const { sub, supabase, owned } = await loadSub(id, user.id);
    if (!sub) return fail('NOT_FOUND', '구독을 찾을 수 없습니다.');
    if (!owned) return fail('FORBIDDEN', '본인 구독이 아닙니다.');

    const { error } = await supabase.from('subscriptions').delete().eq('id', id);
    if (error) throw error;
    return ok({ deleted: true });
  } catch (e) {
    return handleUnknownError(e);
  }
}
