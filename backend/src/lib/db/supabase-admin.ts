import { createClient } from '@supabase/supabase-js';

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env: ${name}`);
  return v;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _admin: any = null;

/**
 * Service-role client — bypasses RLS.
 * Use ONLY in cron/admin routes after verifying CRON_SECRET or admin role.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getSupabaseAdmin(): any {
  if (_admin) return _admin;
  const url = requireEnv('NEXT_PUBLIC_SUPABASE_URL');
  const serviceKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY');
  _admin = createClient(url, serviceKey, {
    db: { schema: 'aieventradar' as 'public' },
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return _admin;
}
