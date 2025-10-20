# 2. 관계와 그래프: 연결의 힘

> **학습 목표**: 현재 프로젝트의 `relationships.md`를 분석하면서 그래프 사고방식과 관계 설계를 이해합니다.

---

## 1. 관계형 DB vs 그래프 DB: 사고방식의 차이

### 1.1 "친구의 친구" 문제

**시나리오:** 김철수의 친구의 친구를 모두 찾아라

#### 관계형 DB (SQL) 접근

```sql
-- 1단계: 철수의 친구들
SELECT friend_id FROM Friendship WHERE user_id = '철수'

-- 2단계: 각 친구의 친구들 (JOIN)
SELECT f2.friend_id
FROM Friendship f1
JOIN Friendship f2 ON f1.friend_id = f2.user_id
WHERE f1.user_id = '철수'
```

**문제점:**
- 3단계, 4단계... N단계로 확장 시 JOIN 폭발
- 성능 급격히 저하 (인덱스 탐색 반복)

#### 그래프 DB (Cypher) 접근

```cypher
MATCH (철수:User {name: '김철수'})-[:FRIEND*2]-(친구의친구)
RETURN 친구의친구
```

**장점:**
- `*2` 하나로 2단계 순회
- `*1..10`으로 1~10단계 가변 순회 가능
- 그래프 순회는 O(관계 수)로 선형 성능

### 1.2 핵심 개념: 순회(Traversal) 사고

**관계형 사고:**
```
"어떤 테이블들을 JOIN 해야 하지?"
→ 테이블 중심
```

**그래프 사고:**
```
"A에서 B로 가는 경로는?"
→ 관계 중심
```

**실제 프로젝트 예시:**

```
질문: "이 거래가 속한 출장의 주최자는 누구인가?"

관계형 사고:
Transaction → TransactionEvent (JOIN) → Trip (JOIN) → Employee

그래프 사고:
(Transaction)-[:LINKED_TO]->(Trip)-[:ORGANIZED_BY]->(Employee)
```

---

## 2. 실제 프로젝트 분석: Transaction → Merchant → MCC

> 📂 파일: `relationships.md` (Line 19-74)

### 2.1 첫 번째 관계: belongs_to

```markdown
## 1. Transaction —belongs_to→ Merchant

**의미:** 거래는 특정 가맹점에서 발생한다
**Cardinality:** N:1 (다수의 거래 : 하나의 가맹점)
```

#### 카디널리티(Cardinality) 해부

**N:1의 의미:**
```
Merchant(1)  ← 여러 개 →  Transaction(N)

스타벅스 강남점 ← 거래1 (아메리카노 4,500원)
                 거래2 (라떼 5,000원)
                 거래3 (케이크 6,000원)
```

**반대 방향은?**
- 1:N (하나의 가맹점 : 다수의 거래)
- 같은 관계를 어느 엔터티 시점에서 보느냐의 차이

**개념 포인트 1: 관계는 방향성을 가진다**

```markdown
Transaction —belongs_to→ Merchant  (거래 → 가맹점)
Merchant —has→ Transaction        (가맹점 → 거래들)
```

현재 프로젝트는 **Transaction 시점**에서 표현:
- `Transaction.merchant_id` 외래 키 존재
- 거래 조회 시 가맹점 정보 필요한 경우가 많음

### 2.2 체인 관계: Transaction → Merchant → MCC

```markdown
## 1. Transaction —belongs_to→ Merchant (N:1)
## 2. Merchant —has→ MCC (N:1)
```

**그래프로 표현:**

```
(Transaction)-[:BELONGS_TO]->(Merchant)-[:HAS]->(MCC)
```

**이것의 힘:**

```cypher
-- 도박 MCC로 거래한 모든 거래 찾기
MATCH (t:Transaction)-[:BELONGS_TO]->(m:Merchant)-[:HAS]->(mcc:MCC)
WHERE mcc.is_gambling = true
RETURN t
```

**SQL로는?**

```sql
SELECT t.*
FROM Transaction t
JOIN Merchant m ON t.merchant_id = m.id
JOIN MCC c ON m.mcc_id = c.code
WHERE c.is_gambling = true
```

**개념 포인트 2: 경로(Path) 쿼리의 직관성**

- 그래프: "거래에서 가맹점 거쳐 MCC로 가는 경로"를 **시각적으로** 표현
- SQL: "어떤 테이블을 어떻게 조인할지" **절차적으로** 사고

---

