# AIEventRadar 경쟁사 분석

> 작성일: 2026-05-19
> 대상: AI 관련 행사(컨퍼런스/밋업/해커톤) 정보를 다중 소스에서 수집·정규화·중복제거하여 한국 사용자에게 개인화 알림을 보내는 서비스

---

## 1. 주요 경쟁사

### A. 한국 행사 큐레이션

#### 1) Dev-Event (brave-people/Dev-Event)
- **URL**: https://github.com/brave-people/Dev-Event
- **주요 기능**: 주간 단위 한국 개발자 웨비나/컨퍼런스/해커톤 큐레이션. GitHub Issue 기반 구독(Dev-Event-Subscribe), README 월별 아카이브.
- **가격**: 무료, 오픈소스
- **강점**:
  - 한국 개발자 행사에 특화된 가장 인지도 높은 큐레이션 채널
  - 수년간 누적된 신뢰와 커뮤니티 (GitHub Star 다수)
  - 사람이 직접 큐레이션해서 정보 품질 우수
- **약점**:
  - 사람 큐레이션 → 발견까지 지연(주간), 누락 가능
  - AI 분야 특화 필터 없음 (개발자 전반)
  - 개인화/알림 기능 부재 (GitHub watch에 의존)
  - 검색·북마크 UI 없음, 검색은 GitHub 검색에 의존

#### 2) Festa (festa.io)
- **URL**: https://festa.io
- **주요 기능**: 한국 IT 밋업/컨퍼런스 호스팅·티켓 발급 플랫폼. 일부 검색·카테고리 탐색 지원.
- **가격**: 호스트는 유료(티켓 수수료), 참가자는 무료
- **강점**:
  - 한국 IT 행사의 핵심 데이터 소스 (파이토치 한국 사용자 모임 등 다수 호스팅)
  - 결제·티켓·QR 체크인 통합
- **약점**:
  - **회사가 2025년 3월 폐업 / 서비스 종료 위험** → 데이터 소스로서 신뢰성 하락
  - AI 분야 별도 필터 없음
  - 개인화 알림 기능 미약
  - 단일 플랫폼: 다른 곳(이벤터스/Luma)에서 열리는 행사는 못 봄

#### 3) 디스콰이엇 (disquiet.io)
- **URL**: https://disquiet.io
- **주요 기능**: IT 메이커 SNS. 메이커 챌린지, 메이커 클럽 등 자체 운영 행사 위주. 행사 카테고리 페이지 존재.
- **가격**: 무료
- **강점**:
  - 한국 IT/스타트업 메이커 커뮤니티 강력
  - PM/디자이너/개발자 모두 활동 → 우리 타깃과 일부 겹침
- **약점**:
  - 자체 호스팅 행사 위주, 외부 행사 큐레이션은 부수적
  - AI 특화 아님 (메이커/사이드프로젝트 중심)
  - 행사 알림은 SNS 피드 기반, 키워드 알림 없음

#### 4) 온오프믹스 (onoffmix.com)
- **URL**: https://onoffmix.com
- **주요 기능**: 종합 모임/세미나/컨퍼런스 플랫폼. 월 3,500여 행사 게재. IT·스타트업·교육·문화 카테고리.
- **가격**: 호스트 유료, 참가자 무료
- **강점**:
  - 회원 150만명, 10년 이상 운영된 한국 최대 규모 모임 플랫폼
  - IT/컨퍼런스 카테고리 페이지 보유
- **약점**:
  - 종합 플랫폼이라 AI/개발자 행사 노이즈 비율 높음
  - AI 키워드 필터링·개인화 알림 부재
  - UI/UX 노후, 개발자 친화적이지 않음
  - 단일 소스

### B. 글로벌 AI 행사 큐레이션

#### 5) Luma (luma.com / lu.ma)
- **URL**: https://luma.com/discover , https://luma.com/ai
- **주요 기능**: 글로벌 이벤트 호스팅 + 디스커버리 플랫폼. 도시/카테고리별 필터, 캘린더 구독, AI 전용 디스커버리 페이지, ChatGPT 플러그인 제공.
- **가격**: 참가자 무료, 호스트는 결제 수수료 모델
- **강점**:
  - 글로벌 AI 커뮤니티(특히 SF/NYC)의 사실상 표준
  - 자체 디스커버리·캘린더 구독·맵 뷰 등 강력한 UX
  - 호스트가 직접 등록 → 데이터 최신성 우수
