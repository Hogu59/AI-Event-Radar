# AIEventRadar — QA 보고서 v1

## 0. 개요

| 항목 | 값 |
|---|---|
| 검증일시 | 2026-05-19 |
| 검증 대상 | Phase 3 구현물 (backend/frontend) |
| 기준 문서 | docs/PLANNING.md (MVP F1~F7), docs/API_SPEC.md, docs/DATABASE.md, docs/ARCHITECTURE.md |
| 검증 방식 | 정적 코드 분석 (의존성 미설치 환경, 빌드/타입체크는 Integration 단계로 이월) |
| 최종 판정 | **FAIL** (Critical 2개, Minor 5개) |

---

## 1. 기능 검증 매트릭스 (MVP F1~F7)

| ID | 기능 | 위치 (절대경로) | 상태 | 근거 |
|----|------|----------------|------|------|
| F1 | 다중 소스 수집기 (5 adapter) | `/Users/yoon/Desktop/OTTFStudio/AIEventRadar/backend/src/lib/sources/{festa,eventus,luma,dev-event,devpost}.ts` + `index.ts` + `services/collector.ts` + `app/api/cron/collect/route.ts` | PASS | 5개 어댑터 파일 존재, `index.ts:22`에 `ALL_ADAPTERS.filter(...enabled)`로 토글, `ENABLE_*` env로 끄기 가능, cron `0 */6 * * *` 호환 |
| F2 | 정규화 + 중복 제거 | `backend/src/lib/sources/normalize.ts` | PASS | `normalize.ts:73`에서 `dedupe_hash: buildDedupeHash(...)`, 마이그레이션에서 `events_dedupe_hash_uniq` UNIQUE 적용 (`migrations/001_initial.sql:89`) |
| F3 | AI 키워드 필터링 | `backend/src/lib/sources/ai-classifier.ts` | PASS | `AI_CANONICAL` 카테고리 집합 (line 62), `classifyEvent()`가 `is_ai_related/categories/keywords_matched` 반환 (line 140~168) |
| F4 | 행사 리스트 웹 UI | `frontend/src/app/page.tsx`, `components/{EventList,EventCard,EventFilters}.tsx` | PASS | 페이지 + 카드/필터/리스트 컴포넌트 모두 존재, `/events/[id]` 상세 페이지 존재 |
| F5 | 북마크 + 구독 키워드 | `frontend/src/components/{BookmarkButton,SubscriptionForm}.tsx` + backend `/api/bookmarks*`, `/api/subscriptions*` | PASS | 컴포넌트 + 백엔드 4개 라우트 모두 존재, RLS 정책으로 owner-only 강제 (`001_initial.sql:209~233`) |
| F6 | 이메일 알림 (digest + D-3) | `backend/src/lib/services/notifier.ts` + `notifications/email.ts` + `app/api/cron/notify/route.ts` | **PARTIAL** | 발송/매칭 로직은 존재 (`notifier.ts:18,21,192,251`에서 `digest_frequency` 분기). 단, **사용자가 빈도를 변경할 API 미존재** → 실질적으로 모든 유저가 DB 기본값 `'weekly'`에 고정 (Critical-2 참조) |
| F7 | 관리자 모니터링 | `frontend/src/app/admin/page.tsx` + `backend/src/app/api/admin/source-runs/route.ts` | **PARTIAL** | 수집 로그 조회는 동작 (`route.ts:13~49`). 단, **재실행 버튼이 호출하는 retry 엔드포인트가 백엔드에 미구현** (Critical-1 참조) |

---

## 2. API 엔드포인트 매트릭스 (API_SPEC.md 기준)

