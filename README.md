# AIEventRadar

국내외 AI 관련 행사 정보를 자동으로 수집해 사용자에게 알림을 보내주는 서비스입니다.

## 가치 제안

- **시간 절약**: 5개 플랫폼(Festa, 이벤터스, Luma, Dev-Event, Devpost)을 매일 돌아다닐 필요 없이 한 곳에서 모아 본다
- **정보 위생**: 중복 행사 자동 제거, 정규화된 일관된 포맷
- **놓치지 않음**: 새 행사 등록 즉시 + 마감 임박 시 알림
- **개인화**: "LLM", "Agent", "MLOps" 등 관심 키워드 기반 필터링
- **글로벌 + 로컬**: 국내 밋업부터 글로벌 해커톤까지 통합

## 기술 스택

| 영역 | 기술 |
|------|------|
| **Frontend** | Next.js 15 + TypeScript + Tailwind CSS + shadcn/ui |
| **Backend** | Next.js 15 API Routes + TypeScript |
| **Database** | Supabase (PostgreSQL + RLS + Magic Link/OAuth) |
| **Crawling** | Playwright + cheerio |
| **Email** | Resend + React Email |
| **Scheduler** | Vercel Cron Jobs |
| **Monitoring** | Vercel Logs + Sentry (선택) |

## 디렉토리 구조

```
AIEventRadar/
├── README.md                  # (이 파일)
├── .env.example               # 환경변수 템플릿
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── vercel.json                # Cron 스케줄
│
├── docs/                      # 기획/설계/QA 문서
│   ├── IDEA.md
│   ├── PLANNING.md
│   ├── BUSINESS.md
│   ├── COMPETITORS.md
│   ├── ARCHITECTURE.md
│   ├── API_SPEC.md
│   ├── DATABASE.md
│   ├── REQUIREMENTS.md
│   ├── CHANGELOG.md
│   ├── QA_REPORT_v1.md
│   ├── QA_REPORT_v2.md
│   └── FINAL_REPORT.md
│
├── frontend/                  # Next.js App Router
│   ├── src/app/               # 페이지 + API routes
│   ├── src/components/        # UI 컴포넌트
│   ├── src/context/           # 상태 관리
│   ├── src/hooks/             # 커스텀 훅
│   ├── src/lib/               # 유틸 (api, supabase, types)
│   ├── package.json
│   └── README.md
│
├── backend/                   # 서버 로직 (Next.js에서 import)
│   ├── src/lib/
│   │   ├── sources/           # 5개 소스 어댑터
│   │   ├── services/          # 수집/정규화/분류/알림
│   │   ├── db/                # Supabase 클라이언트
│   │   ├── notifications/     # 이메일 발송
│   │   └── utils/             # 인증/에러 처리
│   ├── migrations/            # SQL 마이그레이션
│   ├── mocks/                 # Mock 데이터
│   └── README.md
│
└── mocks/                     # (USE_MOCK=true 시) Mock JSON
    ├── festa.json
    ├── eventus.json
    ├── luma.json
    ├── dev-event.json
    └── devpost.json
```

## 빠른 시작

### 1. 저장소 복제 및 의존성 설치

```bash
git clone https://github.com/your-username/aieventradar.git
cd AIEventRadar
npm install
```

### 2. 환경변수 설정

`.env.local` (또는 `.env.example`에서 복사) 파일을 작성합니다.

```bash
cp .env.example .env.local
```

**필수 환경변수**:

| 변수 | 용도 |
|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 클라이언트 anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | cron/admin 전용 |
| `RESEND_API_KEY` | 이메일 발송 |
| `RESEND_FROM_EMAIL` | from 주소 (`noreply@aieventradar.com`) |
| `CRON_SECRET` | Cron 인증 (32자+) |
| `AUTH_SECRET` | 세션 암호화 (32자+) |
| `NEXT_PUBLIC_APP_URL` | 앱 URL (`http://localhost:3000` 로컬, `https://aieventradar.com` 프로덕션) |
| `USE_MOCK` | `true` 시 Mock 모드 (개발/테스트) |

**선택 환경변수**:

| 변수 | 용도 |
|------|------|
| `GITHUB_TOKEN` | Dev-Event API rate limit 완화 |
| `NEXT_PUBLIC_SENTRY_DSN` | 에러 모니터링 |
| `ENABLE_FESTA` | Festa 어댑터 토글 (기본 활성화) |
| `ENABLE_EVENTUS` | 이벤터스 토글 |
| `ENABLE_LUMA` | Luma 토글 |
| `ENABLE_DEV_EVENT` | Dev-Event 토글 |
| `ENABLE_DEVPOST` | Devpost 토글 |

전체 리스트는 `docs/REQUIREMENTS.md`를 참고합니다.

### 3. 데이터베이스 마이그레이션

Supabase 대시보드 또는 CLI를 통해 마이그레이션을 적용합니다.

```bash
# Supabase CLI 사용 시
supabase db push

# 또는 Supabase Dashboard → SQL Editor에 backend/migrations/001_initial.sql 붙여넣기
```

마이그레이션 내용:
- 6개 테이블 (users, events, bookmarks, subscriptions, notification_logs, source_run_logs)
- 8개 ENUM 타입
- RLS 정책 (권한 격리)
- 전문 검색 인덱스

