# Relationships Definition

온톨로지 엔터티 간의 관계를 정의합니다. 각 관계는 비즈니스 의미와 제약조건을 명확히 합니다.

---

## 관계 표기법

```
[Source Entity] —relationship_name→ [Target Entity]
```

- **Cardinality**: 1:1, 1:N, N:1, N:N
- **Optionality**: Required (필수) / Optional (선택)
- **Referential Integrity**: CASCADE, RESTRICT, SET NULL

---

## 1. Transaction —belongs_to→ Merchant

**의미:** 거래는 특정 가맹점에서 발생한다

**Cardinality:** N:1 (다수의 거래 : 하나의 가맹점)

**Attributes:**
- `Transaction.merchant_id` → `Merchant.id`

**Constraints:**
- **Required**: 모든 거래는 반드시 가맹점을 가져야 함
- **Referential Integrity**: RESTRICT (가맹점 삭제 시 거래가 있으면 삭제 불가)
- **Index**: `Transaction.merchant_id`에 인덱스 (조회 성능)

**Business Rules:**
- 가맹점 정보 변경 시 과거 거래는 영향받지 않음 (스냅샷 방식 고려)
- 가맹점 신뢰도(`Merchant.trust_score`)는 거래 패턴으로 갱신

**Query Example:**
```sql
-- 특정 가맹점의 모든 거래 조회
SELECT t.*
FROM Transaction t
WHERE t.merchant_id = :merchant_id
ORDER BY t.transacted_at DESC;
```

---

## 2. Merchant —has→ MCC

**의미:** 가맹점은 특정 업종 코드를 갖는다

**Cardinality:** N:1 (다수의 가맹점 : 하나의 MCC)

**Attributes:**
- `Merchant.mcc_id` → `MCC.code`

**Constraints:**
- **Required**: 모든 가맹점은 반드시 MCC를 가져야 함
- **Referential Integrity**: RESTRICT (MCC 삭제 시 가맹점이 있으면 삭제 불가)
- **Index**: `Merchant.mcc_id`에 인덱스

**Business Rules:**
- MCC 변경은 가맹점 업종 변경 시에만 발생 (드물음)
- MCC의 `risk_group` 변경은 기존 가맹점의 거래 재평가 트리거

**Query Example:**
```sql
-- 도박(7995) MCC를 가진 모든 가맹점
SELECT m.*
FROM Merchant m
JOIN MCC c ON m.mcc_id = c.code
WHERE c.code = '7995';
```

---

## 3. Transaction —made_by→ Employee

**의미:** 거래는 특정 직원에 의해 수행된다

**Cardinality:** N:1 (다수의 거래 : 한 명의 직원)

**Attributes:**
- `Transaction.employee_id` → `Employee.id`

**Constraints:**
- **Required**: 모든 거래는 반드시 직원을 가져야 함
- **Referential Integrity**: RESTRICT (직원 삭제 불가, `is_active = false`로 변경)
- **Index**: `Transaction.employee_id`, `Transaction.transacted_at` (복합 인덱스)

**Business Rules:**
- 직원의 한도(`spending_limit_daily/monthly`) 초과 시 거래 자동 보류
- `Employee.is_active = false`인 직원은 신규 거래 불가
- 거래 패턴 분석으로 비정상 행위 탐지 (예: 급격한 지출 증가)

**Query Example:**
```sql
-- 특정 직원의 월별 지출 총액
SELECT
  DATE_TRUNC('month', t.transacted_at) AS month,
  SUM(t.amount) AS total_spending
FROM Transaction t
WHERE t.employee_id = :employee_id
  AND t.status = 'SETTLED'
GROUP BY month
ORDER BY month DESC;
```

---

## 4. Transaction —has→ Receipt

**의미:** 거래는 하나 이상의 증빙을 첨부할 수 있다

**Cardinality:** 1:N (하나의 거래 : 다수의 증빙)

**Attributes:**
- `Receipt.transaction_id` → `Transaction.id`

**Constraints:**
- **Optional**: 거래에 증빙이 없을 수 있음 (정책에 따라 필수 여부 결정)
- **Referential Integrity**: CASCADE (거래 삭제 시 증빙도 삭제)
- **Index**: `Receipt.transaction_id`

**Business Rules:**
- `Transaction.amount ≥ Policy.receipt_required_threshold`인 경우 증빙 필수
- 증빙 제출 기한: `Receipt.submitted_at - Transaction.transacted_at ≤ Policy.receipt_deadline_hours`
- 증빙 없으면 리스크 스코어 +40