## 3. 복잡한 관계: N:N (다대다)

> 📂 파일: `relationships.md` (Line 171-214)

### 3.1 왜 N:N이 필요한가?

```markdown
## 6. Transaction —linked_to→ Trip/Event

**Cardinality:** N:N (다수의 거래 : 다수의 이벤트)
```

**시나리오:**
```
출장 A (부산, 1월 10-12일):
  - 거래1: 1/10 호텔 예약
  - 거래2: 1/11 점심 식사
  - 거래3: 1/12 택시

거래3 (택시):
  - 출장 A와 연결
  - 회의 B (1/12 오후)와도 연결 가능
```

**왜 N:N인가?**
- 하나의 거래는 여러 이벤트와 연결 가능 (출장 + 회의)
- 하나의 이벤트는 여러 거래 포함

### 3.2 중간 테이블(Junction Table)의 역할

```markdown
**Attributes:**
- 중간 테이블: `TransactionEvent`
  - `transaction_id` → `Transaction.id`
  - `event_id` → `Trip.id`
  - `linked_at` (DateTime)
  - `linked_by` (UUID, FK → Employee)
```

**왜 단순 ID 매핑이 아닌가?**

중간 테이블에 **메타데이터 추가**:
- `linked_at`: 언제 연결했는가? (자동 vs 수동)
- `linked_by`: 누가 연결했는가? (감사 추적)

**개념 포인트 3: 관계도 속성을 가질 수 있다**

```
관계형 DB: 관계 = 외래 키 (속성 없음)
그래프 DB: 관계 = 엣지 + 속성 가능

예: (Transaction)-[:LINKED_TO {linked_at: "2025-01-10", linked_by: "김철수"}]->(Trip)
```

### 3.3 자동 연결 규칙 분석

```markdown
**Business Rules:**
- 자동 연결 조건:
  1. 거래 일시가 `Trip.start_at`과 `Trip.end_at` 사이
  2. 거래 위치가 `Trip.location` 반경 50km 이내
  3. 거래 직원이 `Trip.attendees`에 포함
```

**이것은 추론(Reasoning)의 예시:**

```python
# 명시적 지식: 출장 일정과 거래 데이터
Trip(id=1, start="2025-01-10", end="2025-01-12", location="부산")
Transaction(id=100, transacted_at="2025-01-11", location="부산", employee="김철수")

# 암묵적 지식: 자동 추론
if (transaction.transacted_at BETWEEN trip.start_at AND trip.end_at) AND
   (distance(transaction.location, trip.location) < 50km) AND
   (transaction.employee IN trip.attendees):
    CREATE (transaction)-[:LINKED_TO]->(trip)
```

**개념 포인트 4: 온톨로지는 데이터 + 추론 규칙**

---

## 4. 관계의 제약: Referential Integrity

> 📂 파일: `relationships.md` (Line 29-31, 58-60)

### 4.1 CASCADE vs RESTRICT

```markdown
## 4. Transaction —has→ Receipt

**Referential Integrity:** CASCADE (거래 삭제 시 증빙도 삭제)

## 1. Transaction —belongs_to→ Merchant

**Referential Integrity:** RESTRICT (가맹점 삭제 시 거래가 있으면 삭제 불가)
```

**왜 다르게 설정했는가?**

#### CASCADE (영수증)
```
거래가 삭제되면 증빙도 의미 없음
→ 거래 = 증빙의 "소유자(Owner)"
→ 소유자 사라지면 소유물도 제거
```

#### RESTRICT (가맹점)
```
가맹점 삭제 시도:
  - 거래가 1개라도 있으면 → 삭제 차단
  - 이유: 과거 거래 기록의 무결성 보호
  - 대신 is_active = false로 비활성화
```

**개념 포인트 5: 삭제 정책은 비즈니스 의미를 반영**

| 관계 유형 | 정책 | 예시 |
|----------|------|------|
| 소유 관계 | CASCADE | Transaction → Receipt |
| 참조 관계 | RESTRICT | Transaction → Merchant |
| 독립 관계 | SET NULL | (선택적 관계) |

### 4.2 Soft Delete의 필요성

```markdown
**Constraints:**
- **Referential Integrity:** RESTRICT (직원 삭제 불가, `is_active = false`로 변경)
```

**왜 실제 DELETE를 안 하는가?**

