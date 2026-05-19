# AIEventRadar API 명세서

> Base URL (Local): `http://localhost:3000/api`
> Base URL (Prod): `https://aieventradar.com/api`

## 공통 규약

### 인증 방식
- **세션 기반 (Supabase Auth)**: 쿠키 `sb-access-token` 자동 첨부
- **Cron 엔드포인트**: `Authorization: Bearer ${CRON_SECRET}` 헤더
- **관리자 엔드포인트**: 세션 유저의 `role = 'admin'` 검증

### 공통 응답 포맷

성공:
```json
{
  "ok": true,
  "data": { ... }
}
```

에러:
```json
{
  "ok": false,
  "error": {
    "code": "BAD_REQUEST",
    "message": "사용자에게 보여줄 메시지",
    "details": { ... }
  }
}
```

### 공통 에러 코드

| Code | HTTP | 의미 |
|------|------|------|
| `UNAUTHORIZED` | 401 | 인증 필요 또는 세션 만료 |
| `FORBIDDEN` | 403 | 권한 부족 (관리자/소유권) |
| `NOT_FOUND` | 404 | 리소스 없음 |
| `BAD_REQUEST` | 400 | 유효성 검증 실패 |
| `CONFLICT` | 409 | 중복 생성 (북마크 이미 존재 등) |
| `RATE_LIMITED` | 429 | rate limit 초과 |
| `INTERNAL_ERROR` | 500 | 서버 내부 에러 |
| `EXTERNAL_ERROR` | 502 | 외부 서비스 실패 (Resend/소스 등) |

---

## 1. 인증 (Auth)

### 1.1 POST `/api/auth/login`
**설명**: Magic Link 이메일 발송 요청. Google OAuth는 별도 `/api/auth/oauth?provider=google` (Supabase 처리).

**인증**: 불필요

**요청**:
```json
{
  "email": "user@example.com",
  "redirect_to": "/me/subscriptions"
}
```

**응답 (200)**:
```json
{
  "ok": true,
  "data": {
    "message": "이메일을 확인해주세요."
  }
}
```

**에러**:
- `BAD_REQUEST`: 이메일 형식 오류
- `RATE_LIMITED`: 동일 이메일 1분 내 재요청

---

## 2. 행사 (Events)

### 2.1 GET `/api/events`
**설명**: 행사 리스트 조회 (검색/필터/페이지네이션).

**인증**: 불필요 (익명 열람 허용)

**쿼리 파라미터**:
| 이름 | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| `q` | string | - | 제목/설명/호스트 부분일치 검색 |
| `sources` | string (csv) | - | `festa,luma,...` |
| `location_types` | string (csv) | - | `online,offline,hybrid` |
| `cities` | string (csv) | - | `서울,판교,Online` |
| `categories` | string (csv) | - | `LLM,Agent,Hackathon` |
| `start_after` | ISO8601 | now | 시작일이 이 이후 |
| `start_before` | ISO8601 | - | 시작일이 이 이전 |
| `is_ai_related` | boolean | `true` | AI 키워드 매칭된 것만 (기본 true) |
| `sort` | enum | `start_at_asc` | `start_at_asc` \| `start_at_desc` \| `collected_at_desc` |
| `page` | int | 1 | 1-based |
| `page_size` | int | 20 | 최대 100 |

**응답 (200)**:
```json
{
  "ok": true,
  "data": {
    "events": [
      {
        "id": "uuid",
        "source": "luma",
        "source_url": "https://lu.ma/abc123",
        "title": "LangChain Korea Meetup #5",
        "description": "RAG 워크샵...",
        "start_at": "2026-06-15T10:00:00Z",
        "end_at": "2026-06-15T13:00:00Z",
        "timezone": "Asia/Seoul",
        "location_type": "offline",
        "location_name": "강남구 역삼동 메리츠타워",
        "city": "서울",
        "country": "KR",
        "host_name": "LangChain Korea",
        "price": "무료",
        "categories": ["LLM", "RAG", "Meetup"],
        "keywords_matched": ["LangChain", "RAG"],
        "thumbnail_url": "https://...",
        "is_ai_related": true,
        "collected_at": "2026-05-19T03:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "page_size": 20,
      "total": 134,
      "total_pages": 7
    }
  }
}
```

**에러**:
- `BAD_REQUEST`: 잘못된 정렬값/페이지 크기 초과

---