**Query Example:**
```sql
-- 증빙 미제출 거래 (10만원 이상, 3일 경과)
SELECT t.*
FROM Transaction t
LEFT JOIN Receipt r ON t.id = r.transaction_id
WHERE t.amount >= 100000
  AND r.id IS NULL
  AND t.transacted_at < NOW() - INTERVAL '72 hours';
```

---

## 5. Transaction —evaluated_by→ Policy

**의미:** 거래는 특정 정책에 의해 평가된다

**Cardinality:** N:1 (다수의 거래 : 하나의 정책)

**Attributes:**
- `Transaction.policy_evaluation_result` (JSON에 `policy_id` 포함)

**Constraints:**
- **Required**: 모든 거래는 평가되어야 함
- **Referential Integrity**: 논리적 관계 (물리적 FK 없음, JSON 참조)
- **Index**: N/A (JSON 필드)

**Business Rules:**
- 거래 발생 시점의 활성 정책(`Policy.is_active = true`) 적용
- 정책 버전 변경 시 과거 거래는 재평가하지 않음 (스냅샷)
- 평가 결과는 `Transaction.policy_evaluation_result`에 저장

**Query Example:**
```sql
-- 특정 정책 버전으로 평가된 거래 조회
SELECT t.*
FROM Transaction t
WHERE t.policy_evaluation_result->>'policy_id' = :policy_id;
```

---

## 6. Transaction —linked_to→ Trip/Event

**의미:** 거래는 업무 일정(출장/회의)과 연결될 수 있다

**Cardinality:** N:N (다수의 거래 : 다수의 이벤트)

**Attributes:**
- 중간 테이블: `TransactionEvent`
  - `transaction_id` → `Transaction.id`
  - `event_id` → `Trip.id`
  - `linked_at` (DateTime)
  - `linked_by` (UUID, FK → Employee)

**Constraints:**
- **Optional**: 거래가 이벤트와 연결되지 않을 수 있음
- **Referential Integrity**: CASCADE (양쪽 삭제 시 중간 테이블도 삭제)
- **Index**: `TransactionEvent(transaction_id, event_id)` 복합 인덱스

**Business Rules:**
- 자동 연결 조건:
  1. 거래 일시가 `Trip.start_at`과 `Trip.end_at` 사이
  2. 거래 위치가 `Trip.location` 반경 50km 이내
  3. 거래 직원이 `Trip.attendees`에 포함

- 연결된 거래는 위치 불일치 패턴에서 면제

**Query Example:**
```sql
-- 특정 출장과 연결된 모든 거래
SELECT t.*
FROM Transaction t
JOIN TransactionEvent te ON t.id = te.transaction_id
WHERE te.event_id = :trip_id
ORDER BY t.transacted_at;

-- 출장 없이 해외에서 발생한 거래 (그레이)
SELECT t.*
FROM Transaction t
LEFT JOIN TransactionEvent te ON t.id = te.transaction_id
WHERE t.location IS NOT NULL
  AND ST_Distance(t.location, :office_location) > 50000 -- 50km
  AND te.event_id IS NULL;
```

---

## 7. Approval —grants→ Transaction

**의미:** 승인은 특정 거래에 대한 허가/거부를 나타낸다

**Cardinality:** N:1 (다수의 승인 : 하나의 거래)

**Attributes:**
- `Approval.transaction_id` → `Transaction.id`

**Constraints:**
- **Optional**: 거래에 승인이 없을 수 있음 (정책에 따라)
- **Referential Integrity**: CASCADE (거래 삭제 시 승인도 삭제)
- **Index**: `Approval.transaction_id`, `Approval.status`

**Business Rules:**
- 사전 승인(`PRE_APPROVAL`): 거래 발생 전 승인
- 사후 승인(`POST_APPROVAL`): 거래 발생 후 검토
- `Approval.status = REJECTED` 시 거래 상태를 `CANCELLED`로 변경
- 승인자(`approver_id`)는 반드시 `Employee.approval_authority = true`

**Query Example:**
```sql
-- 승인 대기 중인 거래
SELECT t.*, a.requested_at, a.approver_id
FROM Transaction t
JOIN Approval a ON t.id = a.transaction_id
WHERE a.status = 'PENDING'
ORDER BY a.requested_at;
```