```python
# 하드 삭제 (Hard Delete) - 안 좋음
DELETE FROM Employee WHERE id = '김철수'
→ 과거 거래의 employee_id가 NULL이 되거나 에러

# 소프트 삭제 (Soft Delete) - 좋음
UPDATE Employee SET is_active = false WHERE id = '김철수'
→ 과거 거래 기록 유지, 신규 거래만 차단
```

**개념 포인트 6: 감사 추적(Audit Trail)을 위한 소프트 삭제**

금융, 법률, 의료 등 규제 산업에서는 **모든 기록 보존 의무**

---

## 5. 그래프 쿼리 기초: Cypher 입문

### 5.1 기본 문법

```cypher
MATCH (변수:레이블 {속성: 값})-[관계]->(변수2:레이블2)
WHERE 조건
RETURN 결과
```

**현재 프로젝트 예시:**

```cypher
-- 예시 1: 특정 직원의 모든 거래
MATCH (e:Employee {name: '김철수'})<-[:MADE_BY]-(t:Transaction)
RETURN t

-- 예시 2: 도박 MCC 거래
MATCH (t:Transaction)-[:BELONGS_TO]->(m:Merchant)-[:HAS]->(mcc:MCC)
WHERE mcc.is_gambling = true
RETURN t, m, mcc

-- 예시 3: 증빙 없는 고액 거래
MATCH (t:Transaction)
WHERE t.amount >= 100000
  AND NOT (t)-[:HAS]->(:Receipt)
RETURN t
```

### 5.2 경로 쿼리

```cypher
-- 가변 길이 경로 (1~3단계)
MATCH (t:Transaction)-[*1..3]-(related)
RETURN related

-- 특정 경로만
MATCH path = (t:Transaction)-[:BELONGS_TO]->()-[:HAS]->(mcc:MCC)
WHERE mcc.risk_group = 'BLACK'
RETURN path
```

### 5.3 집계 쿼리

```cypher
-- 직원별 월 지출 총액
MATCH (e:Employee)<-[:MADE_BY]-(t:Transaction)
WHERE t.transacted_at >= date('2025-01-01')
  AND t.transacted_at < date('2025-02-01')
RETURN e.name, SUM(t.amount) AS total_spending
ORDER BY total_spending DESC
```

---

## 6. 실제 프로젝트의 관계 패턴 분석

### 6.1 12개 관계의 분류

| 패턴 | 관계 예시 | 개수 |
|------|----------|------|
| **소유 관계** | Transaction → Receipt | 3개 |
| **분류 관계** | Merchant → MCC | 2개 |
| **행위 관계** | Employee → Transaction | 2개 |
| **연결 관계** | Transaction ↔ Trip | 2개 |
| **감사 관계** | Case → TaxRule | 3개 |

### 6.2 패턴 1: 소유 관계 (Composition)

```
Transaction (1) —has→ Receipt (N)
Transaction (1) —has→ Approval (N)
```

**특징:**
- CASCADE 삭제
- 자식 엔터티는 부모 없이 존재 불가

### 6.3 패턴 2: 분류 관계 (Taxonomy)

```
Merchant (N) —has→ MCC (1)
```

**특징:**
- 계층 구조 (가맹점 → 업종)
- 분류 기준(MCC)은 거의 변경 안 됨
- RESTRICT 삭제 (분류 보호)

### 6.4 패턴 3: 재귀 관계 (Self-Reference)

```markdown
## 10. Case —refers_to_previous→ Case

**Cardinality:** N:N (다수의 사건 : 다수의 이전 사건)
```

**그래프로 표현:**

```
(Case1)-[:REFERS_TO]->(Case2)-[:REFERS_TO]->(Case3)
  ↓
재범 추적 체인
```

**Cypher 쿼리:**

```cypher
-- 재범 이력 전체 추적 (무한 깊이)
MATCH path = (c:Case)-[:REFERS_TO*]->(previous:Case)
WHERE c.id = :case_id
RETURN path

-- 3회 이상 재범자
MATCH (c:Case)-[:REFERS_TO*3..]->()
RETURN c
```

**개념 포인트 7: 재귀 관계는 그래프의 강점**

관계형 DB에서는 재귀 쿼리 어려움 (WITH RECURSIVE 필요)
그래프 DB에서는 `*` 연산자로 간단히 표현

---

## 7. 실습: 복잡한 쿼리 설계

### 과제 1: "의심스러운 거래" 탐지 쿼리

**요구사항:**
- 리스크 스코어 70 이상
- 증빙 없음
- 블랙/그레이 MCC
- 출장 연결 없음

