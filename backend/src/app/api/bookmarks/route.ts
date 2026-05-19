import { NextRequest } from 'next/server';
import { z } from 'zod';
import { createSupabaseServerClient } from '@/lib/db/supabase';
import { ok, fail, handleUnknownError } from '@/lib/utils/response';
import { requireUser } from '@/lib/utils/auth';

const CreateBody = z.object({
  event_id: z.string().uuid(),
  note: z.string().max(500).optional(),
});

export async function GET() {
  try {
    const user = await requireUser();
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from('bookmarks')
      .select('id, note, created_at, event:events(*)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return ok({ bookmarks: data ?? [] });
  } catch (e) {
    return handleUnknownError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = CreateBody.parse(await req.json());
    const supabase = await createSupabaseServerClient();

    // Confirm event exists
    const { data: event, error: evErr } = await supabase
      .from('events')
      .select('id')
      .eq('id', body.event_id)
      .maybeSingle();
    if (evErr) throw evErr;
    if (!event) return fail('NOT_FOUND', '행사가 존재하지 않습니다.');

    const { data, error } = await supabase
      .from('bookmarks')
      .insert({ user_id: user.id, event_id: body.event_id, note: body.note ?? null })
      .select('id, user_id, event_id, note, created_at')
      .single();

    if (error) {
      if (error.code === '23505') return fail('CONFLICT', '이미 북마크된 행사입니다.');
      throw error;
    }
    return ok({ bookmark: data }, 201);
  } catch (e) {
    return handleUnknownError(e);
  }
}
