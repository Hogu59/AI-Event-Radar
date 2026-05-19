import { NextRequest } from 'next/server';
import { createSupabaseServerClient } from '@/lib/db/supabase';
import { ok, fail, handleUnknownError } from '@/lib/utils/response';
import { getCurrentUser } from '@/lib/utils/auth';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createSupabaseServerClient();
    const { data: event, error } = await supabase
      .from('events')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    if (!event) return fail('NOT_FOUND', '행사를 찾을 수 없습니다.');

    const user = await getCurrentUser();
    let is_bookmarked = false;
    if (user) {
      const { data: bm } = await supabase
        .from('bookmarks')
        .select('id')
        .eq('user_id', user.id)
        .eq('event_id', id)
        .maybeSingle();
      is_bookmarked = !!bm;
    }

    return ok({ event: { ...event, ...(user ? { is_bookmarked } : {}) } });
  } catch (e) {
    return handleUnknownError(e);
  }
}
