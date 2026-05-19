# AIEventRadar 시스템 아키텍처

## 1. 기술 스택

### 1.1 확정 스택

| 영역 | 기술 | 선택 이유 |
|------|------|----------|
| **Frontend** | Next.js 15 (App Router) + TypeScript | SSR/ISR로 SEO 최적화(행사 상세 페이지 검색 노출), 단일 풀스택 코드베이스로 1인 운영 부담 최소화 |
| **UI** | Tailwind CSS + shadcn/ui | shadcn은 코드를 직접 복붙하는 형태라 종속성 없고 커스터마이즈 자유로움. Tailwind와 자연스럽게 통합 |
| **Backend** | Next.js API Routes (Route Handlers) | 별도 백엔드 서버 분리 시 배포·운영 비용 2배. 1인 운영에서는 모놀리식이 합리적. Vercel Edge/Node Runtime 모두 활용 가능 |
| **DB + Auth + Storage** | Supabase (PostgreSQL + RLS + Magic Link/Google OAuth) | Auth/DB/Storage 통합 무료 티어 충분. RLS로 application 코드의 권한 검사 부담 절감. 자체 백업 일 1회 |
| **스케줄러** | Vercel Cron Jobs | Next.js와 동일 환경, 별도 설정 불필요. 무료 티어 hourly 트리거 지원. 대안 GitHub Actions cron(완전 무료, 1분 단위까지 가능)을 fallback으로 설계 |
| **이메일** | Resend | Vercel과 통합 우수. 월 3,000건 무료(MVP 충분). React Email 템플릿 지원 |
| **스크래핑/파싱** | Playwright + cheerio | Playwright는 JS 렌더링 필요한 SPA(Luma/Festa)용. cheerio는 정적 HTML(Dev-Event/Devpost RSS)용. 소스별 최적 도구 선택 |
| **로깅/모니터링** | Vercel built-in + Sentry Free | Vercel logs로 실시간 디버그, Sentry로 에러 트래킹. Sentry 무료 5K events/월 |
| **결제 (Phase 2)** | Toss Payments | 한국 결제 표준, B2C Plus 티어 도입 시 추가 |

### 1.2 다른 후보와의 비교

- **별도 백엔드 분리 (NestJS/FastAPI)**: 1인 운영 환경에서 배포·로깅·관측 인프라가 2배가 됨 → 제외
- **Cloudflare Workers**: 크롤링 워크로드의 장시간 실행 한도(CPU time 30초)에 부적합 → 제외
- **Railway 단독**: Vercel Cron이 더 단순. Vercel Function 실행 시간(Hobby 10초, Pro 60초)이 문제될 경우 collect 워커만 Railway로 분리하는 경로 열어둠
- **Prisma vs Supabase JS Client**: Supabase JS Client + 타입스크립트 생성기로 충분. Prisma 추가 시 마이그레이션 도구 중복

---

## 2. 시스템 구조도

### 2.1 전체 데이터 흐름

