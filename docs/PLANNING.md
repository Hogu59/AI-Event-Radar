# AIEventRadar 기획서

## 1. 개요

### 1.1 프로젝트 설명
AIEventRadar는 흩어져 있는 국내외 AI 관련 행사 정보를 자동으로 수집·정규화·중복제거하여 한 곳에서 보여주고, 사용자 관심사에 맞춰 개인화 알림을 보내주는 행사 정보 허브 서비스입니다.

5개 핵심 소스(**Festa, 이벤터스, Luma, Dev-Event, Devpost**)에서 행사를 자동 크롤링하고, AI 키워드 필터링과 사용자 맞춤 구독 규칙을 통해 "정말 필요한 행사만" 사용자에게 전달합니다.

### 1.2 핵심 가치 제안 (Value Proposition)
- **시간 절약**: 5개 플랫폼을 매일 돌아다닐 필요 없이 한 번에 모아 본다
- **정보 위생**: 중복 행사 자동 제거, 정규화된 일관된 포맷
- **놓치지 않음**: 새 행사 등록 즉시 + 마감 임박 시 알림
- **개인화**: "LLM", "Agent", "MLOps" 등 관심 키워드 기반 필터링
- **글로벌 + 로컬**: 국내 밋업부터 글로벌 해커톤까지 통합

### 1.3 타겟 사용자
- **Primary**: AI/ML 엔지니어, 데이터 사이언티스트 (20대 후반~30대, 적극 학습형)
- **Secondary**: AI 분야 대학원생/연구자, AI 스타트업 PM/디자이너
- **Tertiary**: 해커톤·컨퍼런스 적극 참여자(개발자 커뮤니티 활동가)

---

## 2. 기능 정의

### 2.1 MVP 필수 기능 (Phase 1, 1~2주)

| # | 기능명 | 설명 |
|---|--------|------|
| F1 | **다중 소스 수집기** | Festa, 이벤터스, Luma, Dev-Event, Devpost 5개 어댑터 + 통합 스케줄러 (6시간 주기) |
| F2 | **정규화 + 중복 제거** | 표준 Event 스키마로 변환, 제목+날짜+장소 기반 fuzzy match dedup |
| F3 | **AI 키워드 필터링** | 사전 정의된 AI 키워드 사전(LLM/ML/생성형/RAG/Agent 등)으로 자동 분류 |
| F4 | **행사 리스트 웹 UI** | 검색, 필터(소스/카테고리/날짜/장소), 카드형 리스트, 상세 페이지 |
| F5 | **북마크 + 구독 키워드** | 관심 행사 저장, 관심 키워드 등록 (이메일 없이 익명 사용 가능 + 가입 시 동기화) |
| F6 | **이메일 알림** | 신규 행사 매칭 시 다이제스트 메일(매일/매주 선택), 마감 D-3 알림 |
| F7 | **간단 관리자 모니터링** | 수집 성공/실패 로그, 소스별 수집 카운트, 수동 재실행 버튼 |

### 2.2 Phase 2 확장 기능

| # | 기능명 | 설명 |
|---|--------|------|
| P1 | Slack/Discord/Telegram Webhook 알림 | 채널별 알림 연동 |
| P2 | Google Calendar/iCal 연동 | 북마크한 행사 자동 캘린더 추가 |
| P3 | 추천 알고리즘 | 사용자 북마크/클릭 행동 기반 유사 행사 추천 |
| P4 | 후기/평점 시스템 | 참여 후 1~5점 평가, 짧은 리뷰 |
| P5 | 다국어 지원 (영문) | 글로벌 사용자 대상 영문 UI |
| P6 | 행사 호스트 직접 등록 | 검증된 호스트가 자체 행사 등록 |
| P7 | 모바일 PWA + 푸시 | 모바일 최적화, 웹푸시 알림 |
| P8 | API 공개 | 써드파티가 데이터 활용 가능한 공개 API |

---

