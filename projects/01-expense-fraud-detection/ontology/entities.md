# Entities Definition

온톨로지의 핵심 엔터티를 정의합니다. 각 엔터티는 비즈니스 도메인의 중요한 개념을 나타내며, 명확한 경계와 책임을 가집니다.

---

## 1. Transaction (거래)

**정의:** 법인카드를 통한 개별 금융 거래 기록

**비즈니스 의미:** 직원이 법인카드로 상품/서비스를 구매한 단일 이벤트. 승인과 매입 단계를 모두 포함.

### 속성

| 속성명 | 타입 | 필수 | 설명 | 제약조건 |
|--------|------|------|------|----------|
| `id` | UUID | ✓ | 거래 고유 식별자 | Primary Key |
| `amount` | Decimal(15,2) | ✓ | 거래 금액 | > 0 |
| `currency` | String(3) | ✓ | 통화 코드 | ISO 4217 (예: KRW, USD) |
| `transacted_at` | DateTime | ✓ | 거래 일시 | ISO 8601, UTC |
| `approval_code` | String(20) | ✓ | 카드사 승인 코드 | - |
| `status` | Enum | ✓ | 거래 상태 | APPROVED, SETTLED, CANCELLED, DISPUTED |
| `transaction_type` | Enum | ✓ | 거래 유형 | PURCHASE, REFUND, CHARGEBACK |
| `merchant_id` | UUID | ✓ | 가맹점 ID | FK → Merchant |
| `card_id` | UUID | ✓ | 카드 ID | FK → Card |
| `employee_id` | UUID | ✓ | 직원 ID | FK → Employee |
| `location` | GeoJSON | ○ | 거래 발생 위치 | Point(longitude, latitude) |
| `is_online` | Boolean | ✓ | 온라인 거래 여부 | Default: false |
| `vat_amount` | Decimal(15,2) | ○ | 부가세 금액 | ≥ 0 |
| `invoice_type` | Enum | ○ | 전표 유형 | TAX_INVOICE, RECEIPT, CREDIT_CARD_SLIP |
| `risk_score` | Integer | ○ | 리스크 점수 (계산됨) | 0-100 |
| `policy_evaluation_result` | JSON | ○ | 정책 평가 결과 | {passed: bool, flags: [...]} |
| `created_at` | DateTime | ✓ | 레코드 생성 시각 | Auto-generated |
| `updated_at` | DateTime | ✓ | 레코드 수정 시각 | Auto-updated |

### 비즈니스 규칙

1. **금액 검증**: `amount`는 반드시 양수. `vat_amount`는 `amount`의 10% 이하 (한국 부가세율)
2. **시간 정합성**: `transacted_at`은 미래 시점일 수 없음
3. **상태 전이**: APPROVED → SETTLED → (CANCELLED | DISPUTED)만 허용
4. **온라인/위치**: `is_online = true`인 경우 `location`은 가맹점 등록 주소 사용

### 라이프사이클

```
[승인 요청] → APPROVED → [매입 처리] → SETTLED → [정산 완료]
                ↓                          ↓
            CANCELLED                  DISPUTED
```

---

## 2. Merchant (가맹점)

**정의:** 법인카드 거래를 수행한 상점 또는 서비스 제공자

**비즈니스 의미:** 카드 네트워크에 등록된 사업자. MCC 코드를 통해 업종이 분류됨.

### 속성