| § | Method | 경로 | API_SPEC 명시 | 구현 위치 | 상태 |
|---|--------|------|--------------|----------|------|
| 1.1 | POST | `/api/auth/login` | O | `backend/src/app/api/auth/login/route.ts` | PASS |
| 2.1 | GET | `/api/events` | O | `app/api/events/route.ts` | PASS |
| 2.2 | GET | `/api/events/[id]` | O | `app/api/events/[id]/route.ts` (`is_bookmarked` 분기 확인됨, line 19~30) | PASS |
| 3.1 | POST | `/api/bookmarks` | O | `app/api/bookmarks/route.ts` | PASS |
| 3.2 | DELETE | `/api/bookmarks/[id]` | O | `app/api/bookmarks/[id]/route.ts` | PASS |
| 3.3 | GET | `/api/bookmarks` | O | `app/api/bookmarks/route.ts` | PASS |
| 4.1 | GET | `/api/subscriptions` | O | `app/api/subscriptions/route.ts` | PASS |
| 4.2 | POST | `/api/subscriptions` | O | `app/api/subscriptions/route.ts` | PASS |
| 4.3 | PATCH | `/api/subscriptions/[id]` | O | `app/api/subscriptions/[id]/route.ts` | PASS |
| 4.4 | DELETE | `/api/subscriptions/[id]` | O | `app/api/subscriptions/[id]/route.ts` | PASS |
| 5.1 | POST | `/api/cron/collect` | O | `app/api/cron/collect/route.ts` | PASS |
| 5.2 | POST | `/api/cron/notify` | O | `app/api/cron/notify/route.ts` | PASS |
| 6.1 | GET | `/api/admin/source-runs` | O | `app/api/admin/source-runs/route.ts` | PASS |
| 6.2 | POST | `/api/admin/source-runs/retry` | O (보조) | **(없음)** | **FAIL** |
| (암묵) | PATCH | 유저 프로필 (`digest_frequency` 갱신) | API_SPEC 미명시 but UI 요구 | **(없음)** | **FAIL** |

**검증 방법**: `find backend/src/app/api -type f` 전수 조사 (11개 route.ts 확인), API_SPEC 7개 섹션 정렬.

---

## 3. DB 테이블 매트릭스 (DATABASE.md 기준)

| 테이블 | DATABASE.md 명시 | 001_initial.sql | RLS 정책 | 상태 |
|--------|------------------|-----------------|---------|------|
| `users` | O | line 48~58 | self select/update (line 195~200) | PASS |
| `events` | O | line 65~90 | public read (line 204~206) | PASS |
| `bookmarks` | O | line 117~124 | owner-only (line 210~218) | PASS |
| `subscriptions` | O | line 132~144 | owner-only (line 222~233) | PASS |
| `notification_logs` | O | line 153~163 | self read (line 237~239) | PASS |
| `source_run_logs` | O | line 172~183 | admin-only (line 243~247) | PASS |
| ENUM 8종 | O | line 13~43 | — | PASS |
| `pgcrypto`, `pg_trgm` 확장 | O | line 7~8 | — | PASS |
| `handle_new_user()` 트리거 | O | line 252~272 | — | PASS |
| `update_updated_at()` 트리거 | O | line 102~112 | — | PASS |
| GIN 인덱스 (categories/keywords/trgm) | O | line 97~100 | — | PASS |

**참고**: DATABASE.md §6은 `001_initial.sql / 002_rls_policies.sql / 003_auth_trigger.sql / 004_seed_dev.sql` 4파일 구성을 권장하나, 실제 구현은 단일 `001_initial.sql`에 모든 내용을 통합. 기능적으로는 동일 → 형식상 Minor.

---

## 4. 코드 품질 체크리스트

| 항목 | 결과 | 근거 |
|------|------|------|
| `any` 타입 남용 | PASS | repo 전체 `:\s*any\b` / `as any` 매치 0건 (Grep) |
| 환경변수 fail-fast | PASS | `supabase.ts:6`, `supabase-admin.ts:5`, `email.ts:8,34` 등에서 `throw new Error('Missing ...')` |
| 에러 핸들링 일관성 | PASS | 모든 route에서 `try { ... } catch (e) { return handleUnknownError(e) }` 패턴 (`utils/response.ts`) |
| 인증 유틸 일원화 | PASS | `utils/auth.ts` → `requireAdmin()`, `isCronAuthorized()` 재사용 |
| Zod 입력 검증 | PASS | 모든 변경 엔드포인트 (`POST/PATCH/DELETE`)에서 `z.object(...).parse(...)` 사용 |
| Backend 의존성 | PASS | next 15 / supabase-js / @supabase/ssr / resend / playwright / cheerio / zod / date-fns / ulid 모두 명시 |
| Frontend 의존성 | PASS | next 15 / radix-ui 9종 / lucide-react / clsx / tailwind-merge / cva / date-fns / zod 모두 명시 |
| 어댑터 enable 토글 | PASS | `sources/index.ts:22`에서 `enabled` 필터, `ENABLE_*` env로 운영 중 비활성 가능 |
| Mock 모드 | PASS | `sources/types.ts:45` `USE_MOCK=true`, frontend `NEXT_PUBLIC_USE_MOCK=true` |
| Cron 인증 | PASS | `cron/collect/route.ts:19`, `cron/notify/route.ts` 모두 `isCronAuthorized()` 게이트 |
| RLS 우회 흐름 | PASS | service_role 키는 `supabase-admin.ts` 통해서만 접근, cron/admin 라우트에서만 사용 |