```
                    ┌──────────────────────────────────────────┐
                    │       Vercel Cron (6h schedule)          │
                    │  POST /api/cron/collect  (CRON_SECRET)   │
                    └─────────────────┬────────────────────────┘
                                      ↓
       ┌──────────────────────────────────────────────────────────┐
       │            Source Collector Orchestrator                  │
       │       (lib/services/collector.ts, Promise.allSettled)     │
       └──┬────────┬──────────┬───────────┬───────────┬───────────┘
          ↓        ↓          ↓           ↓           ↓
    ┌─────────┐┌────────┐┌─────────┐┌──────────┐┌─────────┐
    │ Festa   ││Eventus ││  Luma   ││Dev-Event ││ Devpost │
    │Adapter  ││Adapter ││Adapter  ││ Adapter  ││ Adapter │
    │Playwright││Playwr.││unofficialAPI││ GH API ││  RSS+HTML│
    └────┬────┘└───┬────┘└────┬────┘└────┬─────┘└────┬────┘
         └────────┴───────────┴──────────┴───────────┘
                              ↓
                  [ Raw Event Records ]
                              ↓
       ┌──────────────────────────────────────────────────────────┐
       │          Normalization Layer (lib/services/normalize.ts) │
       │   - 표준 Event 스키마 변환                                │
       │   - 타임존 정규화 (Asia/Seoul 기본)                       │
       │   - 가격/장소 string → enum                              │
       └──────────────────────────────────────────────────────────┘
                              ↓
       ┌──────────────────────────────────────────────────────────┐
       │          Dedup Layer (lib/services/dedupe.ts)             │
       │   dedupe_hash = sha256(slug(title) + date_bucket + city)  │
       │   기존 hash 매칭 시 update, 신규 시 insert                │
       └──────────────────────────────────────────────────────────┘
                              ↓
       ┌──────────────────────────────────────────────────────────┐
       │      Keyword Classifier (lib/services/classifier.ts)      │
       │   - 룰베이스 키워드 사전(KEYWORDS) 매칭                    │
       │   - is_ai_related, categories[], keywords_matched[] 산출  │
       │   - (옵션) OpenAI 보조 분류 (USE_LLM_CLASSIFY=true)      │
       └──────────────────────────────────────────────────────────┘
                              ↓
                ┌─────────────────────────────────┐
                │   Supabase Postgres (events)    │
                │   + source_run_logs upsert      │
                └─────────────────┬───────────────┘
                                  ↓
        ┌─────────────────────────┴─────────────────────────┐
        ↓                                                   ↓
┌─────────────────┐                            ┌─────────────────────────┐
│  Web UI (Next)  │                            │ Vercel Cron (notify)    │
│  /events 검색   │                            │ POST /api/cron/notify   │
│  /events/[id]  │                            └────────────┬────────────┘
│  /me 북마크/구독│                                         ↓
└────────┬────────┘                            ┌─────────────────────────┐
         ↓                                     │  Notification Matcher    │
┌─────────────────┐                            │  - subscriptions × new   │
│ /api/events     │                            │    events 매칭           │
│ /api/bookmarks  │                            │  - digest_frequency      │
│ /api/subscrip.. │                            │    별 batch              │
└────────┬────────┘                            └────────────┬────────────┘
         ↓                                                  ↓
┌─────────────────┐                            ┌─────────────────────────┐
│ Supabase Auth   │                            │   Resend API (email)    │
│ Magic Link/OAuth│                            │   + notification_logs   │
└─────────────────┘                            └─────────────────────────┘
```

### 2.2 데이터 흐름 요약

**수집 파이프라인**: Cron → Adapter(5) → Normalize → Dedupe → Classify → DB(events) + source_run_logs

**조회 파이프라인**: 브라우저 → Next App Router → API Route → Supabase JS Client → Postgres (인덱스 활용)

**알림 파이프라인**: Cron(매시간/일별/주별) → 구독 매칭 → Resend 발송 → notification_logs

---

## 3. 폴더 구조

