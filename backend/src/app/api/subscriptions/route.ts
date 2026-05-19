import { NextRequest } from 'next/server';
import { z } from 'zod';
import { createSupabaseServerClient } from '@/lib/db/supabase';
import { ok, fail, handleUnknownError } from '@/lib/utils/response';
import { requireUser } from '@/lib/utils/auth';

const SourceEnum = z.enum(['festa', 'eventus', 'luma', 'dev_event', 'devpost']);
const LocationTypeEnum = z.enum(['online', 'offline', 'hybrid']);

const CreateBody = z.object({
  name: z.string().min(1).max(100),
  keywords: z.array(z.string().min(1).max(50)).min(1).max(20),
  sources: z.array(SourceEnum).nullable().optional(),
  location_types: z.array(LocationTypeEnum).nullable().optional(),
  cities: z.array(z.string().min(1).max(50)).nullable().optional(),
  notify_on_new: z.boolean().default(true),
  notify_on_deadline: z.boolean().default(true),
});

export async function GET() {
  try {
    const user = await requireUser();
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from('subscriptions')
      .select(
        'id, name, keywords, sources, location_types, cities, notify_on_new, notify_on_deadline, is_active, created_at',
      )
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return ok({ subscriptions: data ?? [] });
  } catch (e) {
    return handleUnknownError(e);
  }
}

const FREE_TIER_LIMIT = 5; // generous in MVP; tighten in Phase 2.

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = CreateBody.parse(await req.json());
    const supabase = await createSupabaseServerClient();

    const { count, error: countErr } = await supabase
      .from('subscriptions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id);
    if (countErr) throw countErr;
    if ((count ?? 0) >= FREE_TIER_LIMIT) {
      return fail('RATE_LIMITED', `구독은 최대 ${FREE_TIER_LIMIT}개까지 가능합니다.`);
    }

    const { data, error } = await supabase
      .from('subscriptions')
      .insert({
        user_id: user.id,
        name: body.name,
        keywords: body.keywords,
        sources: body.sources ?? null,
        location_types: body.location_types ?? null,
        cities: body.cities ?? null,
        notify_on_new: body.notify_on_new,
        notify_on_deadline: body.notify_on_deadline,
        is_active: true,
      })
      .select(
        'id, name, keywords, sources, location_types, cities, notify_on_new, notify_on_deadline, is_active, created_at',
      )
      .single();
    if (error) throw error;
    return ok({ subscription: data }, 201);
  } catch (e) {
    return handleUnknownError(e);
  }
}
