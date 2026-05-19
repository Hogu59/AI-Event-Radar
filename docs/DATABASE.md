# AIEventRadar 데이터베이스 설계

> DB: Supabase PostgreSQL 15
> 마이그레이션: `backend/migrations/00X_*.sql`
> 적용: `supabase db push` (또는 Supabase CLI)

## 1. ERD (텍스트 다이어그램)

```
┌────────────────────┐         ┌────────────────────────┐
│      users         │         │       events           │
├────────────────────┤         ├────────────────────────┤
│ id (PK, uuid)      │         │ id (PK, uuid)          │
│ email (uniq)       │         │ source (enum)          │
│ display_name       │         │ source_event_id        │
│ auth_provider      │         │ source_url             │
│ role               │         │ title                  │
│ notification_chan. │         │ description            │
│ digest_frequency   │         │ start_at               │
│ created_at         │         │ end_at                 │
│ last_active_at     │         │ timezone               │
└─────────┬──────────┘         │ location_type (enum)   │
          │                    │ location_name          │
          │                    │ city                   │
          │     ┌──────────────┤ country                │
          │     │              │ host_name              │
          │     │              │ price                  │
          │     │              │ categories (text[])    │
          │     │              │ keywords_matched (text[])│
          │     │              │ thumbnail_url          │
          │     │              │ dedupe_hash (uniq idx) │
          │     │              │ is_ai_related (bool)   │
          │     │              │ collected_at           │
          │     │              │ updated_at             │
          │     │              └─────────┬──────────────┘
          │     │                        │
          ↓     ↓                        ↓
┌────────────────────┐         ┌────────────────────────┐
│    bookmarks       │         │  source_run_logs       │
├────────────────────┤         ├────────────────────────┤
│ id (PK, uuid)      │         │ id (PK, uuid)          │
│ user_id (FK→users) │         │ source                 │
│ event_id (FK→evts) │         │ started_at             │
│ note               │         │ finished_at            │
│ created_at         │         │ status (enum)          │
│ UNIQUE(user,event) │         │ events_collected (int) │
└────────────────────┘         │ events_new (int)       │
                               │ events_updated (int)   │
┌────────────────────┐         │ error_message          │
│  subscriptions     │         │ triggered_by           │
├────────────────────┤         └────────────────────────┘
│ id (PK, uuid)      │
│ user_id (FK→users) │         ┌────────────────────────┐
│ name               │         │  notification_logs     │
│ keywords (text[])  │         ├────────────────────────┤
│ sources (text[])   │         │ id (PK, uuid)          │
│ location_types..   │         │ user_id (FK→users)     │
│ cities (text[])    │◀────────│ subscription_id (FK)   │
│ notify_on_new      │         │ event_ids (uuid[])     │
│ notify_on_deadline │         │ channel (enum)         │
│ is_active          │         │ status (enum)          │
│ created_at         │         │ sent_at                │
└─────────┬──────────┘         │ error                  │
          │                    └────────────────────────┘
          └────────────────────────────┘
```

**관계 요약**:
- `users 1 : N bookmarks`
- `users 1 : N subscriptions`
- `users 1 : N notification_logs`
- `events 1 : N bookmarks`
- `subscriptions 1 : N notification_logs`
- `source_run_logs` 독립 (FK 없음, source enum string)
- `events`는 외부 소스 데이터라 FK 대신 `source + source_event_id` 자연키 + `dedupe_hash`

---

## 2. ENUM 타입 정의

```sql
CREATE TYPE source_id AS ENUM ('festa', 'eventus', 'luma', 'dev_event', 'devpost');
CREATE TYPE location_type AS ENUM ('online', 'offline', 'hybrid');
CREATE TYPE auth_provider AS ENUM ('email', 'google');
CREATE TYPE notification_channel AS ENUM ('email');           -- Phase 2: slack, discord, telegram
CREATE TYPE digest_frequency AS ENUM ('realtime', 'daily', 'weekly', 'off');
CREATE TYPE run_status AS ENUM ('success', 'partial', 'failed');
CREATE TYPE notification_status AS ENUM ('queued', 'sent', 'failed');
CREATE TYPE user_role AS ENUM ('user', 'admin');
```

---

## 3. 테이블 정의

### 3.1 users

| 컬럼 | 타입 | NULL | 기본값 | 인덱스/제약 | 비고 |
|------|------|------|--------|------------|------|
| `id` | uuid | NO | `gen_random_uuid()` | PK | Supabase auth.users와 1:1 매핑 (id 동일) |
| `email` | text | NO | - | UNIQUE | |
| `display_name` | text | YES | NULL | - | |
| `auth_provider` | auth_provider | NO | `'email'` | - | |
| `role` | user_role | NO | `'user'` | - | 관리자는 수동 부여 |
| `notification_channel` | notification_channel | NO | `'email'` | - | MVP 이메일만 |
| `digest_frequency` | digest_frequency | NO | `'weekly'` | - | |
| `created_at` | timestamptz | NO | `now()` | - | |
| `last_active_at` | timestamptz | YES | NULL | idx | 비활성 사용자 통계 |