- **약점**:
  - 한국 행사 커버리지 매우 낮음 (Festa/이벤터스/온오프믹스 미커버)
  - 한국어 UI/UX 미흡
  - 키워드 기반 알림보다 도시·캘린더 구독 중심 → "RAG 관련 행사만 받고 싶다" 같은 정밀 필터 어려움
  - 단일 플랫폼 (Devpost, GitHub 큐레이션 등 외부 소스 미통합)

#### 6) dev.events
- **URL**: https://dev.events , https://dev.events/ai
- **주요 기능**: 글로벌 개발자 컨퍼런스 디렉토리. 지역별/주제별 필터. AI 카테고리에 335+ 컨퍼런스.
- **가격**: 무료
- **강점**:
  - 글로벌 컨퍼런스 데이터 풍부 (NVIDIA GTC, AI DevWorld, AI DevSummit 등)
  - 지역·주제 필터 깔끔
- **약점**:
  - 컨퍼런스(대형) 중심, 밋업·해커톤 약함
  - 한국 행사 거의 없음
  - 개인화 알림·계정 기능 부재 (수동 탐색만)
  - 큐레이션 빈도 낮음 (대형 행사 위주)

#### 7) AI Tinkerers (aitinkerers.org)
- **URL**: https://aitinkerers.org
- **주요 기능**: 223개 도시 10.6만명 규모 글로벌 AI 빌더 커뮤니티. 도시별 월간 밋업 캘린더 자체 운영.
- **가격**: 대부분 무료
- **강점**:
  - "Live code demo, no pitch" 컨셉으로 AI 빌더 사이에서 강한 브랜드
  - 도시별 자동 분기, 일관된 포맷, 캘린더 구독 가능
  - 우리가 데이터 소스로 활용 가능한 큐레이션 채널
- **약점**:
  - 자체 호스팅 밋업만 다룸 (외부 행사 큐레이션 X)
  - 한국 도시(서울) 미운영 또는 비활성
  - 컨퍼런스/해커톤 미포함
  - 개인화·키워드 알림 없음 (도시 단위 구독만)

#### 8) Create With (createwith.com)
- **URL**: https://www.createwith.com/directory/events
- **주요 기능**: UK 기반 AI 빌더 커뮤니티의 글로벌 AI 이벤트 디렉토리. 도시별 페이지(SF/Berlin/NYC 등), 해커톤·밋업·워크숍 통합.
- **가격**: 무료 탐색
- **강점**:
  - "AI agents / vibe coding / no-code" 등 최신 트렌드 키워드로 카테고라이즈
  - 해커톤·워크숍·컨퍼런스를 한 페이지에서 비교
- **약점**:
  - UK/EU 중심, 한국 행사 커버리지 거의 없음
  - 알림·개인화 기능 약함
  - 디렉토리 규모는 Luma보다 작음

#### 9) The Rundown AI / TLDR AI (뉴스레터형)
- **URL**: https://www.therundown.ai , https://tldr.tech/ai
- **주요 기능**: 일간 AI 뉴스레터. 행사·웨비나 광고 섹션을 일부 포함하나 큐레이션 디렉토리는 아님.
- **가격**: 무료 구독
- **강점**:
  - The Rundown 200만+, TLDR AI 92만 구독자 → 도달력 압도적
  - AI 트렌드 컨텍스트 안에서 행사 노출
- **약점**:
  - 행사가 주력 콘텐츠 아님, 광고/스폰서 슬롯 위주
  - 검색·필터·개인화 알림 부재
  - 한국 행사 거의 다루지 않음
  - 마감 임박/날짜 기반 푸시 불가

### C. 알림/메타·일반 이벤트 플랫폼