---

## 8. Case —relates_to→ Transaction

**의미:** 사건은 특정 거래의 정책 위반을 나타낸다

**Cardinality:** N:1 (다수의 사건 : 하나의 거래)

**Attributes:**
- `Case.transaction_id` → `Transaction.id`

**Constraints:**
- **Required**: 모든 사건은 거래와 연결되어야 함
- **Referential Integrity**: RESTRICT (거래 삭제 불가, 사건이 있으면)
- **Index**: `Case.transaction_id`, `Case.status`

**Business Rules:**
- 하나의 거래에 여러 사건 생성 가능 (예: MCC 블랙 + 증빙 미제출)
- 사건 생성 조건:
  - MCC가 `blacklist_mccs`에 포함
  - 리스크 스코어 ≥ `Policy.risk_threshold`
  - 증빙 기한 경과
  - 위치/시간대 불일치

**Query Example:**
```sql
-- 특정 거래의 모든 사건
SELECT c.*
FROM Case c
WHERE c.transaction_id = :transaction_id
ORDER BY c.detected_at;

-- 미해결 사건이 있는 거래
SELECT DISTINCT t.*
FROM Transaction t
JOIN Case c ON t.id = c.transaction_id
WHERE c.status IN ('OPEN', 'UNDER_REVIEW');
```

---

## 9. Case —cites→ TaxRule

**의미:** 사건은 특정 세법 조항을 근거로 한다

**Cardinality:** N:1 (다수의 사건 : 하나의 세법 룰)

**Attributes:**
- `Case.tax_rule_cited` → `TaxRule.id`

**Constraints:**
- **Optional**: 모든 사건이 세법과 관련되지는 않음
- **Referential Integrity**: RESTRICT (세법 룰 삭제 불가, 인용된 사건이 있으면)
- **Index**: `Case.tax_rule_cited`

**Business Rules:**
- 세법 관련 사건(`NON_DEDUCTIBLE_EXPENSE`, `VAT_EXCLUSION`)은 반드시 `TaxRule` 인용
- 사건 보고서에 `TaxRule.law_url` 자동 포함
- 세법 개정 시 과거 사건은 당시 유효했던 `TaxRule` 버전 참조

**Query Example:**
```sql
-- 법인세법 제27조로 생성된 사건
SELECT c.*, t.amount, e.name AS employee_name
FROM Case c
JOIN TaxRule tr ON c.tax_rule_cited = tr.id
JOIN Transaction t ON c.transaction_id = t.id
JOIN Employee e ON t.employee_id = e.id
WHERE tr.article_number = '제27조';
```

---

## 10. Case —refers_to_previous→ Case

**의미:** 사건은 이전 사건을 참조할 수 있다 (재범 추적)

**Cardinality:** N:N (다수의 사건 : 다수의 이전 사건)

**Attributes:**
- `Case.previous_case_ids` (Array[UUID])

**Constraints:**
- **Optional**: 첫 번째 위반은 이전 사건 없음
- **Referential Integrity**: RESTRICT (참조된 사건 삭제 불가)
- **Index**: GIN 인덱스 (`previous_case_ids`)

**Business Rules:**
- 동일 직원의 3개월 내 유사 위반 자동 연결
- 재범 시 `Case.is_repeat_offense = true`, `Case.severity` 상향
- 3회 이상 재범 시 자동 에스컬레이션 (경영진 통보)

**Query Example:**
```sql
-- 특정 직원의 재범 사건 추적
SELECT c1.*, c1.previous_case_ids
FROM Case c1
JOIN Transaction t1 ON c1.transaction_id = t1.id
WHERE t1.employee_id = :employee_id
  AND c1.is_repeat_offense = true
ORDER BY c1.detected_at DESC;
```

---

## 11. Trip/Event —organized_by→ Employee

**의미:** 이벤트는 특정 직원이 주최한다

**Cardinality:** N:1 (다수의 이벤트 : 한 명의 주최자)

**Attributes:**
- `Trip.organizer_id` → `Employee.id`

**Constraints:**
- **Required**: 모든 이벤트는 주최자를 가져야 함
- **Referential Integrity**: RESTRICT
- **Index**: `Trip.organizer_id`

**Business Rules:**
- 주최자는 이벤트 수정/삭제 권한 보유
- 주최자의 상사가 자동으로 이벤트 승인자가 됨

---