### 4. Cron 태스크 설정

`vercel.json`에 정의된 Cron 스케줄:
- 수집: 6시간마다 (`0 */6 * * *`)
- 알림: 매시간 (`0 * * * *`)

```bash
# Vercel 배포 후 대시보드에서 자동 활성화
```

개발 환경에서는 수동 호출:

```bash
# 수집
curl -X POST http://localhost:3000/api/cron/collect \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "content-type: application/json" \
  -d '{}'

# 알림
curl -X POST http://localhost:3000/api/cron/notify \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "content-type: application/json" \
  -d '{"mode":"auto","dry_run":false}'
```

### 5. 개발 서버 실행

```bash
# Mock 모드 (Supabase 없이 동작)
USE_MOCK=true npm run dev

# 또는 실제 백엔드 연동
npm run dev
```

브라우저에서 `http://localhost:3000` 접속.

## 상태

**MVP 개발 완료 (QA Pass)**

| Phase | 상태 | 상세 |
|-------|------|------|
| 1. 기획 | ✅ 완료 | PLANNING.md 7개 기능 + KPI |
| 2. 설계 | ✅ 완료 | ARCHITECTURE.md 시스템 설계 |
| 3. 구현 | ✅ 완료 | Backend 40+ 파일 + Frontend 66+ 파일 |
| 4. QA | ✅ 완료 | v1 Fail → Critical 2개 수정 → v2 Pass |
| 5. 문서화 | ✅ 완료 | README, FINAL_REPORT, 마이그레이션 |
| 6. 통합 | ⏳ 대기 | `/integrate` - 실제 계정 연동 |
| 7. 배포 | ⏳ 대기 | `/deploy` - 프로덕션 배포 |

## 문서

- [PLANNING.md](docs/PLANNING.md) — MVP 기능 정의, 사용자 시나리오, KPI
- [ARCHITECTURE.md](docs/ARCHITECTURE.md) — 기술 스택, 시스템 구조, 배포 전략
- [REQUIREMENTS.md](docs/REQUIREMENTS.md) — 환경변수, 필수/선택 계정, 월 비용
- [API_SPEC.md](docs/API_SPEC.md) — REST API 엔드포인트
- [DATABASE.md](docs/DATABASE.md) — 스키마, RLS 정책, 마이그레이션
- [QA_REPORT_v2.md](docs/QA_REPORT_v2.md) — 최종 QA 결과 (PASS)
- [FINAL_REPORT.md](docs/FINAL_REPORT.md) — 프로젝트 완료 보고서
- [CHANGELOG.md](docs/CHANGELOG.md) — 버전 이력

## 필수 계정 (MVP 런칭 전)

| 서비스 | 용도 | 티어 | 설정 |
|--------|------|------|------|
| **Supabase** | DB + Auth + Storage | Free | [가입](https://supabase.com) |
| **Resend** | 이메일 발송 | Free (월 3,000건) | [가입](https://resend.com) + 도메인 검증 |
| **Vercel** | 호스팅 + Cron | Hobby (개인 무료) | [가입](https://vercel.com) + GitHub 연결 |
| **GitHub Token** | Dev-Event API | 무료 | [발급](https://github.com/settings/tokens) |

더 자세한 내용은 [REQUIREMENTS.md](docs/REQUIREMENTS.md) §1~3을 참고합니다.

## 개발 명령어

```bash
# 개발 서버
npm run dev

# 빌드
npm run build

# 빌드 후 서버 실행
npm run start

# 타입 체크
npm run type-check

# 린트
npm run lint
```

## MVP 기능 (F1~F7)

| ID | 기능 | 상태 |
|---|------|------|
| F1 | 다중 소스 수집기 (Festa, 이벤터스, Luma, Dev-Event, Devpost) | ✅ |
| F2 | 정규화 + 중복 제거 | ✅ |
| F3 | AI 키워드 필터링 | ✅ |
| F4 | 행사 리스트 웹 UI (검색/필터) | ✅ |
| F5 | 북마크 + 구독 키워드 | ✅ |
| F6 | 이메일 알림 (다이제스트 + D-3) | ✅ |
| F7 | 관리자 모니터링 + 수동 재실행 | ✅ |

## 알려진 한계 (Phase 2에서 처리)

- **Festa 폐업 위험**: `ENABLE_FESTA=false`로 비활성화 가능
- **실 크롤링 셀렉터**: 각 소스별로 실 환경에서 검증 필요 (mocks로 QA 완료)
- **Minor 5개**: M1~M5 (마이그레이션 분리, Mock 번들, Rate limit, WCAG 검증)

## 다음 단계

1. **Phase 6 Integration** (`/integrate`): 실제 Supabase/Resend 계정 연동 + 어댑터 실 크롤링 검증
2. **Phase 7 Deploy** (`/deploy`): Vercel 배포 + 도메인 연결 + 프로덕션 모니터링
3. **Phase 2 확장**: Slack/Discord/Telegram 알림, Google Calendar 연동, 추천 알고리즘

## 라이선스

(TBD)

## 문의

[dev3@doublt.com](mailto:dev3@doublt.com)
