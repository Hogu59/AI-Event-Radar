# AIEventRadar — Frontend

Next.js 15 (App Router) + TypeScript + Tailwind + shadcn/ui로 구현된 AIEventRadar 웹 클라이언트.

## 빠른 시작

```bash
cd frontend
npm install        # 또는 pnpm install / yarn
npm run dev        # http://localhost:3000
```

기본적으로 Supabase 환경변수가 없으면 **Mock 모드**로 동작합니다. 인메모리 mock 데이터로 모든 페이지를 사용해볼 수 있어요.

## 환경변수 (선택)

`.env.local`에 설정하세요. 모든 변수는 선택적입니다.

```
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
# Mock 강제: true로 두면 실제 백엔드 무시
NEXT_PUBLIC_USE_MOCK=true
```

| 변수 | 동작 |
|------|------|
| (둘 다 없음) | Mock 모드, 인메모리 데이터 |
| Supabase 설정됨 + `NEXT_PUBLIC_USE_MOCK=true` | Mock 모드 (개발/QA용) |
| Supabase 설정됨 + `NEXT_PUBLIC_USE_MOCK=false` (또는 미설정) | 실제 백엔드 API 호출 |

## 스크립트

```bash
npm run dev          # 개발 서버 (port 3000)
npm run build        # 프로덕션 빌드
npm run start        # 빌드 후 서버
npm run type-check   # tsc --noEmit
npm run lint         # eslint
```

## 페이지

- `/` — 랜딩 + 전체 행사 리스트 (필터 사이드바, 검색, 무한스크롤)
- `/events/[id]` — 행사 상세
- `/login` — Magic Link 로그인
- `/auth/callback` — Supabase Auth 콜백 (서버 라우트)
- `/my` — 마이페이지 (북마크/구독/알림 탭)
- `/my/bookmarks` — 북마크 목록
- `/my/subscriptions` — 구독 관리 (생성/수정/일시정지/삭제)
- `/admin` — 관리자 대시보드 (수집 로그 + 수동 재실행)

## 폴더 구조

```
frontend/
├── src/
│   ├── app/                 # Next.js App Router
│   ├── components/
│   │   ├── ui/              # shadcn primitives
│   │   └── *.tsx            # 도메인 컴포넌트
│   ├── context/             # AuthContext, ThemeContext
│   ├── hooks/               # useEvents, useBookmarks, useSubscriptions, useAuth
│   └── lib/                 # api, supabase, types, format, filters, utils
├── public/
└── tailwind.config.ts
```

## 디자인 규칙

- 다크모드 클래스 전략 (`<html class="dark">`)
- 카테고리/소스별 컬러 토큰 (`tailwind.config.ts`의 `cat.*`, `src.*`)
- 모바일 우선 반응형, 접근성(aria-label, focus ring, WCAG AA)
- KST 기준 날짜 표시 + 상대 라벨(오늘/내일/D-3)