## 12. Trip/Event ←attended_by→ Employee

**의미:** 이벤트는 여러 직원이 참석하며, 직원은 여러 이벤트에 참석한다

**Cardinality:** N:N

**Attributes:**
- 중간 테이블: `TripAttendee`
  - `trip_id` → `Trip.id`
  - `employee_id` → `Employee.id`
  - `role` (Enum: ORGANIZER, ATTENDEE)

**Constraints:**
- **Optional**: 이벤트에 참석자가 없을 수 있음 (최소 주최자 1명)
- **Referential Integrity**: CASCADE
- **Index**: `TripAttendee(trip_id, employee_id)` 복합 인덱스

**Business Rules:**
- 참석자의 거래는 이벤트 기간/위치와 자동 매칭
- 참석자가 아닌 직원의 거래가 이벤트 위치에서 발생하면 그레이

**Query Example:**
```sql
-- 특정 출장의 모든 참석자
SELECT e.*, ta.role
FROM Employee e
JOIN TripAttendee ta ON e.id = ta.employee_id
WHERE ta.trip_id = :trip_id;

-- 참석자의 출장 기간 중 거래
SELECT t.*
FROM Transaction t
JOIN TripAttendee ta ON t.employee_id = ta.employee_id
JOIN Trip tr ON ta.trip_id = tr.id
WHERE tr.id = :trip_id
  AND t.transacted_at BETWEEN tr.start_at AND tr.end_at;
```

---

## 13. Policy —created_by→ Employee

**의미:** 정책은 특정 직원에 의해 생성된다

**Cardinality:** N:1

**Attributes:**
- `Policy.created_by` → `Employee.id`

**Constraints:**
- **Required**: 모든 정책은 생성자를 가져야 함
- **Referential Integrity**: RESTRICT
- **Index**: `Policy.created_by`

**Business Rules:**
- Finance 역할만 정책 생성/수정 가능
- 정책 변경 시 감사 로그 필수

---

## 관계 다이어그램 (ERD 스타일)

```
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│  Employee   │       │ Transaction │       │  Merchant   │
│             │1─────N│             │N─────1│             │
│ id (PK)     │       │ id (PK)     │       │ id (PK)     │
│ name        │       │ amount      │       │ name        │
│ department  │       │ transacted  │       │ mcc_id (FK) │
└─────────────┘       └─────────────┘       └─────────────┘
       │                      │                      │
       │                      │1                     │1
       │                      │                      │
       │                      │N                     │N
       │              ┌───────────────┐      ┌─────────────┐
       │              │    Receipt    │      │     MCC     │
       │              │               │      │             │
       │              │ id (PK)       │      │ code (PK)   │
       │              │ transaction_id│      │ risk_group  │
       │              └───────────────┘      └─────────────┘
       │
       │1             ┌─────────────┐
       │              │   Approval  │
       └─────────────N│             │
                      │ id (PK)     │
                      │ transaction │
                      └─────────────┘

┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│    Case     │       │ Transaction │       │  TaxRule    │
│             │N─────1│             │       │             │
│ id (PK)     │       │ id (PK)     │       │ id (PK)     │
│ transaction │       │             │       │ article_no  │
│ tax_rule_id │N─────1└─────────────┘       │ law_url     │
└─────────────┘                             └─────────────┘

┌─────────────┐                             ┌─────────────┐
│ Trip/Event  │                             │  Employee   │
│             │N───────────────────────────N│             │
│ id (PK)     │      TripAttendee           │ id (PK)     │
│ organizer   │                             │             │
└─────────────┘                             └─────────────┘
```

---

## 관계 무결성 체크리스트

### 생성 시 검증
- [ ] 외래 키가 가리키는 엔터티가 존재하는가?
- [ ] 필수 관계가 누락되지 않았는가?
- [ ] N:N 관계의 중간 테이블이 생성되었는가?

### 수정 시 검증
- [ ] 참조 무결성이 유지되는가? (CASCADE/RESTRICT 확인)
- [ ] 관련 엔터티의 상태가 일관성 있는가?

### 삭제 시 검증
- [ ] RESTRICT 관계가 있는 경우 삭제 불가 처리되는가?
- [ ] CASCADE 관계의 하위 엔터티가 함께 삭제되는가?
- [ ] Soft delete (`is_active = false`)가 필요한가?

---

**Last Updated:** 2025-10-20
**Version:** 1.0
