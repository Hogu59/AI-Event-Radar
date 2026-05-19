# AIEventRadar 운영 요구사항

> MVP 기준 외부 계정/API/도메인/환경변수 체크리스트
> BUSINESS.md 3장 비용표와 정합성 유지

## 1. 필수 계정 (MVP 런칭 전 준비)

### 1.1 Supabase
- **용도**: PostgreSQL DB + Auth(Magic Link/OAuth) + Storage
- **가입**: https://supabase.com/dashboard/sign-up (Google 또는 GitHub)
- **티어**: Free Tier
  - DB 500MB, Auth 사용자 50,000명, Bandwidth 5GB/월, Storage 1GB
- **MVP 충분 여부**: O (1년 데이터 1만 건 기준 약 100MB 사용 예상)
- **유료 전환 시점**: 사용자 5,000명+ 또는 DB 400MB 도달 시 Pro ($25/월)
- **환경변수**:
  - `NEXT_PUBLIC_SUPABASE_URL` (프로젝트 URL)
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` (anon public key)
  - `SUPABASE_SERVICE_ROLE_KEY` (cron/admin 전용, **노출 금지**)

### 1.2 Resend
- **용도**: 트랜잭션/다이제스트 이메일 발송
- **가입**: https://resend.com/signup
- **티어**: Free
  - 월 3,000건, 일 100건, 도메인 1개
- **MVP 충분 여부**: O (500명 × 주 1회 = 월 2,000건)
- **유료 전환 시점**: 사용자 800명 이상 또는 일 발송 100건 초과 시 Pro ($20/월, 5만 건)
- **준비 작업**:
  1. 도메인 등록 후 DNS 검증 (SPF, DKIM 레코드 추가)
  2. `from` 주소 설정: `noreply@aieventradar.com`
- **환경변수**:
  - `RESEND_API_KEY`
  - `RESEND_FROM_EMAIL=noreply@aieventradar.com`

### 1.3 Vercel
- **용도**: Next.js 호스팅 + Cron Jobs + Serverless Functions
- **가입**: https://vercel.com/signup (GitHub 연동)
- **티어**: Hobby (개인 무료)
  - Function 실행 10초/요청 한도, 100GB Bandwidth/월, Cron Jobs 무료
- **MVP 충분 여부**: O (단, collect 함수가 10초 초과 시 어댑터별 분할 필요)
- **유료 전환 시점**: 상업 사용 시작 또는 함수 실행 60초 필요 시 Pro ($20/월)
- **환경변수**: Vercel 대시보드에서 모든 env 등록
- **Cron 설정**: `vercel.json`에 정의

---

## 2. 선택 계정 (있으면 권장)

### 2.1 Sentry
- **용도**: 에러 모니터링 (클라이언트 + 서버)
- **가입**: https://sentry.io/signup
- **티어**: Developer (무료)
  - 5,000 errors/월, 7일 retention
- **MVP 충분 여부**: O
- **환경변수**:
  - `NEXT_PUBLIC_SENTRY_DSN`
  - `SENTRY_AUTH_TOKEN` (sourcemap 업로드용)
  - `SENTRY_ORG`, `SENTRY_PROJECT`

### 2.2 Google OAuth (소셜 로그인)
- **용도**: Google 계정으로 회원가입/로그인
- **준비**: https://console.cloud.google.com → OAuth 2.0 Client ID 생성
  - Redirect URI: `https://[supabase-project].supabase.co/auth/v1/callback`
- **티어**: 무료 (제한 없음)
- **Supabase 설정**: Authentication → Providers → Google에서 Client ID/Secret 입력
- **환경변수**: Supabase 내 설정 (별도 .env 불필요)

### 2.3 GitHub Personal Access Token
- **용도**: Dev-Event 저장소 API rate limit 완화 (비인증 60/h → 5,000/h)
- **발급**: https://github.com/settings/tokens?type=beta (Fine-grained, public repo 읽기만)
- **티어**: 무료
- **환경변수**:
  - `GITHUB_TOKEN`

### 2.4 도메인 (aieventradar.com)
- **용도**: 사용자 접근/이메일 from 도메인/브랜딩
- **추천 등록**: Namecheap, Cloudflare Registrar, Porkbun
- **비용**: 연 약 $12 (.com 기준) = 월 약 1,500원
- **DNS 설정**:
  - Vercel: A 레코드 `76.76.21.21` 또는 CNAME `cname.vercel-dns.com`
  - Resend: SPF (`v=spf1 include:resend.com ~all`) + DKIM (Resend 대시보드에서 제공)