```
AIEventRadar/
├── .env.example
├── .env.local                    # gitignored
├── README.md
├── package.json
├── next.config.ts
├── tsconfig.json
├── tailwind.config.ts
├── components.json               # shadcn 설정
├── vercel.json                   # Cron schedule 정의
│
├── docs/                         # 기획/설계 문서
│   ├── IDEA.md
│   ├── PLANNING.md
│   ├── BUSINESS.md
│   ├── COMPETITORS.md
│   ├── ARCHITECTURE.md           # (이 문서)
│   ├── API_SPEC.md
│   ├── DATABASE.md
│   ├── REQUIREMENTS.md
│   └── CHANGELOG.md
│
├── frontend/                     # Next.js App Router
│   ├── app/
│   │   ├── (marketing)/
│   │   │   ├── page.tsx                  # 랜딩
│   │   │   └── about/page.tsx
│   │   ├── (app)/
│   │   │   ├── layout.tsx                # 인증 가드 + 헤더/푸터
│   │   │   ├── events/
│   │   │   │   ├── page.tsx              # 리스트 (검색/필터)
│   │   │   │   └── [id]/page.tsx         # 상세
│   │   │   ├── me/
│   │   │   │   ├── bookmarks/page.tsx
│   │   │   │   └── subscriptions/page.tsx
│   │   │   └── admin/
│   │   │       └── source-runs/page.tsx  # 관리자 대시보드
│   │   ├── api/
│   │   │   ├── auth/
│   │   │   │   ├── login/route.ts        # POST: Magic Link 요청
│   │   │   │   └── callback/route.ts     # OAuth 콜백
│   │   │   ├── events/
│   │   │   │   ├── route.ts              # GET 리스트
│   │   │   │   └── [id]/route.ts         # GET 단건
│   │   │   ├── bookmarks/
│   │   │   │   ├── route.ts              # POST 추가
│   │   │   │   └── [id]/route.ts         # DELETE
│   │   │   ├── subscriptions/
│   │   │   │   ├── route.ts              # GET 리스트, POST 생성
│   │   │   │   └── [id]/route.ts         # PATCH, DELETE
│   │   │   ├── cron/
│   │   │   │   ├── collect/route.ts      # 수집 트리거
│   │   │   │   └── notify/route.ts       # 알림 트리거
│   │   │   └── admin/
│   │   │       └── source-runs/route.ts
│   │   ├── layout.tsx
│   │   └── globals.css
│   ├── components/
│   │   ├── ui/                           # shadcn 컴포넌트
│   │   ├── events/
│   │   │   ├── event-card.tsx
│   │   │   ├── event-filter.tsx
│   │   │   └── event-search.tsx
│   │   ├── bookmarks/
│   │   ├── subscriptions/
│   │   └── layout/
│   │       ├── header.tsx
│   │       └── footer.tsx
│   ├── hooks/
│   │   ├── use-events.ts
│   │   └── use-auth.ts
│   └── styles/
│
├── backend/                      # 서버 사이드 로직 (Next.js에서 import)
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── server.ts                 # Server Component용 client
│   │   │   ├── client.ts                 # Browser client
│   │   │   └── admin.ts                  # Service Role (cron 전용)
│   │   ├── sources/                      # 소스 어댑터
│   │   │   ├── base.ts                   # SourceAdapter 추상 인터페이스
│   │   │   ├── festa.ts
│   │   │   ├── eventus.ts
│   │   │   ├── luma.ts
│   │   │   ├── dev-event.ts
│   │   │   ├── devpost.ts
│   │   │   └── index.ts                  # 어댑터 레지스트리
│   │   ├── services/
│   │   │   ├── collector.ts              # 전체 수집 오케스트레이션
│   │   │   ├── normalize.ts              # 정규화
│   │   │   ├── dedupe.ts                 # 중복 제거
│   │   │   ├── classifier.ts             # AI 키워드 분류
│   │   │   ├── notifier.ts               # 알림 매칭/발송
│   │   │   └── email.ts                  # Resend 래퍼
│   │   ├── keywords.ts                   # AI 키워드 사전 정의
│   │   ├── auth.ts                       # 인증 헬퍼
│   │   ├── errors.ts                     # 공통 에러 타입
│   │   └── logger.ts
│   ├── migrations/                       # SQL 마이그레이션
│   │   ├── 001_initial.sql
│   │   ├── 002_rls_policies.sql
│   │   └── 003_indexes.sql
│   └── types/
│       ├── database.ts                   # supabase gen types
│       └── domain.ts                     # 도메인 타입
│
├── mocks/                        # USE_MOCK=true 시 사용
│   ├── festa.json                # 5건
│   ├── eventus.json              # 5건
│   ├── luma.json                 # 5건
│   ├── dev-event.json            # 5건
│   ├── devpost.json              # 5건
│   └── users.json                # 테스트 유저 시드
│
└── tests/
    ├── unit/
    │   ├── dedupe.test.ts
    │   ├── classifier.test.ts
    │   └── adapters/
    └── integration/
        └── api.test.ts
```

---

## 4. 소스 어댑터 인터페이스 설계

### 4.1 SourceAdapter 추상 인터페이스

```ts
// backend/lib/sources/base.ts
export type SourceId = 'festa' | 'eventus' | 'luma' | 'dev_event' | 'devpost';

export interface RawEvent {
  source: SourceId;
  source_event_id: string;
  source_url: string;
  title: string;
  description?: string;
  start_at: string;        // ISO8601
  end_at?: string;
  timezone?: string;
  location_type?: 'online' | 'offline' | 'hybrid';
  location_name?: string;
  city?: string;
  country?: string;
  host_name?: string;
  price?: string;
  thumbnail_url?: string;
  raw_categories?: string[];  // 원본 태그 (정규화 전)
}

export interface CollectResult {
  source: SourceId;
  events: RawEvent[];
  started_at: string;
  finished_at: string;
  status: 'success' | 'partial' | 'failed';
  error_message?: string;
}

export abstract class SourceAdapter {
  abstract readonly id: SourceId;
  abstract readonly enabled: boolean;       // env로 ON/OFF 토글 (Festa fallback 대응)

  abstract collect(opts?: { limit?: number }): Promise<CollectResult>;

  protected useMock(): boolean {
    return process.env.USE_MOCK === 'true';
  }
}
```

### 4.2 5개 구현체 시그니처

