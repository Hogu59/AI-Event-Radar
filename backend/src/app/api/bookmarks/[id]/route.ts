import { NextRequest } from 'next/server';
import { createSupabaseServerClient } from '@/lib/db/supabase';
import { ok, fail, handleUnknownError } from '@/lib/utils/response';
import { requireUser } from '@/lib/utils/auth';

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const supabase = await createSupabaseServerClient();
    const { data: existing, error: selErr } = await supabase
      .from('bookmarks')
      .select('id, user_id')
      .eq('id', id)
      .maybeSingle();
    if (selErr) throw selErr;
    if (!existing) return fail('NOT_FOUND', '북마크가 없습니다.');
    if (existing.user_id !== user.id) return fail('FORBIDDEN', '본인 북마크가 아닙니다.');

    const { error } = await supabase.from('bookmarks').delete().eq('id', id);
    if (error) throw error;
    return ok({ deleted: true });
  } catch (e) {
    return handleUnknownError(e);
  }
}