| 속성명 | 타입 | 필수 | 설명 | 제약조건 |
|--------|------|------|------|----------|
| `id` | UUID | ✓ | 가맹점 고유 식별자 | Primary Key |
| `name` | String(200) | ✓ | 가맹점 상호 | - |
| `legal_name` | String(200) | ○ | 법적 등록명 | - |
| `mcc_id` | String(4) | ✓ | MCC 코드 | FK → MCC, 4자리 숫자 |
| `address` | Text | ○ | 주소 | - |
| `city` | String(100) | ○ | 도시 | - |
| `country` | String(2) | ✓ | 국가 코드 | ISO 3166-1 alpha-2 |
| `location` | GeoJSON | ○ | 좌표 | Point(longitude, latitude) |
| `is_online` | Boolean | ✓ | 온라인 전용 여부 | Default: false |
| `business_number` | String(50) | ○ | 사업자등록번호 | 한국: 10자리 |
| `trust_score` | Integer | ○ | 신뢰도 점수 | 0-100, 초기값: 50 |
| `is_whitelisted` | Boolean | ✓ | 화이트리스트 여부 | Default: false |
| `whitelist_reason` | Text | ○ | 화이트리스트 사유 | `is_whitelisted = true`일 때 필수 |
| `created_at` | DateTime | ✓ | 레코드 생성 시각 | Auto-generated |
| `updated_at` | DateTime | ✓ | 레코드 수정 시각 | Auto-updated |

### 비즈니스 규칙

1. **MCC 필수**: 모든 가맹점은 반드시 유효한 MCC 코드를 가져야 함
2. **신뢰도 갱신**: 거래 패턴과 증빙 제출률에 따라 주기적으로 `trust_score` 재계산
3. **화이트리스트**: 회사 지정 호텔, 출장 대행사 등은 `is_whitelisted = true`로 설정
4. **국가별 검증**: 한국 가맹점은 `business_number` 필수 (국세청 API 검증)

---

## 3. MCC (Merchant Category Code)

**정의:** 가맹점 업종을 분류하는 4자리 표준 코드

**비즈니스 의미:** Visa/Mastercard가 정의한 업종 분류 체계. 리스크 판단의 핵심 기준.

### 속성

| 속성명 | 타입 | 필수 | 설명 | 제약조건 |
|--------|------|------|------|----------|
| `code` | String(4) | ✓ | MCC 코드 | Primary Key, 4자리 숫자 |
| `category` | String(100) | ✓ | 업종 분류 | 예: "Hotels and Motels" |
| `description` | Text | ✓ | 상세 설명 | - |
| `risk_group` | Enum | ✓ | 리스크 그룹 | BLACK, GRAY, NORMAL, LOW_RISK |
| `risk_level` | Integer | ✓ | 리스크 레벨 | 0-100 |
| `is_cash_equivalent` | Boolean | ✓ | 현금성 여부 | Default: false |
| `is_gambling` | Boolean | ✓ | 도박 여부 | Default: false |
| `is_entertainment` | Boolean | ✓ | 유흥 여부 | Default: false |
| `requires_justification` | Boolean | ✓ | 사유 필수 여부 | Default: false |
| `network_source` | Enum | ✓ | 출처 네트워크 | VISA, MASTERCARD, AMEX |
| `network_doc_url` | URL | ○ | 네트워크 문서 링크 | 공식 문헌 URL |
| `effective_date` | Date | ✓ | 적용 시작일 | - |
| `created_at` | DateTime | ✓ | 레코드 생성 시각 | Auto-generated |
| `updated_at` | DateTime | ✓ | 레코드 수정 시각 | Auto-updated |

### 비즈니스 규칙

1. **리스크 그룹 매핑**:
   - `BLACK`: 7995 (도박), 6010/6011 (현금), 6051 (준현금)
   - `GRAY`: 7273 (유흥), 5813 (주점), 5921 (주류 판매) 등
   - `NORMAL`: 대부분의 일반 업종
   - `LOW_RISK`: 5812 (음식점), 5411 (식료품점) 등

2. **자동 플래깅**: `risk_group = BLACK`인 MCC는 자동으로 거래 차단 또는 보류
3. **문서화 필수**: 모든 MCC는 `network_doc_url`을 통해 근거 문서와 연결

### 예시 데이터

