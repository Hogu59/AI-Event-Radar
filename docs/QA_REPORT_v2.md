# AIEventRadar — QA 보고서 v2

## 0. 개요

| 항목 | 값 |
|---|---|
| 검증일시 | 2026-05-19 |
| 검증 대상 | v1 FAIL 조치 결과 (Critical-1, Critical-2 한정) |
| v1과의 차이 | Backend: `admin/source-runs/retry`, `users/me` 2개 라우트 신설 / Frontend: `getMe`/`updateMe` API + `/my` 페이지 디지스트 빈도 영속화 + NotificationSettings 저장중 표시 |
| 검증 방식 | 정적 코드 분석 (재실행 권고 항목만 집중, 회귀 스모크 병행) |
| **최종 판정** | **PASS** (Critical 0, Minor 5 잔여 — 다음 phase 처리 권고) |

---

## 1. Critical 이슈 재검증

| v1 ID | v1 발견 (요약) | 조치 (구현 위치) | v2 결과 | 근거 |
|---|---|---|---|---|
| **Critical-1** | `POST /api/admin/source-runs/retry` 백엔드 미구현 → 관리자 재실행 버튼 404 | `backend/src/app/api/admin/source-runs/retry/route.ts` 신설 | **RESOLVED** | 파일 존재 확인 (37 lines). `POST` 핸들러에서 (1) `requireAdmin()` 인증, (2) `z.object({ source: z.union([SourceEnum, z.literal('all')]) }).parse(...)` 입력 검증, (3) `runCollection({ sources, triggered_by: 'manual' })` 호출, (4) fire-and-forget으로 즉시 `ok({ triggered: true, source })` 응답. `maxDuration = 60` 명시. 시그니처(`{ source }`)는 프론트 `api.ts:330` 호출과 일치 |
| **Critical-2** | `digest_frequency` 사용자 변경 API 부재 + `/my`가 로컬 state만 갱신 → DB 기본값 `weekly`에 고정 | (a) `backend/src/app/api/users/me/route.ts` (GET, PATCH) 신설<br>(b) `frontend/src/lib/api.ts`에 `getMe`/`updateMe` 추가<br>(c) `frontend/src/app/my/page.tsx` 마운트 시 fetch + 변경 시 PATCH<br>(d) `NotificationSettings`에 `saving` 표시 | **RESOLVED** | (a) 60 lines, `GET`는 `requireUser()` → `users` self-row select, `PATCH`는 `z.object({ display_name?, digest_frequency? in [realtime\|daily\|weekly\|off], notification_channel? })` 검증 후 `users.update().eq('id', user.id)` (RLS의 `users_update_self`로 본인만 가능). 응답 포맷 `{ ok, data: { user } }`<br>(b) `api.ts:333` `getMe()` → `request<{user}>('/api/users/me')`, `api.ts:341` `updateMe(patch)` → PATCH 호출, 둘 다 Mock 모드 분기 포함<br>(c) `my/page.tsx:34~59` `useEffect`에서 `api.getMe()` → `setMe`/`setDigest(u.digest_frequency)`, `my/page.tsx:61~81` `handleChangeFrequency` 콜백이 optimistic update + `api.updateMe({ digest_frequency })` + 실패 시 롤백 + 성공/실패 toast<br>(d) `NotificationSettings.tsx:14,24` `saving` prop 수신, line 43 `disabled={saving}`, line 49 `opacity-60 pointer-events-none`, line 62 "저장 중..." 텍스트 with `aria-live="polite"` |

---

## 2. 회귀 (Regression) 점검