### 2.2 GET `/api/events/[id]`
**설명**: 행사 상세 조회.

**인증**: 불필요

**응답 (200)**:
```json
{
  "ok": true,
  "data": {
    "event": {
      "id": "uuid",
      "source": "luma",
      "source_event_id": "abc123",
      "source_url": "https://lu.ma/abc123",
      "title": "...",
      "description": "...",
      "start_at": "...",
      "end_at": "...",
      "timezone": "Asia/Seoul",
      "location_type": "offline",
      "location_name": "...",
      "city": "서울",
      "country": "KR",
      "host_name": "...",
      "price": "무료",
      "categories": ["LLM", "RAG"],
      "keywords_matched": ["LangChain"],
      "thumbnail_url": "https://...",
      "is_ai_related": true,
      "collected_at": "...",
      "updated_at": "...",
      "is_bookmarked": true        // 로그인 시 추가
    }
  }
}
```

**에러**:
- `NOT_FOUND`: 행사 없음

---

## 3. 북마크 (Bookmarks)

### 3.1 POST `/api/bookmarks`
**설명**: 행사 북마크 추가.

**인증**: 필요

**요청**:
```json
{
  "event_id": "uuid",
  "note": "참여 의향 높음 (선택)"
}
```

**응답 (201)**:
```json
{
  "ok": true,
  "data": {
    "bookmark": {
      "id": "uuid",
      "user_id": "uuid",
      "event_id": "uuid",
      "note": "참여 의향 높음",
      "created_at": "2026-05-19T03:00:00Z"
    }
  }
}
```

**에러**:
- `UNAUTHORIZED`
- `NOT_FOUND`: event_id 없음
- `CONFLICT`: 이미 북마크됨

---

### 3.2 DELETE `/api/bookmarks/[id]`
**설명**: 북마크 삭제.

**인증**: 필요 (소유자만)

**응답 (200)**:
```json
{ "ok": true, "data": { "deleted": true } }
```

**에러**:
- `UNAUTHORIZED`
- `FORBIDDEN`: 본인 북마크 아님
- `NOT_FOUND`

---

### 3.3 GET `/api/bookmarks` (보조)
**설명**: 현재 사용자의 북마크 리스트.

**인증**: 필요

**응답 (200)**:
```json
{
  "ok": true,
  "data": {
    "bookmarks": [
      { "id": "...", "event": { /* Event */ }, "note": "...", "created_at": "..." }
    ]
  }
}
```

---

## 4. 구독 (Subscriptions)

### 4.1 GET `/api/subscriptions`
**설명**: 현재 사용자의 구독 규칙 리스트.

**인증**: 필요

**응답 (200)**:
```json
{
  "ok": true,
  "data": {
    "subscriptions": [
      {
        "id": "uuid",
        "name": "내 RAG/Agent 구독",
        "keywords": ["RAG", "Agent", "LangChain"],
        "sources": ["luma", "festa"],
        "location_types": ["offline", "online"],
        "cities": ["서울", "판교"],
        "notify_on_new": true,
        "notify_on_deadline": true,
        "is_active": true,
        "created_at": "2026-05-19T03:00:00Z"
      }
    ]
  }
}
```

---

### 4.2 POST `/api/subscriptions`
**설명**: 구독 규칙 생성.

**인증**: 필요

**요청**:
```json
{
  "name": "내 RAG/Agent 구독",
  "keywords": ["RAG", "Agent"],
  "sources": null,
  "location_types": ["offline"],
  "cities": ["서울"],
  "notify_on_new": true,
  "notify_on_deadline": true
}
```

**응답 (201)**:
```json
{
  "ok": true,
  "data": { "subscription": { /* 위와 동일 형태 */ } }
}
```

**에러**:
- `BAD_REQUEST`: keywords 0개 또는 name 누락
- `RATE_LIMITED`: 무료 티어 구독 2개 제한 초과 (Phase 2)

---

### 4.3 PATCH `/api/subscriptions/[id]`
**설명**: 구독 규칙 부분 수정.

**인증**: 필요 (소유자만)

**요청 (부분)**:
```json
{
  "is_active": false,
  "keywords": ["RAG", "Agent", "MLOps"]
}
```

**응답 (200)**: `data.subscription` 갱신본 반환

**에러**: `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`

---

### 4.4 DELETE `/api/subscriptions/[id]`
**설명**: 구독 규칙 삭제.

**인증**: 필요 (소유자만)