---

## 5. UI/UX 체크리스트

| 항목 | 결과 | 근거 |
|------|------|------|
| 로딩 상태 (`LoadingSpinner`) | PASS | `frontend/src/components/LoadingSpinner.tsx` + 7개 페이지/리스트에서 사용 |
| 에러 상태 (`ErrorBoundary` + `error.tsx`) | PASS | `frontend/src/app/error.tsx` + `components/ErrorBoundary.tsx` 둘 다 존재 |
| 빈 상태 (`EmptyState`) | PASS | `components/EmptyState.tsx` + 다수 페이지에서 사용 |
| 404 (`not-found.tsx`) | PASS | `frontend/src/app/not-found.tsx` 존재 |
| 다크모드 (`ThemeContext` + `ThemeToggle`) | PASS | `context/ThemeContext.tsx` + `components/ThemeToggle.tsx`, `<html class="dark">` 전략 |
| 반응형 클래스 (`sm:/md:/lg:`) | PASS | 15개 파일에서 총 43회 사용 (Grep) |
| 접근성 (`aria-label` 등) | PASS | 13개 컴포넌트에서 총 32회 사용 (`aria-pressed`, `aria-label`, `role=` 등) |
| 라우팅 (8개 페이지) | PASS | `/`, `/login`, `/auth/callback`, `/events/[id]`, `/my`, `/my/bookmarks`, `/my/subscriptions`, `/admin` 모두 존재 |
| **알림 설정 영속화** | **FAIL** | `app/my/page.tsx:163~164`에서 `digestFrequency={digest}` + `onChangeFrequency={(next) => setDigest(next)}` — 로컬 React state만 갱신, 백엔드 호출 없음 (Critical-2) |

---

## 6. 발견 이슈

### 6.1 Critical (MVP 차단 / 명백한 기능 결손)

#### Critical-1 — 관리자 재실행(retry) 엔드포인트 미구현
- **현상**: API_SPEC §6.2 `POST /api/admin/source-runs/retry` 가 명시되어 있고, 프론트가 이를 호출하지만 백엔드 라우트가 없음 → 클릭 시 404.
- **근거**:
  - 프론트 호출: `/Users/yoon/Desktop/OTTFStudio/AIEventRadar/frontend/src/lib/api.ts:314` — `await request('/api/admin/source-runs/retry', { method: 'POST', body: { source } });`
  - 프론트 UI 트리거: `frontend/src/app/admin/page.tsx:47` (`await api.retrySource(source)`) + line 109 "재실행" 버튼.
  - 백엔드 실재 경로: `backend/src/app/api/admin/source-runs/route.ts` (GET만 존재). retry 디렉토리/파일 없음.
- **영향**: F7 "수동 재실행 버튼" 동작 불가. README도 동작한다고 광고 (`frontend/README.md:52`).
- **권고 수정**: `backend/src/app/api/admin/source-runs/retry/route.ts` 신설. `requireAdmin()` → `runCollection({ sources: [source], triggered_by: 'manual' })` 호출, 202 반환.

#### Critical-2 — 알림 빈도(`digest_frequency`) 사용자 변경 불가
- **현상**: `/my` 페이지에서 빈도(realtime/daily/weekly/off)를 선택해도 로컬 React state만 바뀌고 서버에 반영되지 않음. 결국 모든 유저가 DB 기본값 `weekly`에 영구 고정.
- **근거**:
  - `frontend/src/app/my/page.tsx:25` — `const [digest, setDigest] = React.useState<DigestFrequency>('weekly');` (초기값 하드코딩)
  - `frontend/src/app/my/page.tsx:163~164` — `onChangeFrequency={(next) => setDigest(next)}` (백엔드 호출 부재)
  - `frontend/src/lib/api.ts`에 user/profile 관련 PATCH 함수 없음 (Grep 결과 0건)
  - 백엔드: `find backend/src/app/api -type d -name users` 결과 없음 → 사용자 PATCH 엔드포인트 부재
  - 한편 `backend/src/lib/services/notifier.ts:18,21,192,251`은 `digest_frequency`로 정확히 분기하므로 DB만 갱신되면 동작
