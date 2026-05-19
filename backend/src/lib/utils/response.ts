import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

export type ErrorCode =
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'BAD_REQUEST'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'INTERNAL_ERROR'
  | 'EXTERNAL_ERROR';

const HTTP_FOR_CODE: Record<ErrorCode, number> = {
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  BAD_REQUEST: 400,
  CONFLICT: 409,
  RATE_LIMITED: 429,
  INTERNAL_ERROR: 500,
  EXTERNAL_ERROR: 502,
};

export function ok<T>(data: T, status = 200): NextResponse {
  return NextResponse.json({ ok: true, data }, { status });
}

export function fail(code: ErrorCode, message: string, details?: unknown): NextResponse {
  return NextResponse.json(
    { ok: false, error: { code, message, details: details ?? undefined } },
    { status: HTTP_FOR_CODE[code] },
  );
}

export function handleUnknownError(err: unknown): NextResponse {
  if (err instanceof ZodError) {
    return fail('BAD_REQUEST', 'Validation failed', err.flatten());
  }
  const e = err as { code?: string; message?: string };
  if (e?.code === 'UNAUTHORIZED') return fail('UNAUTHORIZED', '로그인이 필요합니다.');
  if (e?.code === 'FORBIDDEN') return fail('FORBIDDEN', '권한이 없습니다.');
  if (e?.code === 'NOT_FOUND') return fail('NOT_FOUND', '리소스를 찾을 수 없습니다.');
  if (e?.code === 'CONFLICT') return fail('CONFLICT', e.message ?? '중복된 요청');
  if (e?.code === 'BAD_REQUEST') return fail('BAD_REQUEST', e.message ?? '잘못된 요청');

  // eslint-disable-next-line no-console
  console.error('[handleUnknownError]', err);
  return fail('INTERNAL_ERROR', '서버 오류가 발생했습니다.');
}

export class HttpError extends Error {
  constructor(public code: ErrorCode, message: string, public details?: unknown) {
    super(message);
  }
}
