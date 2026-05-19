import { NextRequest } from 'next/server';
import { z } from 'zod';
import { createSupabaseServerClient } from '@/lib/db/supabase';
import { ok, fail, handleUnknownError } from '@/lib/utils/response';

const Body = z.object({
  email: z.string().email(),
  redirect_to: z.string().regex(/^\/[^\s]*$/, 'redirect_to must start with /').optional(),
});

export async function POST(req: NextRequest) {
  try {
    const json = await req.json().catch(() => ({}));
    const { email, redirect_to } = Body.parse(json);
    const supabase = await createSupabaseServerClient();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
    const emailRedirectTo = redirect_to ? new URL(redirect_to, appUrl).toString() : appUrl;

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo },
    });
    if (error) {
      if (error.message.toLowerCase().includes('rate')) {
        return fail('RATE_LIMITED', '잠시 후 다시 시도해주세요.');
      }
      return fail('EXTERNAL_ERROR', error.message);
    }
    return ok({ message: '이메일을 확인해주세요.' });
  } catch (e) {
    return handleUnknownError(e);
  }
}