```json
{
  "code": "7995",
  "category": "Betting/Casino Gambling",
  "description": "Gambling transactions including online betting, casinos, lotteries",
  "risk_group": "BLACK",
  "risk_level": 100,
  "is_cash_equivalent": false,
  "is_gambling": true,
  "is_entertainment": false,
  "requires_justification": true,
  "network_source": "VISA",
  "network_doc_url": "https://usa.visa.com/dam/VCOM/download/merchants/visa-merchant-data-standards-manual.pdf",
  "effective_date": "2020-01-01"
}
```

---

## 4. Employee (직원)

**정의:** 법인카드 사용 권한을 가진 회사 구성원

**비즈니스 의미:** 카드 사용자. 부서, 직급, 근무 패턴이 정책 평가의 맥락 정보로 사용됨.

### 속성

| 속성명 | 타입 | 필수 | 설명 | 제약조건 |
|--------|------|------|------|----------|
| `id` | UUID | ✓ | 직원 고유 식별자 | Primary Key |
| `employee_number` | String(20) | ✓ | 사번 | Unique |
| `name` | String(100) | ✓ | 이름 | - |
| `email` | String(100) | ✓ | 이메일 | Unique, 유효한 이메일 형식 |
| `department` | String(100) | ✓ | 부서 | 예: "영업팀", "개발팀" |
| `position` | String(50) | ✓ | 직급 | 예: "부장", "대리" |
| `role` | Enum | ✓ | 직무 | SALES, ENGINEERING, MARKETING, HR, FINANCE, EXECUTIVE |
| `office_location` | GeoJSON | ○ | 근무지 좌표 | Point(longitude, latitude) |
| `office_address` | String(200) | ○ | 근무지 주소 | - |
| `working_hours` | JSON | ○ | 근무시간 | {start: "09:00", end: "18:00"} |
| `spending_limit_daily` | Decimal(15,2) | ○ | 일일 한도 | ≥ 0 |
| `spending_limit_monthly` | Decimal(15,2) | ○ | 월 한도 | ≥ spending_limit_daily |
| `is_frequent_traveler` | Boolean | ✓ | 빈번 출장 여부 | Default: false |
| `travel_policy_tier` | Enum | ✓ | 출장 정책 등급 | STANDARD, PREMIUM, EXECUTIVE |
| `approval_authority` | Boolean | ✓ | 승인 권한 여부 | Default: false |
| `is_active` | Boolean | ✓ | 재직 여부 | Default: true |
| `hired_at` | Date | ✓ | 입사일 | - |
| `created_at` | DateTime | ✓ | 레코드 생성 시각 | Auto-generated |
| `updated_at` | DateTime | ✓ | 레코드 수정 시각 | Auto-updated |

### 비즈니스 규칙

1. **한도 검증**: `spending_limit_monthly ≥ spending_limit_daily * 20`
2. **출장 면제**: `is_frequent_traveler = true`인 직원은 위치 불일치 패턴에서 가중치 감소
3. **권한 계층**: `approval_authority = true`인 직원만 타인의 거래를 승인 가능
4. **퇴사자 처리**: `is_active = false`로 변경 시 모든 카드 즉시 비활성화

---

## 5. Policy (정책)

**정의:** 법인카드 사용을 제어하는 규칙의 집합

**비즈니스 의미:** 블랙/그레이리스트, 시간대/지역 제약, 증빙 요건 등을 포함하는 정책 문서.

### 속성