## 3. 사용자 시나리오

### 시나리오 1: ML 엔지니어 김주현 (29세, 서울)
**페르소나**: 5년차 ML 엔지니어. 주말에 해커톤 참여하는 게 취미. RAG/Agent에 관심.

**플로우**:
1. 친구가 공유한 AIEventRadar 링크로 방문 → 가입 없이 행사 리스트 둘러봄
2. "RAG", "Agent", "LangChain" 키워드 검색 → 마음에 드는 3개 행사 북마크
3. 북마크하려는 순간 가입 유도 모달 → 이메일/Google 로그인
4. 마이페이지에서 "RAG", "Agent" 키워드 구독 등록, 알림은 "주 1회 다이제스트"로 설정
5. 일주일 후 매칭 행사 5개 이메일 수신 → 1개 신청

### 시나리오 2: AI 스타트업 PM 이수민 (32세, 판교)
**페르소나**: AI 스타트업에서 제품 기획. B2B 컨퍼런스/네트워킹 행사에 관심.

**플로우**:
1. 이벤터스, Luma를 매일 따로 보기 귀찮아서 AIEventRadar 가입
2. "엔터프라이즈", "LLMOps", "B2B" 키워드 + "서울/판교" 지역 필터 구독
3. 마감 D-3 알림으로 놓칠 뻔한 컨퍼런스 발견 → 참석 후 좋은 리드 확보

### 시나리오 3: 대학원생 박지호 (26세, 대전)
**페르소나**: AI 박사과정. 해커톤으로 상금/포트폴리오 챙기는 게 목표.

**플로우**:
1. Devpost 글로벌 해커톤이 핵심 관심사
2. AIEventRadar에서 소스 필터 "Devpost" + 카테고리 "Hackathon" 구독
3. 신규 등록 즉시 알림(Realtime) 설정 → 글로벌 대회 우선 신청 기회 확보

### 시나리오 4: 디자이너 최예린 (28세, 원격근무)
**페르소나**: AI 프로덕트 디자이너. UX 컨퍼런스와 AI를 동시에 다루는 행사 선호.

**플로우**:
1. "디자인", "UX", "프로덕트" 키워드 + AI 카테고리 교집합 구독
2. 매월 다이제스트로 글로벌 Luma 행사 2~3개 발견 → 온라인 참석

---

## 4. 핵심 데이터 모델 개요

### 4.1 Event (행사)
```
id: UUID
source: enum [festa, eventus, luma, dev_event, devpost]
source_event_id: string         # 원본 플랫폼의 행사 ID
source_url: string              # 원본 페이지 URL
title: string
description: text
start_at: timestamp
end_at: timestamp
timezone: string
location_type: enum [online, offline, hybrid]
location_name: string           # "강남구 역삼동" / "Online"
city: string                    # 검색 필터용
country: string
host_name: string
price: string                   # "무료" / "유료" / 가격
categories: string[]            # ["AI", "LLM", "Hackathon"]
keywords_matched: string[]      # AI 키워드 매칭 결과
thumbnail_url: string
dedupe_hash: string             # 중복 제거용 (title + date + location 정규화)
is_ai_related: boolean          # AI 키워드 필터 결과
collected_at: timestamp
updated_at: timestamp
```

### 4.2 User
```
id: UUID
email: string (unique)
display_name: string
auth_provider: enum [email, google]
notification_channel: enum [email]  # MVP, Phase2에 slack/discord 추가
digest_frequency: enum [realtime, daily, weekly, off]
created_at: timestamp
last_active_at: timestamp
```

### 4.3 Subscription (구독 규칙)
```
id: UUID
user_id: UUID (FK)
name: string                    # "내 RAG/Agent 구독"
keywords: string[]              # ["RAG", "Agent", "LangChain"]
sources: string[] | null        # 특정 소스만 (null=전체)
location_types: string[] | null # ["offline", "online"]
cities: string[] | null         # ["서울", "판교"]
notify_on_new: boolean
notify_on_deadline: boolean     # D-3 알림
is_active: boolean
created_at: timestamp
```