#### 10) Eventbrite
- **URL**: https://www.eventbrite.com
- **주요 기능**: 글로벌 이벤트 티켓 플랫폼. 검색·카테고리·저장·이메일 알림 제공.
- **가격**: 참가자 무료, 호스트 티켓 수수료
- **강점**:
  - 글로벌 데이터·결제·알림 기능 성숙
  - 키워드 저장 검색·알림 가능
- **약점**:
  - 개발자/AI 행사 비중 낮고, 일반 행사 노이즈 비율 매우 높음
  - 한국 행사 빈약
  - 다중 소스 통합·중복제거 없음

#### 11) Meetup
- **URL**: https://www.meetup.com
- **주요 기능**: 관심사 기반 정기 모임 플랫폼. 그룹 가입 시 이메일 알림.
- **가격**: 호스트 유료(그룹 운영), 참가자 무료
- **강점**:
  - "AI/ML" 카테고리 그룹 풍부 (글로벌)
  - 정기 모임 데이터에 강함
- **약점**:
  - 한국 활성도 낮음 (커뮤니티 대부분 페이스북/Slack/디스코드로 이주)
  - 일회성 컨퍼런스·해커톤 약함
  - 키워드 기반 알림이 그룹 단위에 묶임

---

## 2. 기능 비교표

| 항목 | AIEventRadar (우리) | Dev-Event | Festa | Luma | dev.events | AI Tinkerers | Create With | Eventbrite |
|---|---|---|---|---|---|---|---|---|
| 다중 소스 통합 | O (5+ 소스) | X (직접 큐레이션) | X (자체 행사만) | X (자체 호스팅만) | X (자체 큐레이션) | X (자체 밋업만) | X (자체 큐레이션) | X (자체 호스팅만) |
| 중복 제거 | O (자동) | 부분(수기) | 해당없음 | 해당없음 | 해당없음 | 해당없음 | 해당없음 | 해당없음 |
| AI 키워드 필터 | O (LLM/RAG/Agent 등 세분) | X | X (카테고리만) | △ (AI 페이지) | O (AI 카테고리) | O (AI 전용) | O (AI 전용) | X |
| 개인화 알림 | O (키워드+마감 임박) | X (Issue Watch만) | △ (호스트 팔로우) | △ (캘린더 구독) | X | △ (도시 단위) | △ | △ (저장 검색) |
| 한국 행사 커버리지 | O (Festa/이벤터스/Dev-Event) | O | O (자체 데이터) | X | X | X | X | X |
| 글로벌 AI 행사 커버리지 | O (Luma/Devpost/dev.events) | X | X | O | O | O | O | △ |
| 무료 이용 | O | O | O (참가자) | O (참가자) | O | O | O (탐색) | O (참가자) |
| 한국어 UX | O | O (README 한글) | O | △ | X | X | X | △ |
| 마감 임박 푸시 | O | X | X | X | X | X | X | △ |
| 해커톤 통합 | O (Devpost) | △ | X | △ | △ | X | O | △ |

(O = 강함/지원, △ = 부분 지원, X = 없음/약함)

---

## 3. 차별화 전략

### 우리만의 강점

1. **다중 소스 통합 + 자동 중복제거**
   - 단일 경쟁사로는 충족 불가능한 가치. Dev-Event(큐레이션)+Festa(국내)+Luma(글로벌)+Devpost(해커톤)+dev.events(컨퍼런스)를 한 뷰에서 본다.
   - 같은 행사가 Festa·Luma 양쪽에 올라온 경우 자동 dedup.

2. **AI 특화 키워드 필터링 (LLM/RAG/Agent/Vision 등)**
   - 경쟁사는 "AI" 단일 카테고리 또는 큐레이션 태그 수준. 우리는 세부 토픽(RAG, Agent, Multimodal, Fine-tuning 등) 단위 필터·알림.

3. **개인화 + 마감 임박 알림**
   - 사용자 관심 키워드/지역/온오프 기반으로 새 행사 푸시 + D-3 / D-1 마감 알림.
   - Luma·Dev-Event 모두 "마감 임박" 푸시 없음.