```sql
CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  display_name text,
  auth_provider auth_provider NOT NULL DEFAULT 'email',
  role user_role NOT NULL DEFAULT 'user',
  notification_channel notification_channel NOT NULL DEFAULT 'email',
  digest_frequency digest_frequency NOT NULL DEFAULT 'weekly',
  created_at timestamptz NOT NULL DEFAULT now(),
  last_active_at timestamptz
);

CREATE INDEX idx_users_last_active ON users(last_active_at DESC NULLS LAST);
```

---

### 3.2 events

| 컬럼 | 타입 | NULL | 기본값 | 인덱스/제약 | 비고 |
|------|------|------|--------|------------|------|
| `id` | uuid | NO | `gen_random_uuid()` | PK | |
| `source` | source_id | NO | - | idx (source, source_event_id 복합) | |
| `source_event_id` | text | NO | - | UNIQUE(source, source_event_id) | 원본 ID |
| `source_url` | text | NO | - | - | |
| `title` | text | NO | - | GIN trgm idx | 검색 |
| `description` | text | YES | NULL | GIN trgm idx | 검색 |
| `start_at` | timestamptz | NO | - | idx | 정렬/필터 |
| `end_at` | timestamptz | YES | NULL | - | |
| `timezone` | text | YES | `'Asia/Seoul'` | - | |
| `location_type` | location_type | YES | NULL | idx | |
| `location_name` | text | YES | NULL | - | |
| `city` | text | YES | NULL | idx | |
| `country` | text | YES | NULL | - | |
| `host_name` | text | YES | NULL | - | |
| `price` | text | YES | NULL | - | |
| `categories` | text[] | NO | `'{}'` | GIN idx | |
| `keywords_matched` | text[] | NO | `'{}'` | GIN idx | |
| `thumbnail_url` | text | YES | NULL | - | |
| `dedupe_hash` | text | NO | - | UNIQUE idx | sha256(slug(title)+date_bucket+city) |
| `is_ai_related` | boolean | NO | `false` | idx | 필터 디폴트 |
| `collected_at` | timestamptz | NO | `now()` | idx | |
| `updated_at` | timestamptz | NO | `now()` | - | |

```sql
CREATE TABLE events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source source_id NOT NULL,
  source_event_id text NOT NULL,
  source_url text NOT NULL,
  title text NOT NULL,
  description text,
  start_at timestamptz NOT NULL,
  end_at timestamptz,
  timezone text DEFAULT 'Asia/Seoul',
  location_type location_type,
  location_name text,
  city text,
  country text,
  host_name text,
  price text,
  categories text[] NOT NULL DEFAULT '{}',
  keywords_matched text[] NOT NULL DEFAULT '{}',
  thumbnail_url text,
  dedupe_hash text NOT NULL,
  is_ai_related boolean NOT NULL DEFAULT false,
  collected_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT events_source_event_id_uniq UNIQUE (source, source_event_id),
  CONSTRAINT events_dedupe_hash_uniq UNIQUE (dedupe_hash)
);

CREATE INDEX idx_events_start_at ON events(start_at);
CREATE INDEX idx_events_city ON events(city);
CREATE INDEX idx_events_location_type ON events(location_type);
CREATE INDEX idx_events_is_ai_related ON events(is_ai_related) WHERE is_ai_related = true;
CREATE INDEX idx_events_collected_at ON events(collected_at DESC);
CREATE INDEX idx_events_categories ON events USING GIN (categories);
CREATE INDEX idx_events_keywords_matched ON events USING GIN (keywords_matched);

-- 전문 검색용 trigram (q 파라미터 검색)
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX idx_events_title_trgm ON events USING GIN (title gin_trgm_ops);
CREATE INDEX idx_events_description_trgm ON events USING GIN (description gin_trgm_ops);

-- updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql;

CREATE TRIGGER trg_events_updated_at
BEFORE UPDATE ON events FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

---

### 3.3 bookmarks

| 컬럼 | 타입 | NULL | 기본값 | 인덱스/제약 | 비고 |
|------|------|------|--------|------------|------|
| `id` | uuid | NO | `gen_random_uuid()` | PK | |
| `user_id` | uuid | NO | - | FK→users(id) ON DELETE CASCADE, idx | |
| `event_id` | uuid | NO | - | FK→events(id) ON DELETE CASCADE | |
| `note` | text | YES | NULL | - | |
| `created_at` | timestamptz | NO | `now()` | - | |

```sql
CREATE TABLE bookmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT bookmarks_user_event_uniq UNIQUE (user_id, event_id)
);