| 점검 항목 | 결과 | 근거 |
|---|---|---|
| 기존 12개 route 파일 모두 존재 (v1 11개 + retry + users/me) | PASS | `find backend/src/app/api -name route.ts` → 12개 (auth/login, events, events/[id], bookmarks×2, subscriptions×2, cron/collect, cron/notify, admin/source-runs, **admin/source-runs/retry**, **users/me**) |
| 응답 포맷 `{ ok, data | error }` 일관성 | PASS | 두 신규 라우트 모두 `ok()`/`fail()`/`handleUnknownError()` (response.ts:25,29,36) 사용. v1과 동일한 유틸 |
| 인증 유틸 일원화 (`requireUser`/`requireAdmin`/`isCronAuthorized`) | PASS | `utils/auth.ts:9,48,59` 재사용. retry는 `requireAdmin`, users/me는 `requireUser` |
| Zod 입력 검증 적용 | PASS | retry는 `SourceEnum + 'all'` 합집합, users/me PATCH는 부분 객체 검증 (모두 optional 후 빈 patch는 `BAD_REQUEST` 반환) |
| 기존 PASS 항목 회귀 없음 (F1~F5, F7 list view, DB/RLS) | PASS | retry는 **새 파일** 추가만, users/me는 **새 디렉토리** 추가만. 기존 11개 route.ts 미수정 (수정 범위는 frontend의 `api.ts`/`my/page.tsx`/`NotificationSettings.tsx`로 한정) |
| Mock 모드 호환 | PASS | `api.ts:325~331,333~339,341~355` 모두 `isMockMode()` 분기. `mockState.user` 갱신으로 UI 일관 동작 |
| TypeScript 타입 일관성 | PASS | `SourceId` 타입 import (retry/route.ts:6), `User`/`DigestFrequency`/`NotificationChannel` 타입 import (api.ts:5,13, my/page.tsx:17) |

---

## 3. Minor 이슈 잔여 항목

v1에서 식별된 5개 Minor는 **이번 cycle에서 처리 대상 외**. 다음 phase에서 처리 권고:

| # | 이슈 | 잔여 상태 | 권고 처리 시점 |
|---|---|---|---|
| M1 | 마이그레이션 분리 (001~004) vs 단일 `001_initial.sql` | 미처리 | Phase 5 Documentation에서 DATABASE.md 동기화 |
| M2 | `seed_dev` 분리 미존재 | 미처리 | Phase 6 Integration 단계 |
| M3 | `mock-data.ts` 프로덕션 번들 포함 가능성 | 미처리 | Phase 6 Integration tree-shaking 점검 |
| M4 | Rate limit 미들웨어 미구현 | 미처리 | Phase 2 분리 가능 (magic link 도배 위험만 우선순위 검토) |
| M5 | WCAG AA 주장 자동검증 부재 | 미처리 | Phase 6 Integration axe-core 적용 |

---

## 4. Pass 조건 충족도

| 조건 | 결과 |
|---|---|
| v1 Critical 2개 모두 해소 | **YES (2/2)** |
| 회귀 없음 (기존 라우트/UI 영향 0) | **YES** |
| Critical 0, HIGH 0 | **YES** |
| MVP F1~F7 실효 동작 | **7/7** (F6 빈도 변경 + F7 retry 모두 복구) |
| API_SPEC 엔드포인트 구현 | **14/14** (retry 포함) + 보조 1건 (`/users/me`) |

---

## 5. 최종 판정 및 다음 단계

### 판정: **PASS**

두 Critical 이슈가 코드 레벨에서 모두 해소되었고, 신규 파일/함수 추가 위주로 변경되어 기존 코드에 회귀 위험이 없음. 응답 포맷, 인증/검증 유틸 사용 패턴이 v1 PASS 영역과 동일하여 일관성 유지.

### 다음 단계
1. **즉시**: Phase 5 (Documentation)로 진행. 변경된 API 시그니처 (`POST /api/admin/source-runs/retry`, `GET|PATCH /api/users/me`)를 `docs/API_SPEC.md`에 반영.
2. **Phase 5 내 동기화**: M1 (마이그레이션 파일 구성 vs DATABASE.md §6 권장) 정리.
3. **Phase 6 Integration**: M2~M5 (seed_dev / mock 가드 / rate limit / WCAG axe-core) 실제 환경에서 검증.
4. **빌드/타입체크/Supabase 연동/Resend 발송 실측**: Phase 6 Integration 단계에서 npm/pnpm install 및 `next build`로 종합 확인 (현 v2도 의존성 미설치 환경의 정적 분석 한정).