- **선택**: MVP는 Vercel 기본 도메인(`aieventradar.vercel.app`)으로 충분, 정식 런칭 전 등록 권장

### 2.5 OpenAI API (선택)
- **용도**: 키워드 룰베이스로 분류 어려운 행사의 보조 AI 분류 (Phase 1.5+)
- **가입**: https://platform.openai.com
- **티어**: Pay as you go
- **MVP 충분 여부**: 룰베이스 분류 우선, OpenAI는 옵션 (`USE_LLM_CLASSIFY=false` 기본)
- **비용**: GPT-4o-mini 기준 분류 1건 약 $0.0001 → 월 1,000건 분류 시 약 $0.1
- **환경변수**:
  - `OPENAI_API_KEY`
  - `USE_LLM_CLASSIFY=false` (기본)

---

## 3. 환경변수 전체 정리

| 변수명 | 필수 | 용도 | 비고 |
|--------|------|------|------|
| **인프라/DB** | | | |
| `NEXT_PUBLIC_SUPABASE_URL` | O | Supabase 프로젝트 URL | 클라이언트 노출 가능 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | O | Anon 키 | 클라이언트 노출 가능 |
| `SUPABASE_SERVICE_ROLE_KEY` | O | Cron/Admin 전용 | **노출 금지** |
| **이메일** | | | |
| `RESEND_API_KEY` | O | Resend API | |
| `RESEND_FROM_EMAIL` | O | from 주소 | `noreply@aieventradar.com` |
| **스케줄러/보안** | | | |
| `CRON_SECRET` | O | Cron 인증 Bearer 토큰 | 임의 32자 이상 랜덤 |
| `AUTH_SECRET` | O | 세션 암호화 | 32자 이상 |
| **소스 어댑터** | | | |
| `GITHUB_TOKEN` | 권장 | Dev-Event API | rate limit 완화 |
| `ENABLE_FESTA` | 선택 | Festa 어댑터 토글 | `false`면 비활성화 (폐업 대비) |
| `ENABLE_EVENTUS` | 선택 | 이벤터스 토글 | |
| `ENABLE_LUMA` | 선택 | Luma 토글 | |
| `ENABLE_DEV_EVENT` | 선택 | Dev-Event 토글 | |
| `ENABLE_DEVPOST` | 선택 | Devpost 토글 | |
| **개발 모드** | | | |
| `USE_MOCK` | 선택 | 어댑터 mock 모드 | `true` 시 mocks/*.json 사용 |
| `USE_LLM_CLASSIFY` | 선택 | OpenAI 보조 분류 | 기본 `false` |
| `OPENAI_API_KEY` | 선택 | OpenAI 키 | `USE_LLM_CLASSIFY=true`일 때만 |
| **모니터링** | | | |
| `NEXT_PUBLIC_SENTRY_DSN` | 선택 | Sentry DSN | 클라이언트 |
| `SENTRY_AUTH_TOKEN` | 선택 | Sourcemap 업로드 | |
| `SENTRY_ORG` | 선택 | Sentry org slug | |
| `SENTRY_PROJECT` | 선택 | Sentry project slug | |
| **운영** | | | |
| `NODE_ENV` | O | `development`/`production` | |
| `LOG_LEVEL` | 선택 | `info`/`debug`/`warn`/`error` | |
| `NEXT_PUBLIC_APP_URL` | O | Public 앱 URL | Magic Link redirect 등 |
| **Phase 2 (도입 시점에 추가)** | | | |
| `SLACK_WEBHOOK_URL` | - | P1: Slack 알림 | |
| `DISCORD_WEBHOOK_URL` | - | P1: Discord 알림 | |
| `TELEGRAM_BOT_TOKEN` | - | P1: Telegram 알림 | |
| `TOSS_PAYMENTS_SECRET_KEY` | - | Phase 2: 결제 | |

---

## 4. 월간 비용 추정 (BUSINESS.md 3장과 정합)

### 4.1 MVP 단계 (사용자 ~100명)

| 항목 | 서비스 | 월 비용 |
|------|--------|---------|
| DB + Auth + Storage | Supabase Free | 0원 |
| 호스팅 + Cron | Vercel Hobby | 0원 |
| 이메일 | Resend Free (월 3,000건) | 0원 |
| 모니터링 | Sentry Free | 0원 |
| 도메인 | aieventradar.com (.com) | 약 1,500원 (연 18,000원/12) |
| **합계** | | **약 1,500원/월** |

> Note: BUSINESS.md 3.4의 "MVP 약 10,000원" 은 Railway 백엔드 분리 가정. 본 아키텍처는 Vercel 단독이므로 추가 절감 (Railway $5/월 = 약 7,000원 미사용)

### 4.2 초기 성장 단계 (사용자 ~1,000명)

| 항목 | 서비스 | 월 비용 |
|------|--------|---------|
| DB | Supabase Free (아직 무료 한도 내) | 0원 |
| 호스팅 + Cron | Vercel Hobby → Pro 전환 가능 | 0~28,000원 |
| 이메일 | Resend Pro ($20/월) - 월 5만 건 발송 | 약 28,000원 |
| 모니터링 | Sentry Free | 0원 |
| 도메인 | | 1,500원 |
| **합계** | | **약 30,000~60,000원/월** |

### 4.3 본격 운영 단계 (사용자 ~5,000명)

| 항목 | 서비스 | 월 비용 |
|------|--------|---------|
| DB | Supabase Pro ($25/월) | 약 35,000원 |
| 호스팅 + Cron | Vercel Pro ($20/월) | 약 28,000원 |
| 이메일 | Resend Pro | 약 28,000원 |
| 모니터링 | Sentry Free 또는 Team($26/월) | 0~36,000원 |
| OpenAI 분류 (옵션) | $0.1~$3/월 | 약 0~4,000원 |
| 도메인 | | 1,500원 |
| **합계** | | **약 100,000~135,000원/월** |

### 4.4 BUSINESS.md 일치 검증

| BUSINESS.md 3.4 단계 | 본 문서 추정 | 차이 |
|---|---|---|
| MVP 약 10,000원/월 | 약 1,500원/월 | Railway 미사용으로 절감 |
| 초기 성장 약 70,000~120,000원 | 약 30,000~60,000원 | 호스팅 무료 유지 가능 |
| 본격 운영 약 200,000~350,000원 (마케팅 포함) | 약 100,000~135,000원 (인프라만) | 마케팅 별도 |

→ 본 아키텍처는 BUSINESS.md 가정보다 **인프라 비용을 더 절감**. 1인 운영의 자본 부담 추가 완화.

---

## 5. 외부 가입/검수 작업 순서 (런칭 전 체크리스트)

1. [ ] Vercel 가입 + GitHub 레포 연결
2. [ ] Supabase 프로젝트 생성 (region: ap-northeast-2 Seoul 권장)
3. [ ] Supabase Auth → Google OAuth Provider 활성화 (Google Cloud Console에서 Client ID/Secret 발급)
4. [ ] Resend 가입 + 도메인 등록 + DNS 검증 (SPF/DKIM)
5. [ ] GitHub Personal Access Token 발급 (public_repo 읽기 권한)
6. [ ] (선택) Sentry 프로젝트 생성 + DSN 발급
7. [ ] 도메인 구매 + Vercel/Resend DNS 연결
8. [ ] 모든 환경변수 Vercel 대시보드에 등록 (Preview/Production 분리)
9. [ ] `CRON_SECRET`, `AUTH_SECRET` 32자 이상 임의 문자열 생성
10. [ ] `vercel.json` Cron 스케줄 검증 (배포 후 Vercel 대시보드에서 실행 확인)

---

## 6. 법무/약관 점검 (BUSINESS.md 4.5 리스크 대응)

- [ ] 각 소스(Festa, 이벤터스, Luma, Dev-Event, Devpost) **robots.txt** 확인
- [ ] 각 소스 이용약관 크롤링 조항 확인 (특히 상업적 이용 가능 여부)
- [ ] 위반 가능성 발견 시 해당 어댑터 `ENABLE_*=false` 토글로 즉시 차단
- [ ] (Phase 2 유료화 직전) 변호사 1회 검토 권장 (BUSINESS.md 3.3 기준 일회성 20~50만원)
- [ ] 개인정보처리방침 / 서비스 이용약관 페이지 작성 (MVP 런칭 전 필수)
- [ ] 이메일 발송 시 unsubscribe 링크 의무 포함 (스팸 신고 방지)