CREATE INDEX idx_bookmarks_user_id ON bookmarks(user_id);
CREATE INDEX idx_bookmarks_event_id ON bookmarks(event_id);
```

---

### 3.4 subscriptions

| 컬럼 | 타입 | NULL | 기본값 | 인덱스/제약 | 비고 |
|------|------|------|--------|------------|------|
| `id` | uuid | NO | `gen_random_uuid()` | PK | |
| `user_id` | uuid | NO | - | FK→users(id) ON DELETE CASCADE, idx | |
| `name` | text | NO | - | - | |
| `keywords` | text[] | NO | `'{}'` | GIN idx | |
| `sources` | text[] | YES | NULL | - | NULL = 전체 |
| `location_types` | text[] | YES | NULL | - | NULL = 전체 |
| `cities` | text[] | YES | NULL | - | NULL = 전체 |
| `notify_on_new` | boolean | NO | `true` | - | |
| `notify_on_deadline` | boolean | NO | `true` | - | D-3 알림 |
| `is_active` | boolean | NO | `true` | idx (조건부 partial) | |
| `created_at` | timestamptz | NO | `now()` | - | |

```sql
CREATE TABLE subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name text NOT NULL,
  keywords text[] NOT NULL DEFAULT '{}',
  sources text[],
  location_types text[],
  cities text[],
  notify_on_new boolean NOT NULL DEFAULT true,
  notify_on_deadline boolean NOT NULL DEFAULT true,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_keywords ON subscriptions USING GIN (keywords);
CREATE INDEX idx_subscriptions_active ON subscriptions(user_id) WHERE is_active = true;
```

---

### 3.5 notification_logs

| 컬럼 | 타입 | NULL | 기본값 | 인덱스/제약 | 비고 |
|------|------|------|--------|------------|------|
| `id` | uuid | NO | `gen_random_uuid()` | PK | |
| `user_id` | uuid | NO | - | FK→users(id) ON DELETE CASCADE, idx | |
| `subscription_id` | uuid | YES | NULL | FK→subscriptions(id) ON DELETE SET NULL | 마감 알림은 null 가능 |
| `event_ids` | uuid[] | NO | `'{}'` | - | 다이제스트는 다건 |
| `channel` | notification_channel | NO | `'email'` | - | |
| `status` | notification_status | NO | `'queued'` | idx | |
| `sent_at` | timestamptz | YES | NULL | idx | |
| `error` | text | YES | NULL | - | |
| `kind` | text | NO | `'digest'` | - | digest \| realtime \| deadline_d3 |

```sql
CREATE TABLE notification_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subscription_id uuid REFERENCES subscriptions(id) ON DELETE SET NULL,
  event_ids uuid[] NOT NULL DEFAULT '{}',
  channel notification_channel NOT NULL DEFAULT 'email',
  status notification_status NOT NULL DEFAULT 'queued',
  sent_at timestamptz,
  error text,
  kind text NOT NULL DEFAULT 'digest'
);

CREATE INDEX idx_notification_logs_user_id ON notification_logs(user_id);
CREATE INDEX idx_notification_logs_status ON notification_logs(status);
CREATE INDEX idx_notification_logs_sent_at ON notification_logs(sent_at DESC NULLS LAST);
```

---

### 3.6 source_run_logs

| 컬럼 | 타입 | NULL | 기본값 | 인덱스/제약 | 비고 |
|------|------|------|--------|------------|------|
| `id` | uuid | NO | `gen_random_uuid()` | PK | |
| `source` | source_id | NO | - | idx | |
| `started_at` | timestamptz | NO | `now()` | idx (DESC) | |
| `finished_at` | timestamptz | YES | NULL | - | |
| `status` | run_status | NO | `'success'` | idx | |
| `events_collected` | int | NO | `0` | - | |
| `events_new` | int | NO | `0` | - | |
| `events_updated` | int | NO | `0` | - | |
| `error_message` | text | YES | NULL | - | |
| `triggered_by` | text | NO | `'cron'` | - | `cron` \| `manual` |

```sql
CREATE TABLE source_run_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source source_id NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  status run_status NOT NULL DEFAULT 'success',
  events_collected int NOT NULL DEFAULT 0,
  events_new int NOT NULL DEFAULT 0,
  events_updated int NOT NULL DEFAULT 0,
  error_message text,
  triggered_by text NOT NULL DEFAULT 'cron'
);