| 속성명 | 타입 | 필수 | 설명 | 제약조건 |
|--------|------|------|------|----------|
| `id` | UUID | ✓ | 정책 고유 식별자 | Primary Key |
| `name` | String(100) | ✓ | 정책 이름 | 예: "Default Corporate Policy v2.0" |
| `version` | String(20) | ✓ | 버전 | Semantic versioning (예: 2.1.0) |
| `description` | Text | ○ | 정책 설명 | - |
| `blacklist_mccs` | Array[String] | ✓ | 금지 MCC 목록 | ["7995", "6010", "6011", "6051"] |
| `graylist_mccs` | Array[String] | ✓ | 심층검토 MCC 목록 | ["7273", "5813"] |
| `whitelist_merchant_ids` | Array[UUID] | ○ | 화이트리스트 가맹점 | - |
| `time_restrictions` | JSON | ○ | 시간대 제약 | {allowed_hours: [9, 18], blocked_days: ["SAT", "SUN"]} |
| `location_radius_km` | Integer | ○ | 허용 반경 (km) | Default: 50 |
| `receipt_required_threshold` | Decimal(15,2) | ✓ | 증빙 필수 금액 | Default: 100000 (10만원) |
| `receipt_deadline_hours` | Integer | ✓ | 증빙 제출 기한 (시간) | Default: 72 |
| `approval_rules` | JSON | ✓ | 승인 규칙 | {pre_approval: [...], post_approval: [...]} |
| `risk_threshold` | Integer | ✓ | 리스크 임계치 | 0-100, Default: 50 |
| `effective_from` | Date | ✓ | 시행일 | - |
| `effective_until` | Date | ○ | 종료일 | null이면 무기한 |
| `is_active` | Boolean | ✓ | 활성 여부 | Default: true |
| `created_by` | UUID | ✓ | 생성자 (직원 ID) | FK → Employee |
| `created_at` | DateTime | ✓ | 레코드 생성 시각 | Auto-generated |
| `updated_at` | DateTime | ✓ | 레코드 수정 시각 | Auto-updated |

### 비즈니스 규칙

1. **버전 관리**: 동일 시점에 `is_active = true`인 정책은 1개만 존재
2. **시행일 검증**: `effective_from ≤ effective_until` (종료일이 있는 경우)
3. **MCC 중복 금지**: `blacklist_mccs`와 `graylist_mccs`는 중복 불가
4. **감사 추적**: 정책 변경 시 이전 버전은 `is_active = false`로 보관 (삭제 금지)

---

## 6. Receipt (증빙)

**정의:** 거래에 첨부된 영수증 또는 세금계산서

**비즈니스 의미:** 거래의 적법성을 입증하는 문서. OCR로 추출된 정보와 원본 파일을 포함.

### 속성

| 속성명 | 타입 | 필수 | 설명 | 제약조건 |
|--------|------|------|------|----------|
| `id` | UUID | ✓ | 증빙 고유 식별자 | Primary Key |
| `transaction_id` | UUID | ✓ | 연결된 거래 ID | FK → Transaction |
| `type` | Enum | ✓ | 증빙 유형 | TAX_INVOICE, RECEIPT, CREDIT_CARD_SLIP |
| `file_url` | URL | ✓ | 원본 파일 경로 | S3 등의 스토리지 URL |
| `file_format` | String(10) | ✓ | 파일 형식 | PDF, JPEG, PNG |
| `ocr_status` | Enum | ✓ | OCR 처리 상태 | PENDING, SUCCESS, FAILED |
| `ocr_result` | JSON | ○ | OCR 추출 데이터 | {merchant_name, amount, vat, ...} |
| `supplier_business_number` | String(50) | ○ | 공급자 사업자번호 | - |
| `supplier_name` | String(200) | ○ | 공급자 상호 | - |
| `issued_at` | Date | ○ | 발행일 | - |
| `total_amount` | Decimal(15,2) | ○ | 총 금액 | - |
| `vat_amount` | Decimal(15,2) | ○ | 부가세 | - |
| `is_tax_deductible` | Boolean | ○ | 세액 공제 가능 여부 | Default: true |
| `verification_status` | Enum | ✓ | 검증 상태 | PENDING, VERIFIED, REJECTED |
| `verification_notes` | Text | ○ | 검증 메모 | - |
| `submitted_at` | DateTime | ✓ | 제출 일시 | - |
| `submitted_by` | UUID | ✓ | 제출자 (직원 ID) | FK → Employee |
| `created_at` | DateTime | ✓ | 레코드 생성 시각 | Auto-generated |
| `updated_at` | DateTime | ✓ | 레코드 수정 시각 | Auto-updated |

### 비즈니스 규칙

