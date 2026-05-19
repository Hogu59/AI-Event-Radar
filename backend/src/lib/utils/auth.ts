import type { NextRequest } from 'next/server';
import { createSupabaseServerClient } from '../db/supabase';

/**
 * Validate a cron request:
 *   Authorization: Bearer ${CRON_SECRET}
 *   - or x-vercel-cron header set by Vercel scheduled invocations.
 */
export function isCronAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = req.headers.get('authorization') || '';
  if (auth === `Bearer ${secret}`) return true;
  // Vercel cron invocations set this header AND must come from Vercel infra.
  // Accept only when paired with secret in CRON_SECRET path for safety.
  return false;
}

export interface AuthedUser {
  id: string;
  email: string | null;
  role: 'user' | 'admin';
}

/**
 * Returns the current authenticated user (Supabase session) and the public.users row,
 * or null if anonymous. Throws on Supabase errors.
 */
export async function getCurrentUser(): Promise<AuthedUser | null> {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;

  const { data: row, error: rowErr } = await supabase
    .from('users')
    .select('id, email, role')
    .eq('id', user.id)
    .maybeSingle();
  if (rowErr) throw rowErr;

  return {
    id: user.id,
    email: user.email ?? row?.email ?? null,
    role: (row?.role as 'user' | 'admin') ?? 'user',
  };
}

export async function requireUser(): Promise<AuthedUser> {
  const u = await getCurrentUser();
  if (!u) {
    const err = new Error('UNAUTHORIZED');
    (err as Error & { code?: string; http?: number }).code = 'UNAUTHORIZED';
    (err as Error & { code?: string; http?: number }).http = 401;
    throw err;
  }
  return u;
}

export async function requireAdmin(): Promise<AuthedUser> {
  const u = await requireUser();
  if (u.role !== 'admin') {
    const err = new Error('FORBIDDEN');
    (err as Error & { code?: string; http?: number }).code = 'FORBIDDEN';
    (err as Error & { code?: string; http?: number }).http = 403;
    throw err;
  }
  return u;
}