```ts
// backend/lib/sources/festa.ts
export class FestaAdapter extends SourceAdapter {
  readonly id = 'festa' as const;
  readonly enabled = process.env.ENABLE_FESTA !== 'false';  // fallback toggle
  // Playwright headless로 festa.io/events 페이지 SPA 렌더링 후 카드 추출
  // robots.txt 준수, 1s delay, 동시 요청 2개 이하
  async collect(opts?): Promise<CollectResult>;
}

// backend/lib/sources/eventus.ts
export class EventusAdapter extends SourceAdapter {
  readonly id = 'eventus' as const;
  readonly enabled = process.env.ENABLE_EVENTUS !== 'false';
  // Playwright + event-us.kr/list/event SPA 페이지
  // 카테고리 "IT/개발" 한정 1차 필터
  async collect(opts?): Promise<CollectResult>;
}

// backend/lib/sources/luma.ts
export class LumaAdapter extends SourceAdapter {
  readonly id = 'luma' as const;
  readonly enabled = process.env.ENABLE_LUMA !== 'false';
  // 비공식 API: GET https://api.lu.ma/discover/category/get-paginated-events?category=ai
  // JSON 직접 파싱 (Playwright 불필요)
  async collect(opts?): Promise<CollectResult>;
}

// backend/lib/sources/dev-event.ts
export class DevEventAdapter extends SourceAdapter {
  readonly id = 'dev_event' as const;
  readonly enabled = process.env.ENABLE_DEV_EVENT !== 'false';
  // GitHub API: GET /repos/hyunjun/dev-event/contents/README.md
  // GITHUB_TOKEN 사용 (rate limit 5000/h)
  // README markdown 파싱 → 행사 row 추출
  async collect(opts?): Promise<CollectResult>;
}

// backend/lib/sources/devpost.ts
export class DevpostAdapter extends SourceAdapter {
  readonly id = 'devpost' as const;
  readonly enabled = process.env.ENABLE_DEVPOST !== 'false';
  // RSS: https://devpost.com/hackathons.rss (1차)
  // 상세는 cheerio로 HTML 보강 (2차)
  // AI 카테고리 키워드 매칭으로 필터
  async collect(opts?): Promise<CollectResult>;
}
```

### 4.3 소스별 크롤링 난이도 및 접근 방식

| 소스 | 난이도 | 방식 | 비고 |
|------|--------|------|------|
| **Festa** | ★★★☆☆ | Playwright (SPA) | **폐업 위험 있음** → `ENABLE_FESTA=false`로 비활성화 가능. 어댑터는 유지하되 런타임 토글 |
| **이벤터스** | ★★★☆☆ | Playwright (SPA) | "IT/개발" 카테고리 한정 1차 필터, 키워드 분류에서 AI 행사만 마킹 |
| **Luma** | ★★☆☆☆ | 비공식 JSON API | `api.lu.ma/discover/category/get-paginated-events` 직접 호출. API 변경 가능성 모니터링 필요 |
| **Dev-Event** | ★☆☆☆☆ | GitHub API + Markdown 파싱 | `hyunjun/dev-event` repo README. 일 1회 수집으로 충분 |
| **Devpost** | ★★☆☆☆ | RSS + cheerio | `/hackathons.rss` 기본 + 상세 HTML 보강. AI 태그 필터링 |

### 4.4 어댑터 장애 격리

- 각 어댑터는 독립 try/catch + timeout(소스당 60초)
- `Promise.allSettled`로 일괄 실행 → 한 소스 실패가 다른 소스에 영향 없음
- 실패 시 `source_run_logs.status = 'failed'` 기록 + 30분 후 1회 자동 재시도 (Cron이 별도 시간대에 재실행)
- 3회 연속 실패 시 운영자 이메일 알림

---

## 5. Mock 전략

### 5.1 USE_MOCK 환경변수

```bash
USE_MOCK=true    # 모든 어댑터가 mocks/{source}.json을 읽음
USE_MOCK=false   # 실제 크롤링 (프로덕션)
```

`SourceAdapter.collect()` 내부에서 `useMock()` 체크 시 즉시 mock JSON 반환:

```ts
async collect(): Promise<CollectResult> {
  if (this.useMock()) {
    const data = await import(`@/mocks/${this.id}.json`);
    return { source: this.id, events: data.events, ... };
  }
  // 실제 크롤링 로직
}
```

### 5.2 mocks/ 폴더 구조

```
mocks/
├── festa.json          # { events: RawEvent[5] } - 국내 밋업 5건
├── eventus.json        # { events: RawEvent[5] } - 국내 컨퍼런스 5건
├── luma.json           # { events: RawEvent[5] } - 글로벌 AI 행사 5건
├── dev-event.json      # { events: RawEvent[5] } - 큐레이션 행사 5건
├── devpost.json        # { events: RawEvent[5] } - 해커톤 5건
└── users.json          # 테스트 유저 + 구독 시드 (개발/QA용)
```