1. **금액 일치 검증**: `total_amount`와 `Transaction.amount`의 차이가 ±5% 이내여야 함
2. **사업자 검증**: `supplier_business_number`가 있는 경우 국세청 API로 유효성 확인
3. **제출 기한**: `submitted_at - Transaction.transacted_at ≤ Policy.receipt_deadline_hours`
4. **부가세 계산**: `vat_amount`는 일반적으로 `total_amount`의 10% (한국 기준)

---

## 7. Trip/Event (업무 맥락)

**정의:** 법인카드 사용의 업무 맥락을 나타내는 출장 또는 회의 일정

**비즈니스 의미:** 캘린더 연동을 통해 거래가 업무 관련인지 판단하는 근거.

### 속성

| 속성명 | 타입 | 필수 | 설명 | 제약조건 |
|--------|------|------|------|----------|
| `id` | UUID | ✓ | 이벤트 고유 식별자 | Primary Key |
| `type` | Enum | ✓ | 이벤트 유형 | BUSINESS_TRIP, MEETING, CONFERENCE, TRAINING |
| `title` | String(200) | ✓ | 제목 | - |
| `description` | Text | ○ | 설명 | - |
| `start_at` | DateTime | ✓ | 시작 일시 | - |
| `end_at` | DateTime | ✓ | 종료 일시 | - |
| `location` | GeoJSON | ○ | 목적지 좌표 | Point(longitude, latitude) |
| `location_address` | String(200) | ○ | 목적지 주소 | - |
| `destination_city` | String(100) | ○ | 목적지 도시 | - |
| `destination_country` | String(2) | ○ | 목적지 국가 | ISO 3166-1 alpha-2 |
| `organizer_id` | UUID | ✓ | 주최자 (직원 ID) | FK → Employee |
| `attendees` | Array[UUID] | ○ | 참석자 목록 | FK → Employee[] |
| `estimated_budget` | Decimal(15,2) | ○ | 예상 예산 | ≥ 0 |
| `approval_status` | Enum | ✓ | 승인 상태 | PENDING, APPROVED, REJECTED |
| `approved_by` | UUID | ○ | 승인자 (직원 ID) | FK → Employee |
| `calendar_source` | Enum | ○ | 캘린더 출처 | GOOGLE, OUTLOOK, MANUAL |
| `external_event_id` | String(100) | ○ | 외부 이벤트 ID | Google Calendar ID 등 |
| `created_at` | DateTime | ✓ | 레코드 생성 시각 | Auto-generated |
| `updated_at` | DateTime | ✓ | 레코드 수정 시각 | Auto-updated |

### 비즈니스 규칙

1. **시간 검증**: `end_at > start_at`
2. **지역 매칭**: 거래 위치가 `location` 반경 50km 이내면 업무 관련으로 간주
3. **예산 추적**: 연결된 거래들의 합계가 `estimated_budget` 초과 시 경고
4. **캘린더 동기화**: `calendar_source ≠ MANUAL`인 경우 주기적으로 외부 캘린더와 동기화

---

## 8. Approval (승인)

**정의:** 거래에 대한 사전/사후 승인 기록

**비즈니스 의미:** 누가, 언제, 왜 거래를 승인 또는 거부했는지 추적.

### 속성

| 속성명 | 타입 | 필수 | 설명 | 제약조건 |
|--------|------|------|------|----------|
| `id` | UUID | ✓ | 승인 고유 식별자 | Primary Key |
| `transaction_id` | UUID | ✓ | 거래 ID | FK → Transaction |
| `approval_type` | Enum | ✓ | 승인 유형 | PRE_APPROVAL, POST_APPROVAL |
| `status` | Enum | ✓ | 승인 상태 | PENDING, APPROVED, REJECTED |
| `approver_id` | UUID | ✓ | 승인자 (직원 ID) | FK → Employee |
| `requested_by` | UUID | ✓ | 요청자 (직원 ID) | FK → Employee |
| `requested_at` | DateTime | ✓ | 요청 일시 | - |
| `responded_at` | DateTime | ○ | 응답 일시 | - |
| `reason` | Text | ○ | 승인/거부 사유 | - |
| `comments` | Text | ○ | 코멘트 | - |
| `required_by_policy` | Boolean | ✓ | 정책상 필수 여부 | - |
| `audit_log` | JSON | ✓ | 감사 로그 | {ip, user_agent, timestamp, ...} |
| `created_at` | DateTime | ✓ | 레코드 생성 시각 | Auto-generated |
| `updated_at` | DateTime | ✓ | 레코드 수정 시각 | Auto-updated |