**응답 (200)**:
```json
{ "ok": true, "data": { "deleted": true } }
```

---

## 5. Cron (스케줄 트리거)

### 5.1 POST `/api/cron/collect`
**설명**: 5개 소스 어댑터 일괄 실행 → 정규화 → dedupe → classify → DB 저장.

**인증**: `Authorization: Bearer ${CRON_SECRET}`

**스케줄**: `0 */6 * * *` (6시간마다)

**요청 (옵션)**:
```json
{
  "sources": ["festa", "luma"]    // 지정 시 해당 소스만, 없으면 전체
}
```

**응답 (200)**:
```json
{
  "ok": true,
  "data": {
    "runs": [
      {
        "source": "festa",
        "status": "success",
        "events_collected": 32,
        "events_new": 4,
        "events_updated": 28,
        "started_at": "2026-05-19T03:00:00Z",
        "finished_at": "2026-05-19T03:01:12Z"
      },
      {
        "source": "luma",
        "status": "failed",
        "error_message": "Timeout after 60s"
      }
    ]
  }
}
```

**에러**:
- `UNAUTHORIZED`: CRON_SECRET 불일치
- `INTERNAL_ERROR`: 전 소스 실패

---

### 5.2 POST `/api/cron/notify`
**설명**: 활성 구독 규칙 × 최근 수집 이벤트 매칭 → digest_frequency별 발송.

**인증**: `Authorization: Bearer ${CRON_SECRET}`

**스케줄**: `0 * * * *` (매시간) - 내부에서 digest_frequency 검사로 분기
- realtime: 매시간 즉시 발송
- daily: 매일 09:00 KST
- weekly: 매주 월 09:00 KST
- deadline D-3: 매일 09:00 KST에 startat 72시간 전 행사 발송

**요청**:
```json
{
  "mode": "auto",              // "auto" | "realtime" | "daily" | "weekly" | "deadline"
  "dry_run": false
}
```

**응답 (200)**:
```json
{
  "ok": true,
  "data": {
    "matched_subscriptions": 47,
    "emails_sent": 32,
    "emails_failed": 1,
    "errors": [
      { "user_id": "uuid", "error": "Resend 503" }
    ]
  }
}
```

**에러**:
- `UNAUTHORIZED`
- `EXTERNAL_ERROR`: Resend 전체 실패

---

## 6. 관리자 (Admin)

### 6.1 GET `/api/admin/source-runs`
**설명**: 최근 수집 로그 조회 (관리자 대시보드용).

**인증**: 필요 + `users.role = 'admin'`

**쿼리 파라미터**:
| 이름 | 타입 | 기본 |
|------|------|------|
| `source` | string | - |
| `status` | enum | - |
| `limit` | int | 50 (max 200) |

**응답 (200)**:
```json
{
  "ok": true,
  "data": {
    "runs": [
      {
        "id": "uuid",
        "source": "festa",
        "started_at": "2026-05-19T03:00:00Z",
        "finished_at": "2026-05-19T03:01:12Z",
        "status": "success",
        "events_collected": 32,
        "events_new": 4,
        "events_updated": 28,
        "error_message": null
      }
    ],
    "stats_24h": {
      "total_runs": 20,
      "successful": 18,
      "failed": 2,
      "total_new_events": 47
    }
  }
}
```

**에러**: `UNAUTHORIZED`, `FORBIDDEN`

---

### 6.2 POST `/api/admin/source-runs/retry` (보조)
**설명**: 특정 소스 수동 재실행 트리거.

**인증**: 관리자

**요청**:
```json
{ "source": "festa" }
```

**응답 (202)**:
```json
{ "ok": true, "data": { "enqueued": true, "source": "festa" } }
```

---

## 7. 유효성/Rate Limit 요약

| 엔드포인트 | 제한 |
|----------|------|
| `POST /auth/login` | 1분 내 동일 이메일 1회 |
| `POST /bookmarks` | 분당 30회/유저 |
| `POST /subscriptions` | 무료 티어 2개, Phase 2 도입 |
| `POST /cron/*` | CRON_SECRET 필수 |

---

## 8. 페이지네이션 / 정렬 컨벤션
- 기본 1-based pagination (`page`, `page_size`)
- 최대 `page_size`: 100
- 응답에 항상 `pagination.total`, `pagination.total_pages` 포함
- 정렬은 `sort` 쿼리, ASC/DESC suffix
