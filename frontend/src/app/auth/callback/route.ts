import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

/**
 * Supabase Auth callback for Magic Link / OAuth.
 * - Reads `code` from the URL and exchanges it for a session.
 * - Sets auth cookies via @supabase/ssr.
 * - Redirects to `next` query param or `/my`.
 *
 * When Supabase env is missing this becomes a no-op redirect (useful for mock mode).
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? searchParams.get('redirect_to') ?? '/my';

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key || !code) {
    return NextResponse.redirect(`${origin}${next}`);
  }

  const response = NextResponse.redirect(`${origin}${next}`);
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: Record<string, unknown> }[]) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error.message)}`);
  }
  return response;
}
