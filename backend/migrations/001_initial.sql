-- AIEventRadar initial migration
-- Apply via: supabase db push  OR  paste into Supabase SQL Editor (one block at a time)
--
-- NOTE: 본 마이그레이션은 `aieventradar` schema에 격리되어 같은 Supabase 프로젝트의
--       다른 앱(`public` schema 등)과 충돌 없이 공존합니다.

-- ============================================================
-- 0. Schema (isolation namespace)
-- ============================================================
CREATE SCHEMA IF NOT EXISTS aieventradar;

-- ============================================================
-- 1. Extensions  (extensions는 보통 public/extensions schema에 설치되며 schema-agnostic)
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================================
-- 2. ENUM types (all under aieventradar schema)
-- ============================================================
DO $$ BEGIN
  CREATE TYPE aieventradar.source_id AS ENUM ('festa', 'eventus', 'luma', 'dev_event', 'devpost');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE aieventradar.location_type AS ENUM ('online', 'offline', 'hybrid');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE aieventradar.auth_provider AS ENUM ('email', 'google');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE aieventradar.notification_channel AS ENUM ('email');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE aieventradar.digest_frequency AS ENUM ('realtime', 'daily', 'weekly', 'off');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE aieventradar.run_status AS ENUM ('success', 'partial', 'failed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE aieventradar.notification_status AS ENUM ('queued', 'sent', 'failed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE aieventradar.user_role AS ENUM ('user', 'admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- 3. users
-- ============================================================
CREATE TABLE IF NOT EXISTS aieventradar.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  display_name text,
  auth_provider aieventradar.auth_provider NOT NULL DEFAULT 'email',
  role aieventradar.user_role NOT NULL DEFAULT 'user',
  notification_channel aieventradar.notification_channel NOT NULL DEFAULT 'email',
  digest_frequency aieventradar.digest_frequency NOT NULL DEFAULT 'weekly',
  created_at timestamptz NOT NULL DEFAULT now(),
  last_active_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_aer_users_last_active ON aieventradar.users(last_active_at DESC NULLS LAST);

-- ============================================================
-- 4. events
-- ============================================================
CREATE TABLE IF NOT EXISTS aieventradar.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source aieventradar.source_id NOT NULL,
  source_event_id text NOT NULL,
  source_url text NOT NULL,
  title text NOT NULL,
  description text,
  start_at timestamptz NOT NULL,
  end_at timestamptz,
  timezone text DEFAULT 'Asia/Seoul',
  location_type aieventradar.location_type,
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

CREATE INDEX IF NOT EXISTS idx_aer_events_start_at ON aieventradar.events(start_at);
CREATE INDEX IF NOT EXISTS idx_aer_events_city ON aieventradar.events(city);
CREATE INDEX IF NOT EXISTS idx_aer_events_location_type ON aieventradar.events(location_type);
CREATE INDEX IF NOT EXISTS idx_aer_events_is_ai_related ON aieventradar.events(is_ai_related) WHERE is_ai_related = true;
CREATE INDEX IF NOT EXISTS idx_aer_events_collected_at ON aieventradar.events(collected_at DESC);
CREATE INDEX IF NOT EXISTS idx_aer_events_categories ON aieventradar.events USING GIN (categories);
CREATE INDEX IF NOT EXISTS idx_aer_events_keywords_matched ON aieventradar.events USING GIN (keywords_matched);
CREATE INDEX IF NOT EXISTS idx_aer_events_title_trgm ON aieventradar.events USING GIN (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_aer_events_description_trgm ON aieventradar.events USING GIN (description gin_trgm_ops);

CREATE OR REPLACE FUNCTION aieventradar.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_aer_events_updated_at ON aieventradar.events;
CREATE TRIGGER trg_aer_events_updated_at
BEFORE UPDATE ON aieventradar.events FOR EACH ROW EXECUTE FUNCTION aieventradar.update_updated_at();

-- ============================================================
-- 5. bookmarks
-- ============================================================
CREATE TABLE IF NOT EXISTS aieventradar.bookmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES aieventradar.users(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES aieventradar.events(id) ON DELETE CASCADE,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT bookmarks_user_event_uniq UNIQUE (user_id, event_id)
);

CREATE INDEX IF NOT EXISTS idx_aer_bookmarks_user_id ON aieventradar.bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_aer_bookmarks_event_id ON aieventradar.bookmarks(event_id);

-- ============================================================
-- 6. subscriptions
-- ============================================================
CREATE TABLE IF NOT EXISTS aieventradar.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES aieventradar.users(id) ON DELETE CASCADE,
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

CREATE INDEX IF NOT EXISTS idx_aer_subscriptions_user_id ON aieventradar.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_aer_subscriptions_keywords ON aieventradar.subscriptions USING GIN (keywords);
CREATE INDEX IF NOT EXISTS idx_aer_subscriptions_active ON aieventradar.subscriptions(user_id) WHERE is_active = true;

-- ============================================================
-- 7. notification_logs
-- ============================================================
CREATE TABLE IF NOT EXISTS aieventradar.notification_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES aieventradar.users(id) ON DELETE CASCADE,
  subscription_id uuid REFERENCES aieventradar.subscriptions(id) ON DELETE SET NULL,
  event_ids uuid[] NOT NULL DEFAULT '{}',
  channel aieventradar.notification_channel NOT NULL DEFAULT 'email',
  status aieventradar.notification_status NOT NULL DEFAULT 'queued',
  sent_at timestamptz,
  error text,
  kind text NOT NULL DEFAULT 'digest'
);

CREATE INDEX IF NOT EXISTS idx_aer_notification_logs_user_id ON aieventradar.notification_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_aer_notification_logs_status ON aieventradar.notification_logs(status);
CREATE INDEX IF NOT EXISTS idx_aer_notification_logs_sent_at ON aieventradar.notification_logs(sent_at DESC NULLS LAST);

-- ============================================================
-- 8. source_run_logs
-- ============================================================
CREATE TABLE IF NOT EXISTS aieventradar.source_run_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source aieventradar.source_id NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  status aieventradar.run_status NOT NULL DEFAULT 'success',
  events_collected int NOT NULL DEFAULT 0,
  events_new int NOT NULL DEFAULT 0,
  events_updated int NOT NULL DEFAULT 0,
  error_message text,
  triggered_by text NOT NULL DEFAULT 'cron'
);

CREATE INDEX IF NOT EXISTS idx_aer_source_run_logs_source ON aieventradar.source_run_logs(source);
CREATE INDEX IF NOT EXISTS idx_aer_source_run_logs_started_at ON aieventradar.source_run_logs(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_aer_source_run_logs_status ON aieventradar.source_run_logs(status);

-- ============================================================
-- 9. Row Level Security policies
-- ============================================================

-- users: self select/update
ALTER TABLE aieventradar.users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "aer_users_select_self" ON aieventradar.users;
CREATE POLICY "aer_users_select_self" ON aieventradar.users
  FOR SELECT USING (id = auth.uid());
DROP POLICY IF EXISTS "aer_users_update_self" ON aieventradar.users;
CREATE POLICY "aer_users_update_self" ON aieventradar.users
  FOR UPDATE USING (id = auth.uid());

-- events: public read; writes via service_role
ALTER TABLE aieventradar.events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "aer_events_select_public" ON aieventradar.events;
CREATE POLICY "aer_events_select_public" ON aieventradar.events
  FOR SELECT USING (true);

-- bookmarks: owner only
ALTER TABLE aieventradar.bookmarks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "aer_bookmarks_select_own" ON aieventradar.bookmarks;
CREATE POLICY "aer_bookmarks_select_own" ON aieventradar.bookmarks
  FOR SELECT USING (user_id = auth.uid());
DROP POLICY IF EXISTS "aer_bookmarks_insert_own" ON aieventradar.bookmarks;
CREATE POLICY "aer_bookmarks_insert_own" ON aieventradar.bookmarks
  FOR INSERT WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "aer_bookmarks_delete_own" ON aieventradar.bookmarks;
CREATE POLICY "aer_bookmarks_delete_own" ON aieventradar.bookmarks
  FOR DELETE USING (user_id = auth.uid());

-- subscriptions: owner only
ALTER TABLE aieventradar.subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "aer_subscriptions_select_own" ON aieventradar.subscriptions;
CREATE POLICY "aer_subscriptions_select_own" ON aieventradar.subscriptions
  FOR SELECT USING (user_id = auth.uid());
DROP POLICY IF EXISTS "aer_subscriptions_insert_own" ON aieventradar.subscriptions;
CREATE POLICY "aer_subscriptions_insert_own" ON aieventradar.subscriptions
  FOR INSERT WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "aer_subscriptions_update_own" ON aieventradar.subscriptions;
CREATE POLICY "aer_subscriptions_update_own" ON aieventradar.subscriptions
  FOR UPDATE USING (user_id = auth.uid());
DROP POLICY IF EXISTS "aer_subscriptions_delete_own" ON aieventradar.subscriptions;
CREATE POLICY "aer_subscriptions_delete_own" ON aieventradar.subscriptions
  FOR DELETE USING (user_id = auth.uid());

-- notification_logs: read own
ALTER TABLE aieventradar.notification_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "aer_notif_logs_select_own" ON aieventradar.notification_logs;
CREATE POLICY "aer_notif_logs_select_own" ON aieventradar.notification_logs
  FOR SELECT USING (user_id = auth.uid());

-- source_run_logs: admin read only
ALTER TABLE aieventradar.source_run_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "aer_source_run_logs_select_admin" ON aieventradar.source_run_logs;
CREATE POLICY "aer_source_run_logs_select_admin" ON aieventradar.source_run_logs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM aieventradar.users WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- 10. Supabase auth.users -> aieventradar.users sync trigger
--     (auth.users는 Supabase 내장 schema라 그대로 참조)
-- ============================================================
CREATE OR REPLACE FUNCTION aieventradar.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO aieventradar.users (id, email, auth_provider)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NULLIF(NEW.raw_user_meta_data->>'provider', '')::aieventradar.auth_provider,
      'email'
    )
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 트리거 이름을 prefix로 격리: 같은 auth.users에 다른 앱 트리거가 붙어있어도 공존 가능
DROP TRIGGER IF EXISTS aer_on_auth_user_created ON auth.users;
CREATE TRIGGER aer_on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION aieventradar.handle_new_user();

-- ============================================================
-- 11. Schema usage grants for Supabase roles
--     PostgREST/Supabase 클라이언트가 schema에 접근하려면 USAGE 권한 필요.
--     실제 row 접근은 RLS가 결정.
-- ============================================================
GRANT USAGE ON SCHEMA aieventradar TO anon, authenticated, service_role;

GRANT SELECT ON ALL TABLES IN SCHEMA aieventradar TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA aieventradar TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA aieventradar TO service_role;

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA aieventradar TO authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA aieventradar
  GRANT SELECT ON TABLES TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA aieventradar
  GRANT INSERT, UPDATE, DELETE ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA aieventradar
  GRANT ALL ON TABLES TO service_role;

-- ============================================================
-- 12. PostgREST schema exposure 안내 (Supabase Dashboard에서 수동 설정 필요)
-- ============================================================
-- Supabase Dashboard → Project Settings → API → "Exposed schemas" 에
-- `aieventradar` 를 추가해야 supabase-js 가 이 schema에 PostgREST로 접근할 수 있다.
-- (또는 supabase/config.toml 의 [api] db_schemas 에 추가)
