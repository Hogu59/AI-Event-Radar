# 변경 이력

## [2026-05-19] 프로젝트 시작
- 아이디어 등록: AI 행사 정보 다중 소스 수집 + 알림 서비스
- 데이터 소스 후보 확정: Festa, 이벤터스, Luma, Dev-Event(GitHub), Devpost
- 폴더 구조 생성, Phase 1 기획 단계 진입

## [2026-05-19] Phase 1 기획 완료
- PLANNING.md: MVP 7개 기능(F1~F7) 정의, 데이터 모델 6개 객체, KPI 6개 지표
- BUSINESS.md: TAM 1400억/SAM 40억, B2C+B2B 수익화, MVP 월 1만원 비용, BEP 3개월차 가능
- COMPETITORS.md: 11개 경쟁사 분석, 다중소스+AI필터+개인화알림으로 차별화 확보
- 상태: 사용자 승인 대기

## [2026-05-19] Phase 2 아키텍처 설계 완료
- ARCHITECTURE.md: Next.js 15 풀스택, Supabase, Vercel Cron 기술 스택 확정
- 5개 소스 어댑터 인터페이스 설계 (SourceAdapter, RawEvent, CollectResult)
- Mock 전략 (USE_MOCK=true) + 배포 단계별 체크리스트
- 시스템 구조도 (수집 → 정규화 → 중복제거 → 분류 → DB)

## [2026-05-19] Phase 3 백엔드 구현 완료 (Opus)
- Backend 40+ 파일 구현:
  - API Routes: 12개 (auth, events, bookmarks, subscriptions, cron, admin)
  - 소스 어댑터: 5개 (Festa, 이벤터스, Luma, Dev-Event, Devpost)
  - 서비스: 수집, 정규화, 중복제거, AI 분류, 알림, 이메일
  - DB: Supabase 클라이언트, 인증 유틸
  - 마이그레이션: 001_initial.sql (6 테이블, 8 ENUM, RLS)
  - Mock 데이터: 5개 소스 × 5건씩 (총 25건)

## [2026-05-19] Phase 3 프론트엔드 구현 완료 (Opus)
- Frontend 66+ 파일 구현:
  - 페이지: 8개 (랜딩, 행사 리스트, 상세, 로그인, 마이페이지, 관리자)
  - 컴포넌트: 25+ (EventCard, Filter, Bookmark, Subscription, Header 등)
  - Context/Hooks: AuthContext, ThemeContext, useEvents, useBookmarks 등
  - API 클라이언트: 14개 엔드포인트 모두 구현
  - UI/UX: Tailwind + shadcn, 다크모드, 반응형, 접근성

## [2026-05-19] Phase 4 QA v1 완료 (FAIL)
- QA 결과: FAIL (Critical 2, Minor 5)
- Critical-1: `POST /api/admin/source-runs/retry` 백엔드 미구현 → 관리자 재실행 불가
- Critical-2: `digest_frequency` 사용자 변경 API 부재 → 알림 빈도 고정
- Minor: 마이그레이션 분리, Mock 번들, Rate limit, WCAG, seed_dev
- 재실행 권고: Backend (2 라우트), Frontend (1 페이지, 1 컴포넌트)

## [2026-05-19] Phase 3 수정 완료 (Critical 해소)
- Backend 2개 라우트 신설:
  - `admin/source-runs/retry/route.ts`: 관리자 수동 재실행 트리거 (POST)
  - `users/me/route.ts`: 프로필 조회/갱신 (GET, PATCH) - digest_frequency 포함
- Frontend 업데이트:
  - `api.ts`: getMe(), updateMe() 함수 추가
  - `my/page.tsx`: 프로필 fetch + digest_frequency 변경 시 API 호출
  - `NotificationSettings.tsx`: saving 상태 표시
- Mock 모드 호환성 유지 (getMe/updateMe 분기 포함)

## [2026-05-19] Phase 4 QA v2 완료 (PASS)
- QA 결과: PASS (Critical 0, Minor 5 잔여)
- v1 Critical 2개 모두 해소
- 회귀 없음 (기존 11개 route.ts 미수정, 신규 파일만 추가)
- API_SPEC 14/14 엔드포인트 구현
- MVP F1~F7 실효 동작 완료

## [2026-05-19] Phase 5 문서화 완료
- README.md: 프로젝트 개요, 기술 스택, 빠른 시작 (5단계), 상태 표
- FINAL_REPORT.md: 구현 요약, 산출물 통계, QA 결과, 다음 단계
- CHANGELOG.md: 버전 이력 (이 파일)
- 기존 문서 참조: PLANNING.md, ARCHITECTURE.md, API_SPEC.md, DATABASE.md, REQUIREMENTS.md, QA_REPORT_v2.md

## [2026-05-19] v1.0 MVP 개발 완료
- **상태**: Phase 5 문서화 완료, QA Pass
- **산출물**: 40+ 백엔드 파일 + 66+ 프론트엔드 파일 + SQL 마이그레이션
- **기능**: MVP 7개(F1~F7) 모두 완료
- **다음**: Phase 6 Integration (Supabase/Resend 연동), Phase 7 Deploy (프로덕션)