CREATE INDEX idx_source_run_logs_source ON source_run_logs(source);
CREATE INDEX idx_source_run_logs_started_at ON source_run_logs(started_at DESC);
CREATE INDEX idx_source_run_logs_status ON source_run_logs(status);
```

---

## 4. Row Level Security (RLS) 정책

Supabase에서 모든 테이블에 RLS 활성화. `auth.uid()`는 Supabase가 JWT에서 추출하는 현재 유저 ID.

```sql
-- users
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_select_self" ON users
  FOR SELECT USING (id = auth.uid());
CREATE POLICY "users_update_self" ON users
  FOR UPDATE USING (id = auth.uid());
-- INSERT는 Supabase Auth가 자동 처리 (trigger)
-- 관리자는 service_role key 사용 (RLS 우회)

-- events: 공개 읽기, 쓰기는 service_role only
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "events_select_public" ON events
  FOR SELECT USING (true);
-- INSERT/UPDATE/DELETE는 service_role만 (cron 엔드포인트)

-- bookmarks: 본인만
ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bookmarks_select_own" ON bookmarks
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "bookmarks_insert_own" ON bookmarks
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "bookmarks_delete_own" ON bookmarks
  FOR DELETE USING (user_id = auth.uid());

-- subscriptions: 본인만
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "subscriptions_select_own" ON subscriptions
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "subscriptions_insert_own" ON subscriptions
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "subscriptions_update_own" ON subscriptions
  FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "subscriptions_delete_own" ON subscriptions
  FOR DELETE USING (user_id = auth.uid());

-- notification_logs: 본인만 읽기, 쓰기는 service_role
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notif_logs_select_own" ON notification_logs
  FOR SELECT USING (user_id = auth.uid());

-- source_run_logs: 관리자만
ALTER TABLE source_run_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "source_run_logs_select_admin" ON source_run_logs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );
```

**RLS 우회 케이스**: cron 엔드포인트(`/api/cron/*`)와 관리자 API는 `SUPABASE_SERVICE_ROLE_KEY`를 사용하는 admin client로 접근 (`backend/lib/supabase/admin.ts`).

---

## 5. Supabase Auth 연동

- `auth.users` (Supabase 관리) ↔ `public.users` (애플리케이션) ID 동기화
- 신규 가입 시 트리거로 `public.users` row 자동 생성:

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, auth_provider)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE((NEW.raw_user_meta_data->>'provider')::auth_provider, 'email')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

---

## 6. 마이그레이션 파일 구성

```
backend/migrations/
├── 001_initial.sql            # ENUM 정의 + 6개 테이블 + 인덱스
├── 002_rls_policies.sql       # RLS 활성화 + 정책
├── 003_auth_trigger.sql       # auth.users → public.users 동기화 트리거
├── 004_seed_dev.sql           # 개발용 시드 (관리자 1명, mock 데이터 import)
└── README.md                  # 적용 순서/방법
```

적용 순서:
```bash
# Supabase CLI 사용 시
supabase db push

# 수동 적용 시 (Supabase SQL Editor)
# 001 → 002 → 003 순서로 실행
# 004는 dev/local에서만
```

---

## 7. 성능/용량 추정

- **events**: 연간 1만 건 예상. 인덱스 포함 약 50MB. Supabase 무료 500MB 한도 내 1년 충분.
- **notification_logs**: 일 1,000건 가정 시 연간 36만 건. 90일 retention 권장 (cron으로 cleanup).
- **source_run_logs**: 일 20건 (5소스 × 4회). 연 7,300건. 무시할 수준.
- **bookmarks/subscriptions**: 유저당 5/2건 가정, 500명 기준 약 3,500건.

전체 1년 후 예상 DB 용량: 약 100~150MB. 무료 티어 안정.

---

## 8. dedupe_hash 산출 규칙

```ts
import crypto from 'crypto';

function normalizeForHash(s: string): string {
  return s.toLowerCase()
          .replace(/[\s\p{P}]+/gu, '')   // 공백/문장부호 제거
          .normalize('NFKD');
}

function dateBucket(startAt: Date): string {
  // 같은 행사라도 분 단위는 무시. 시간대 차이 흡수 위해 일자 단위
  return startAt.toISOString().slice(0, 10);  // YYYY-MM-DD
}

function dedupeHash(event: RawEvent): string {
  const key = [
    normalizeForHash(event.title),
    dateBucket(new Date(event.start_at)),
    normalizeForHash(event.city || event.location_name || '')
  ].join('|');
  return crypto.createHash('sha256').update(key).digest('hex');
}
```

UPSERT 시 `dedupe_hash` 기준 conflict 처리:
```sql
INSERT INTO events (...) VALUES (...)
ON CONFLICT (dedupe_hash) DO UPDATE
  SET title = EXCLUDED.title,
      description = EXCLUDED.description,
      start_at = EXCLUDED.start_at,
      ...
      updated_at = now();
```