### 4.4 Bookmark
```
id: UUID
user_id: UUID (FK)
event_id: UUID (FK)
note: text (nullable)
created_at: timestamp
```

### 4.5 NotificationLog
```
id: UUID
user_id: UUID (FK)
subscription_id: UUID (FK)
event_ids: UUID[]
channel: enum [email]
status: enum [queued, sent, failed]
sent_at: timestamp
error: text (nullable)
```

### 4.6 SourceRunLog (관리자용)
```
id: UUID
source: string
started_at: timestamp
finished_at: timestamp
status: enum [success, partial, failed]
events_collected: int
events_new: int
events_updated: int
error_message: text (nullable)
```

---

## 5. 비기능 요구사항

### 5.1 수집 (Crawling)
- **수집 주기**: 6시간마다 전체 소스 1회 (1일 4회). Dev-Event는 일 1회로 충분.
- **수집 시간**: 전체 소스 1회 사이클 10분 이내 완료
- **재시도 정책**: 소스 1개 실패 시 다른 소스에 영향 없음. 실패 소스는 30분 후 1회 자동 재시도.
- **유저 에이전트/예의**: robots.txt 준수, 요청 간 1초 이상 대기, 동시 요청 최대 2개.
- **장애 격리**: 1개 소스 장애가 전체 파이프라인을 중단시키지 않음.

### 5.2 데이터 정확성
- **중복 제거 정확도**: 동일 행사 dedupe 정확도 95% 이상 (수동 샘플링 검증)
- **AI 키워드 필터 정밀도**: precision 85% 이상 (오탐 최소화 우선)
- **필수 필드 결측 허용치**: title/source_url/start_at은 0% 결측. location/host는 30% 결측 허용.

### 5.3 알림 (Notification)
- **알림 지연 허용치**:
  - Realtime: 수집 완료 후 30분 이내 발송
  - Daily 다이제스트: 매일 오전 9시(KST) ±30분
  - Weekly 다이제스트: 월요일 오전 9시(KST) ±30분
  - 마감 D-3 알림: 행사 시작 72시간 전 ±6시간
- **알림 안정성**: 발송 성공률 99% 이상, 실패 시 1회 자동 재시도

### 5.4 성능
- **웹 페이지 응답**: 행사 리스트 초기 로드 1.5초 이내 (이벤트 100건 기준)
- **검색 응답**: 키워드 검색 결과 500ms 이내
- **동시 사용자**: MVP 기준 동시 접속 100명 처리

### 5.5 가용성
- **목표 가동률**: 95% (MVP). 무중단 배포 불필요.
- **데이터 백업**: Supabase 자동 백업(일 1회) 사용
- **장애 알림**: 수집 3회 연속 실패 시 운영자에게 이메일

### 5.6 보안 / 프라이버시
- 비밀번호 저장 안 함 (Magic link 또는 OAuth)
- 사용자 이메일 외 PII 수집 최소화
- 알림 발송 unsubscribe 링크 필수
- 원본 사이트 크롤링 정책 위반 시 즉시 해당 소스 중단

### 5.7 확장성
- 새 소스 추가는 Adapter 인터페이스 구현만으로 가능 (1개 소스 추가 1일 이내)
- 행사 데이터 1년치(예상 1만 건) 저장 시 Supabase 무료 티어 내 운용

---

## 6. 성공 지표 (KPI)

| 지표 | 목표 (런칭 후 3개월) |
|------|---------------------|
| 누적 수집 행사 수 | 2,000건+ |
| 가입 사용자 | 500명+ |
| 주간 활성 사용자 (WAU) | 150명+ |
| 알림 클릭률 (CTR) | 15% 이상 |
| 북마크/사용자 평균 | 3건 이상 |
| 사용자 1주차 리텐션 | 30% 이상 |