4. **한국 사용자 최우선 UX**
   - 한국어 UI, 한국 행사 우선 표시, KST 기준 표시, 카카오·디스코드·Slack 알림 채널.
   - Luma·AI Tinkerers·Create With 모두 한국 약점.

5. **AI 분야 단일 도메인 집중**
   - Dev-Event(개발자 전반), 온오프믹스(종합), Eventbrite(일반) 대비 AI에 특화하여 신호 대 노이즈 비율 우위.

### 포지셔닝 한 줄

> **"AI 행사 한 곳에서, 놓치지 않게"** — 한국 AI 빌더를 위한 다중 소스 통합 + 개인화 알림 레이더.

---

## 4. 시장 진입 리스크

### 가장 위협적인 경쟁자: Luma

- **이유**:
  - 글로벌 AI 커뮤니티의 사실상 표준 호스팅 플랫폼이며, 자체 디스커버리·캘린더 구독 기능을 빠르게 강화 중
  - ChatGPT 플러그인까지 출시하여 검색·발견 영역에서 우리와 직접 충돌 가능
  - 한국 시장에 본격 진입 + 한국어화 + 키워드 알림 추가 시 우리의 차별화가 약화
- **대응**:
  - "Luma만으로 못 잡는 한국 행사(Festa·Dev-Event·이벤터스)"를 핵심 가치로 명시
  - Luma 자체를 데이터 소스 중 하나로 포섭해 "Luma + α" 포지션 유지

### 차순위 위협: Dev-Event

- **이유**:
  - 한국 개발자 행사 큐레이션의 인지도·신뢰 1위. 우리가 한국 시장에서 처음 부딪힐 비교 대상
  - 무료 + 오픈소스 + 수년간 누적된 커뮤니티 자산
- **대응**:
  - Dev-Event를 데이터 소스로 활용(파싱)하고, 그 위에 다른 소스 통합·AI 필터·개인화 알림으로 가치 차별화
  - "Dev-Event가 보여주는 것 + Festa/Luma/Devpost 통합 + 키워드 알림"

### 기타 리스크

- **데이터 소스 의존성**: Festa 폐업(2025-03) 사례처럼 외부 플랫폼 종료 위험. 다소스 전략 자체가 리스크 헷지가 되나, 소스 모니터링·스크래퍼 유지보수 부담은 상수.
- **스크래핑 ToS / 차단**: Luma·이벤터스 등은 비공식 API/스크래핑 시 차단 위험. 공식 RSS/Webhook/파트너십 전략 필요.
- **대형 뉴스레터(Rundown/TLDR) 행사 섹션 확장**: 도달력 차원에서 위협 가능하나, 검색/필터 기능 부재로 직접 경쟁 가능성은 낮음.
- **개인 정보·알림 피로도**: 알림 정밀도(false positive)가 낮으면 즉시 이탈. 키워드 정규화·랭킹 알고리즘 품질이 핵심 해자.

---

## 5. 참고 링크

- [Dev-Event (brave-people/Dev-Event)](https://github.com/brave-people/Dev-Event)
- [Dev-Event-Subscribe Issues](https://github.com/brave-people/Dev-Event-Subscribe)
- [Festa (festa.io)](https://festa.io)
- [디스콰이엇 (disquiet.io)](https://disquiet.io)
- [온오프믹스 (onoffmix.com)](https://onoffmix.com)
- [Luma Discover](https://luma.com/discover)
- [Luma AI Events](https://luma.com/ai)
- [dev.events](https://dev.events)
- [dev.events AI Category](https://dev.events/ai)
- [AI Tinkerers](https://aitinkerers.org)
- [AI Tinkerers Events](https://aitinkerers.org/events)
- [Create With Events Directory](https://www.createwith.com/directory/events)
- [The Rundown AI](https://www.therundown.ai)
- [TLDR AI](https://tldr.tech/ai)
- [Eventbrite](https://www.eventbrite.com)
- [Meetup](https://www.meetup.com)
- [Devpost AI/ML Hackathons](https://devpost.com/hackathons?themes%5B%5D=Machine+Learning%2FAI)
- [Conference Alerts](https://conferencealerts.com)
- [confs.tech](https://github.com/tech-conferences/confs.tech)