### 비즈니스 규칙

1. **권한 검증**: `approver_id`는 반드시 `Employee.approval_authority = true`
2. **응답 시간**: `responded_at`은 `requested_at` 이후여야 함
3. **사유 필수**: `status = REJECTED`인 경우 `reason` 필수
4. **감사 추적**: 모든 승인 행위는 `audit_log`에 IP, User-Agent 등 기록

---

## 9. Case (위반 사건)

**정의:** 정책 위반이 의심되거나 확정된 거래 사건

**비즈니스 의미:** HITL 검토 대상. 위반 유형, 법적 근거, 조치 사항을 포함.

### 속성

| 속성명 | 타입 | 필수 | 설명 | 제약조건 |
|--------|------|------|------|----------|
| `id` | UUID | ✓ | 사건 고유 식별자 | Primary Key |
| `transaction_id` | UUID | ✓ | 거래 ID | FK → Transaction |
| `case_type` | Enum | ✓ | 사건 유형 | BLACKLIST_MCC, HIGH_RISK_SCORE, RECEIPT_MISSING, LOCATION_MISMATCH, SPLIT_PAYMENT |
| `severity` | Enum | ✓ | 심각도 | LOW, MEDIUM, HIGH, CRITICAL |
| `status` | Enum | ✓ | 처리 상태 | OPEN, UNDER_REVIEW, RESOLVED, CLOSED |
| `detected_at` | DateTime | ✓ | 탐지 일시 | Auto-generated |
| `assigned_to` | UUID | ○ | 담당자 (직원 ID) | FK → Employee |
| `resolution` | Enum | ○ | 처리 결과 | APPROVED, REJECTED, RECOVERED, WARNING_ISSUED |
| `resolution_notes` | Text | ○ | 처리 메모 | - |
| `amount_recovered` | Decimal(15,2) | ○ | 회수 금액 | ≥ 0 |
| `policy_violated` | UUID | ○ | 위반된 정책 ID | FK → Policy |
| `tax_rule_cited` | UUID | ○ | 인용된 세법 ID | FK → TaxRule |
| `evidence` | JSON | ○ | 증거 자료 | {receipt_ids: [], emails: [], ...} |
| `is_repeat_offense` | Boolean | ✓ | 재범 여부 | Default: false |
| `previous_case_ids` | Array[UUID] | ○ | 이전 사건 ID 목록 | FK → Case[] |
| `resolved_at` | DateTime | ○ | 해결 일시 | - |
| `resolved_by` | UUID | ○ | 해결자 (직원 ID) | FK → Employee |
| `created_at` | DateTime | ✓ | 레코드 생성 시각 | Auto-generated |
| `updated_at` | DateTime | ✓ | 레코드 수정 시각 | Auto-updated |

### 비즈니스 규칙

1. **심각도 자동 설정**:
   - `BLACK` MCC → `CRITICAL`
   - 리스크 스코어 70↑ → `HIGH`
   - 리스크 스코어 50-69 → `MEDIUM`

2. **재범 탐지**: 동일 직원의 3개월 내 2회 이상 위반 시 `is_repeat_offense = true`
3. **강제 필드**: `resolution = RECOVERED`인 경우 `amount_recovered` 필수
4. **감사 필수**: 모든 Case는 생성/변경 시 감사 로그 자동 기록

---

## 10. TaxRule (세법 룰)

