# AIEventRadar Backend

Next.js 15 App Router API. 5개 어댑터 (Festa, 이벤터스, Luma, Dev-Event, Devpost)에서 행사를 수집·정규화·중복제거·분류한 뒤 Supabase에 저장하고, Resend로 다이제스트를 발송합니다.

## 빠른 시작

```bash
cd backend
npm install
npx playwright install chromium   # 실 크롤링 사용 시
cp ../.env.example .env.local
# 값 채워넣기 (필수: NEXT_PUBLIC_SUPABASE_URL/ANON_KEY, SUPABASE_SERVICE_ROLE_KEY,
# RESEND_API_KEY, RESEND_FROM_EMAIL, CRON_SECRET, AUTH_SECRET, NEXT_PUBLIC_APP_URL)
USE_MOCK=true npm run dev         # 3001 포트
```

## DB 마이그레이션

`migrations/001_initial.sql`을 적용합니다.
본 마이그레이션은 `aieventradar` schema에 격리되어 같은 Supabase 프로젝트의 다른 앱과 공존 가능합니다.

> Supabase Dashboard → Project Settings → API → "Exposed schemas" 에 `aieventradar` 를 추가해야 supabase-js 가 이 schema에 접근할 수 있습니다.

```bash
# Supabase CLI
supabase db push
# 또는 Supabase Dashboard → SQL Editor에 파일 내용 붙여넣기
```

내용:
- ENUM 8종 + 6개 테이블 (users / events / bookmarks / subscriptions / notification_logs / source_run_logs), 모두 `aieventradar` schema 격리
- RLS 정책 (events 공개 읽기, 나머지는 owner 또는 admin) — 정책/인덱스/트리거 이름 모두 `aer_*` prefix
- `pg_trgm` 기반 전문 검색 인덱스
- `auth.users` → `aieventradar.users` 동기화 트리거 (트리거명 `aer_on_auth_user_created` 로 격리)

## Cron 호출

`CRON_SECRET` Bearer 토큰이 필요합니다.

```bash
# 수집
curl -X POST http://localhost:3001/api/cron/collect \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "content-type: application/json" \
  -d '{}'

# 특정 소스만
curl -X POST http://localhost:3001/api/cron/collect \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "content-type: application/json" \
  -d '{"sources":["luma","devpost"]}'

# 알림 (auto = KST 시각 기반 분기)
curl -X POST http://localhost:3001/api/cron/notify \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "content-type: application/json" \
  -d '{"mode":"auto","dry_run":false}'
```

## 폴더 구조

```
backend/
├── migrations/001_initial.sql
├── mocks/{festa,eventus,luma,dev-event,devpost}.json   # USE_MOCK=true 시 사용
└── src/
    ├── app/api/
    │   ├── auth/login/route.ts
    │   ├── events/route.ts, events/[id]/route.ts
    │   ├── bookmarks/route.ts, bookmarks/[id]/route.ts
    │   ├── subscriptions/route.ts, subscriptions/[id]/route.ts
    │   ├── cron/collect/route.ts, cron/notify/route.ts
    │   └── admin/source-runs/route.ts
    └── lib/
        ├── sources/        # SourceAdapter + 5 adapters + classifier + normalize
        ├── services/       # collector, notifier
        ├── db/             # supabase, supabase-admin
        ├── notifications/  # email (Resend), matcher
        └── utils/          # auth, pagination, date, response
```

## 환경변수 (필수만)

| 키 | 용도 |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 클라이언트 anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | cron/admin 전용 |
| `RESEND_API_KEY`, `RESEND_FROM_EMAIL` | 이메일 |
| `CRON_SECRET` | `/api/cron/*` Bearer |
| `AUTH_SECRET` | 세션 암호화 (32자+) |
| `NEXT_PUBLIC_APP_URL` | Magic Link redirect, 이메일 링크 |
| `USE_MOCK` | `true` 시 mocks/*.json 사용 |
| `ENABLE_{FESTA,EVENTUS,LUMA,DEV_EVENT,DEVPOST}` | 어댑터 토글 |
| `GITHUB_TOKEN` | Dev-Event rate limit 완화 |

전체 리스트는 `../.env.example` 참고.

## 핵심 동작

- 수집: `Promise.allSettled`로 어댑터 5개 병렬 실행 → 어댑터당 60s 타임아웃 → 각 결과를 `source_run_logs`에 기록
- 정규화: `RawEvent → NormalizedEvent`, `dedupe_hash = sha256(slug(title)+YYYY-MM-DD+city/location)`
- 분류: 30+ 키워드 사전 (LLM/GPT/Claude/RAG/Agent/LangChain/Vector DB/MLOps/Diffusion/Transformer/HuggingFace 등) → `is_ai_related`, `categories[]`, `keywords_matched[]`
- 알림: `mode=auto`는 KST 09:00에 daily, KST 월요일 09:00에 weekly, 매 시간 realtime, KST 09:00에 deadline D-3 매칭
- RLS: events 공개 읽기, 나머지는 owner-only (서비스 역할 키는 cron/admin 라우트에서만 사용)