- **영향**: F6 "다이제스트 빈도 선택" 사용자 시나리오 #1·#2의 핵심 단계 차단 (시나리오 #1 step4 "알림은 '주 1회 다이제스트'로 설정", 시나리오 #2 step3 "마감 D-3 알림").
- **권고 수정**:
  1. 백엔드 `app/api/users/me/route.ts` (PATCH) 추가 — `requireAuth()` + Zod `{ digest_frequency }` 검증 + `users` row 갱신 (RLS의 `users_update_self` 정책으로 본인만 가능)
  2. 프론트 `api.ts`에 `updateProfile({ digest_frequency })` 추가
  3. `/my` 페이지에서 초기값을 사용자 프로필에서 로드 + `onChangeFrequency`에서 API 호출 + 성공 토스트

### 6.2 Minor (폴리시 / 형식 / Phase 2 격리)

| # | 이슈 | 위치 | 권고 |
|---|------|------|------|
| M1 | 마이그레이션 파일 구성이 DATABASE.md §6 권장 (001/002/003/004 분리)과 불일치, 단일 `001_initial.sql`로 통합됨 | `backend/migrations/001_initial.sql` | 기능 동일 → DATABASE.md를 현재 구성에 맞춰 단순화하거나, 분리 적용. Phase 5 문서화 단계에서 처리 |
| M2 | 003/004 (`auth_trigger`, `seed_dev`)이 별도 파일로 분리되지 않음. 개발용 시드 미존재 | `backend/migrations/` | Integration 단계에서 dev seed가 필요할 때 004 추가 |
| M3 | `frontend/src/lib/mock-data.ts` 존재, 프로덕션 빌드 시 불필요한 번들 포함 가능 | `frontend/src/lib/mock-data.ts` | tree-shaking 확인 또는 Phase 6 Integration 단계에서 mock 가드 |
| M4 | Rate limit (API_SPEC §7) — 실제 미들웨어 구현 안 됨 (`POST /auth/login` 1분 1회, `POST /bookmarks` 분당 30회) | 백엔드 전반 | MVP에서는 Phase 2로 분리 가능. 단, magic link 도배 위험 → 우선순위 검토 |
| M5 | `frontend/README.md:75` "WCAG AA" 주장은 코드 정적 분석으로 검증 불가. 명도 대비/스크린 리더 테스트 필요 | — | Phase 6 Integration 시 axe-core 등으로 확인 |

---

## 7. 재실행 권고

### 권고 1: Backend Agent 재실행 (Scoped)
- **범위**: 2개 엔드포인트만 추가
  - `POST /api/admin/source-runs/retry` 신설 (Critical-1)
  - `PATCH /api/users/me` (또는 `/api/me`) 신설 — `digest_frequency` 갱신 (Critical-2)
- **금지 범위**: 어댑터/normalize/classifier/cron 로직은 PASS 상태이므로 손대지 말 것

### 권고 2: Frontend Agent 재실행 (Scoped)
- **범위**: `/my` 페이지의 알림 빈도 영속화만
  - `app/my/page.tsx` — 마운트 시 프로필 fetch, `onChangeFrequency`에서 `api.updateProfile()` 호출, 토스트 표시
  - `lib/api.ts` — `updateProfile()` 함수 추가
- **금지 범위**: 다른 페이지/컴포넌트는 PASS이므로 건드리지 말 것

### 권고 3: 재QA (Light)
- 위 두 수정만 검증. 재QA는 위 항목 + 회귀(F1~F5, F7-list view) 스모크로 충분.

---

## 8. 최종 판정 및 다음 단계

### 판정: **FAIL**

**Pass 조건 충족도**:
- MVP F1~F7 코드 존재: 7/7 파일 존재 (단 F6은 사용자 변경 차단, F7은 retry 차단으로 실효 6/7)
- API_SPEC 엔드포인트 모두 구현: **13/14** (retry 미구현)
- DB 마이그레이션 6 테이블 + RLS: **6/6**
- Critical 이슈 0개: **2개 발견 → FAIL**

### 다음 단계
1. **즉시**: Backend Agent에 Critical-1 + Critical-2 백엔드 부분 수정 의뢰 (Sonnet, 30분 이내 예상)
2. **이어서**: Frontend Agent에 Critical-2 프론트 부분 수정 의뢰 (Sonnet, 15분 이내 예상)
3. **재QA**: 위 두 수정 + 회귀 스모크. Critical 0 확인 시 PASS 처리 → Phase 5 (Documentation)로 진행
4. **Phase 6 Integration 단계에서 확인**: Minor M1~M5 + 실제 빌드/타입체크/Supabase 연동/Resend 발송 테스트