**정의:** 한국 세법상 손금불산입·매입세액 불공제 관련 조항

**비즈니스 의미:** 거래가 세법상 문제가 되는지 자동 태깅하는 근거.

### 속성

| 속성명 | 타입 | 필수 | 설명 | 제약조건 |
|--------|------|------|------|----------|
| `id` | UUID | ✓ | 세법 룰 고유 식별자 | Primary Key |
| `law_name` | String(100) | ✓ | 법령 이름 | 예: "법인세법" |
| `article_number` | String(50) | ✓ | 조문 번호 | 예: "제27조" |
| `clause` | String(50) | ○ | 항/호 | 예: "제1항 제1호" |
| `title` | String(200) | ✓ | 조문 제목 | 예: "업무무관 비용 손금불산입" |
| `summary` | Text | ✓ | 요약 | - |
| `full_text` | Text | ○ | 전문 | - |
| `category` | Enum | ✓ | 카테고리 | NON_DEDUCTIBLE_EXPENSE, VAT_EXCLUSION, ENTERTAINMENT_LIMIT |
| `effective_from` | Date | ✓ | 시행일 | - |
| `effective_until` | Date | ○ | 종료일 | null이면 현행 |
| `law_url` | URL | ✓ | 법령 링크 | law.go.kr 등 |
| `related_mcc_codes` | Array[String] | ○ | 연관 MCC 목록 | - |
| `auto_tag_conditions` | JSON | ✓ | 자동 태깅 조건 | {mcc_in: [...], amount_gt: 0, ...} |
| `created_at` | DateTime | ✓ | 레코드 생성 시각 | Auto-generated |
| `updated_at` | DateTime | ✓ | 레코드 수정 시각 | Auto-updated |

### 비즈니스 규칙

1. **조문 링크 필수**: `law_url`은 반드시 law.go.kr 또는 공식 법령 사이트
2. **시행일 검증**: `effective_from ≤ effective_until` (종료일이 있는 경우)
3. **자동 태깅**: `auto_tag_conditions`에 명시된 조건 만족 시 `Transaction`에 자동 태그
4. **버전 관리**: 법령 개정 시 새 레코드 생성 (이전 버전은 `effective_until` 설정)

### 예시 데이터

```json
{
  "id": "...",
  "law_name": "법인세법",
  "article_number": "제27조",
  "clause": null,
  "title": "업무무관 비용 손금불산입",
  "summary": "법인의 업무와 관련 없는 지출은 손금에 산입하지 아니한다.",
  "category": "NON_DEDUCTIBLE_EXPENSE",
  "effective_from": "2010-01-01",
  "effective_until": null,
  "law_url": "https://www.law.go.kr/lsLawLinkInfo.do?chrClsCd=010202&lsJoLnkSeq=900178234",
  "related_mcc_codes": ["7995", "6051", "7273"],
  "auto_tag_conditions": {
    "mcc_in": ["7995", "6051", "7273"],
    "amount_gt": 0
  }
}
```

---

## 엔터티 간 카디널리티 요약

| 관계 | 카디널리티 | 설명 |
|------|------------|------|
| Transaction ↔ Merchant | N:1 | 거래는 하나의 가맹점에서 발생 |
| Merchant ↔ MCC | N:1 | 가맹점은 하나의 MCC 소속 |
| Transaction ↔ Employee | N:1 | 거래는 한 명의 직원이 수행 |
| Transaction ↔ Receipt | 1:N | 거래는 여러 증빙 첨부 가능 |
| Transaction ↔ Approval | 1:N | 거래는 여러 단계 승인 가능 |
| Transaction ↔ Case | 1:N | 거래는 여러 사건 생성 가능 |
| Case ↔ TaxRule | N:1 | 사건은 하나의 세법 룰 인용 |
| Trip/Event ↔ Employee | N:N | 이벤트는 여러 참석자, 직원은 여러 이벤트 |

---

**Last Updated:** 2025-10-20
**Version:** 1.0
