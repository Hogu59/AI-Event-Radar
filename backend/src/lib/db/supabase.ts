import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env: ${name}`);
  return v;
}

/**
 * Server-side Supabase client bound to the current request's cookies.
 * RLS applies (acts as the logged-in user, or anonymous).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function createSupabaseServerClient(): Promise<any> {
  const cookieStore = await cookies();
  const url = requireEnv('NEXT_PUBLIC_SUPABASE_URL');
  const anon = requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');

  return createServerClient(url, anon, {
    db: { schema: 'aieventradar' },
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }: { name: string; value: string; options: CookieOptions }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Route handlers that don't allow set will throw; safe to ignore in read paths.
        }
      },
    },
  });
}