각 mock 파일은 실제 `RawEvent` 스키마를 준수해, 정규화/dedupe/classifier 파이프라인 전 구간 테스트 가능.

### 5.3 Mock 우선 개발 흐름

1. Mock 데이터로 전체 수집 파이프라인 동작 검증
2. UI/알림/북마크/구독 모두 mock 기반으로 1차 완성
3. 실 크롤링 어댑터는 mock 인터페이스를 그대로 채우는 형태로 개별 구현
4. 1개 어댑터씩 실제 모드 전환 (Phase 6 Integration 단계)

---

## 6. 배포 전략

### 6.1 환경 분리

| 환경 | 도메인 | DB | 비고 |
|------|--------|----|----|
| **Local** | `localhost:3000` | Supabase 로컬 (CLI) 또는 dev 프로젝트 | `USE_MOCK=true` 기본 |
| **Preview** | `aieventradar-*.vercel.app` | Supabase dev 프로젝트 | PR마다 자동 배포 |
| **Production** | `aieventradar.com` | Supabase prod 프로젝트 | main 브랜치 |

### 6.2 Vercel 배포

- GitHub 레포 연결 → 푸시 자동 배포
- `vercel.json`에 Cron 정의:

```json
{
  "crons": [
    { "path": "/api/cron/collect", "schedule": "0 */6 * * *" },
    { "path": "/api/cron/notify", "schedule": "0 * * * *" }
  ]
}
```

- Hobby 플랜 Cron: 일 단위/시간 단위 가능. Function 실행 한도 60초(Pro)/10초(Hobby)
- Function 실행 60초로 부족 시: 1) 어댑터당 별도 cron 엔드포인트로 분할, 2) Edge Function streaming, 3) Railway 워커 분리 (fallback)

### 6.3 Supabase

- prod 프로젝트 생성 → `migrations/` SQL 적용 (CLI `supabase db push`)
- RLS 정책 활성화 필수 (DATABASE.md 참조)
- Service Role Key는 `/api/cron/*` 엔드포인트에서만 사용 (CRON_SECRET 검증 후)
- 자동 백업 일 1회 (무료 티어 기본)

### 6.4 Resend

- API key 발급 → 도메인 검증(SPF/DKIM) → from 주소 `noreply@aieventradar.com`
- React Email로 다이제스트 템플릿 작성 (`backend/lib/services/email.ts`)
- Unsubscribe 링크 필수 (사용자 토큰 기반 1-click)

### 6.5 모니터링

- **Vercel Logs**: 함수 실행 로그 실시간 (Hobby 1시간 retention)
- **Sentry**: 클라이언트/서버 에러 트래킹 (`@sentry/nextjs`)
- **관리자 대시보드**: `/admin/source-runs`에서 최근 100회 수집 로그 표 형태로 확인 + 수동 재실행 버튼
- **알림**: 수집 3회 연속 실패 시 운영자 이메일 자동 발송

### 6.6 단계별 배포 체크리스트

1. Supabase 프로젝트 생성 + 마이그레이션 적용 + RLS 검증
2. Resend 도메인 등록 + 테스트 메일 1건 발송 확인
3. `.env.production` 모든 키 설정 (CRON_SECRET, SUPABASE_*, RESEND_API_KEY, GITHUB_TOKEN 등)
4. Vercel 배포 + Cron 활성화 확인
5. `USE_MOCK=true`로 1차 배포 → end-to-end 동작 검증
6. 어댑터 1개씩 `USE_MOCK=false` 전환 (소스별 IP/UA 차단 여부 모니터링)
7. Sentry 통합 + 첫 에러 알림 수신 확인
8. 도메인 연결 + SSL 자동 발급

---

## 7. 보안/프라이버시 요점

- 비밀번호 저장 안 함 (Magic Link / Google OAuth만)
- Cron 엔드포인트는 `Authorization: Bearer ${CRON_SECRET}` 검증
- Service Role Key는 서버 사이드 only, 클라이언트 코드 노출 금지
- RLS로 `user_id = auth.uid()` 강제 (DB 레벨 권한)
- Unsubscribe 링크는 HMAC 서명 토큰 기반 (이메일 평문 노출 방지)
- 크롤링은 robots.txt 준수, 차단 시 즉시 해당 소스 ENABLE_* 토글 OFF