<details>
<summary>💡 SQL 답안</summary>

```sql
SELECT t.*
FROM Transaction t
JOIN Merchant m ON t.merchant_id = m.id
JOIN MCC c ON m.mcc_id = c.code
LEFT JOIN Receipt r ON t.id = r.transaction_id
LEFT JOIN TransactionEvent te ON t.id = te.transaction_id
WHERE t.risk_score >= 70
  AND r.id IS NULL
  AND c.risk_group IN ('BLACK', 'GRAY')
  AND te.event_id IS NULL
```
</details>

<details>
<summary>💡 Cypher 답안</summary>

```cypher
MATCH (t:Transaction)-[:BELONGS_TO]->(m:Merchant)-[:HAS]->(mcc:MCC)
WHERE t.risk_score >= 70
  AND mcc.risk_group IN ['BLACK', 'GRAY']
  AND NOT (t)-[:HAS]->(:Receipt)
  AND NOT (t)-[:LINKED_TO]->(:Trip)
RETURN t, m, mcc
```
</details>

### 과제 2: "재범자의 패턴" 분석

**요구사항:**
- 3회 이상 위반한 직원
- 각 직원의 주요 위반 유형
- 총 회수 금액

<details>
<summary>💡 Cypher 답안</summary>

```cypher
MATCH (e:Employee)<-[:MADE_BY]-(t:Transaction)<-[:RELATES_TO]-(c:Case)
WHERE c.is_repeat_offense = true
WITH e, COUNT(c) AS violation_count,
     COLLECT(c.case_type) AS types,
     SUM(c.amount_recovered) AS total_recovered
WHERE violation_count >= 3
RETURN e.name,
       violation_count,
       types,
       total_recovered
ORDER BY total_recovered DESC
```
</details>

### 과제 3: "출장 없는 원거리 거래" 찾기

**요구사항:**
- 사무실에서 50km 이상
- 해당 기간 승인된 출장 없음

<details>
<summary>💡 개념 힌트</summary>

```cypher
MATCH (t:Transaction)-[:MADE_BY]->(e:Employee)
WHERE point.distance(
        t.location,
        e.office_location
      ) > 50000  // 미터 단위
  AND NOT (t)-[:LINKED_TO]->(:Trip {approval_status: 'APPROVED'})
RETURN t, e
```

Neo4j의 `point.distance()` 함수로 GeoJSON 거리 계산
</details>

---

## 8. 관계 설계 원칙 정리

### 원칙 1: 카디널리티는 비즈니스 규칙을 반영

```
1:1 → 거의 사용 안 함 (통합 가능)
1:N → 소유 또는 분류 관계
N:N → 독립적 엔터티 간 연결
```

### 원칙 2: 관계 방향은 주요 쿼리 방향

```
Transaction → Merchant (거래 조회 시 가맹점 필요)
Merchant ← Transaction (가맹점 조회 시 거래 목록은 덜 중요)
```

### 원칙 3: 제약조건은 데이터 무결성 보장

```
CASCADE: 소유 관계
RESTRICT: 참조 관계
SET NULL: 선택적 관계
```

### 원칙 4: N:N 관계는 중간 테이블에 메타데이터 추가

```
TransactionEvent:
  - transaction_id
  - event_id
  - linked_at  ← 메타데이터
  - linked_by  ← 메타데이터
```

---

## 9. 다음 단계

관계와 그래프 개념을 이해했다면, 이제 **규칙(Rules)과 추론(Reasoning)**을 배울 차례입니다.

**다음 학습 문서:**
- `03-rules-and-reasoning.md`: 블랙리스트, 스코어링, 추론 엔진의 원리

**핵심 질문 미리보기:**
- 규칙 엔진은 어떻게 작동하는가?
- 리스크 스코어 0-100점은 어떻게 계산되는가?
- 추론으로 "새로운 지식"을 어떻게 만드는가?

---

## 10. 참고 자료

### 현재 프로젝트 파일
- `projects/01-expense-fraud-detection/ontology/relationships.md`

### Cypher 학습
- [Neo4j Cypher 기초](https://neo4j.com/developer/cypher/)
- [Neo4j GraphAcademy](https://graphacademy.neo4j.com/) (무료 인증)

### 실제 사례
- Neo4j: 사기 탐지 링 찾기
- 지식그래프: Wikipedia → DBpedia 경로 쿼리

---

**Last Updated:** 2025-10-20
**Version:** 1.0
**학습 시간:** 약 50분
