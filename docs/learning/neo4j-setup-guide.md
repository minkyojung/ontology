# Neo4j 실습 가이드

> 현재 프로젝트(법인카드 사기 탐지)를 Neo4j로 구현하는 단계별 가이드

---

## ✅ 완료된 단계

- [x] Neo4j Docker 컨테이너 실행
- [x] 브라우저 접속 (http://localhost:7474)
- [ ] 기본 Cypher 쿼리 테스트
- [ ] 프로젝트 엔터티 스키마 생성
- [ ] 샘플 데이터 로드

---

## 🧪 Step 1: 기본 Cypher 쿼리 테스트

Neo4j 브라우저 상단의 쿼리 입력창에 아래 쿼리를 **하나씩** 복사해서 실행해보세요.

### 1.1 "Hello World" 노드 생성

```cypher
// 첫 번째 노드 생성
CREATE (n:Person {name: 'Neo', age: 25})
RETURN n
```

**실행 방법:**
1. 쿼리 복사
2. 상단 입력창에 붙여넣기
3. 실행 버튼 클릭 (또는 Ctrl+Enter / Cmd+Enter)

**예상 결과:**
- 그래프 뷰에 "Neo"라는 노드 1개 표시
- 아래에 "Created 1 node" 메시지

---

### 1.2 관계 생성

```cypher
// 두 번째 노드와 관계 생성
CREATE (morpheus:Person {name: 'Morpheus', age: 40})
CREATE (neo:Person {name: 'Neo', age: 25})
CREATE (neo)-[:KNOWS]->(morpheus)
RETURN neo, morpheus
```

**예상 결과:**
- Neo와 Morpheus 두 노드가 화살표로 연결됨
- "KNOWS" 관계 표시

---

### 1.3 쿼리 (조회)

```cypher
// Neo가 아는 사람 찾기
MATCH (neo:Person {name: 'Neo'})-[:KNOWS]->(friend)
RETURN neo.name AS person, friend.name AS knows
```

**예상 결과:**
- 테이블 형태로 "Neo knows Morpheus" 표시

---

### 1.4 데이터 정리

```cypher
// 모든 노드와 관계 삭제 (연습용)
MATCH (n)
DETACH DELETE n
```

**예상 결과:**
- "Deleted X nodes, Y relationships" 메시지

---

## 📊 Step 2: 프로젝트 엔터티 스키마 생성

이제 우리 프로젝트의 실제 엔터티를 생성합니다.

### 2.1 제약조건 (Constraints) 생성

```cypher
// Transaction ID를 유니크 키로 설정
CREATE CONSTRAINT transaction_id IF NOT EXISTS
FOR (t:Transaction) REQUIRE t.id IS UNIQUE;

// Merchant ID 유니크
CREATE CONSTRAINT merchant_id IF NOT EXISTS
FOR (m:Merchant) REQUIRE m.id IS UNIQUE;

// MCC code 유니크
CREATE CONSTRAINT mcc_code IF NOT EXISTS
FOR (mcc:MCC) REQUIRE mcc.code IS UNIQUE;

// Employee ID 유니크
CREATE CONSTRAINT employee_id IF NOT EXISTS
FOR (e:Employee) REQUIRE e.id IS UNIQUE;

// Case ID 유니크
CREATE CONSTRAINT case_id IF NOT EXISTS
FOR (c:Case) REQUIRE c.id IS UNIQUE;
```

**실행 후:**
- 왼쪽 사이드바 > "Database Information"에서 Constraints 확인 가능

---

### 2.2 인덱스 생성 (성능 최적화)

```cypher
// MCC 리스크 그룹으로 빠른 조회
CREATE INDEX mcc_risk_group IF NOT EXISTS
FOR (mcc:MCC) ON (mcc.risk_group);

// Transaction 날짜로 빠른 조회
CREATE INDEX transaction_date IF NOT EXISTS
FOR (t:Transaction) ON (t.transacted_at);

// Employee 이름으로 빠른 조회
CREATE INDEX employee_name IF NOT EXISTS
FOR (e:Employee) ON (e.name);
```

---

## 🎲 Step 3: 샘플 데이터 로드

### 3.1 MCC 데이터 (업종 코드)

```cypher
// BLACK MCC (도박)
CREATE (mcc1:MCC {
  code: '7995',
  category: 'Betting/Casino Gambling',
  description: 'Gambling transactions including online betting, casinos, lotteries',
  risk_group: 'BLACK',
  risk_level: 100,
  is_gambling: true,
  is_cash_equivalent: false,
  is_entertainment: false,
  requires_justification: true
})

// HIGH_RISK MCC (유흥)
CREATE (mcc2:MCC {
  code: '7273',
  category: 'Dating/Escort Services',
  description: 'Entertainment and dating services',
  risk_group: 'HIGH_RISK',
  risk_level: 40,
  is_gambling: false,
  is_cash_equivalent: false,
  is_entertainment: true,
  requires_justification: true
})

// NORMAL MCC (음식점)
CREATE (mcc3:MCC {
  code: '5812',
  category: 'Eating Places and Restaurants',
  description: 'Restaurants, fast food, cafes',
  risk_group: 'NORMAL',
  risk_level: 0,
  is_gambling: false,
  is_cash_equivalent: false,
  is_entertainment: false,
  requires_justification: false
})

RETURN mcc1, mcc2, mcc3
```

---

### 3.2 가맹점 데이터

```cypher
// 스타벅스 (NORMAL)
MATCH (mcc:MCC {code: '5812'})
CREATE (m1:Merchant {
  id: 'merchant-001',
  name: '스타벅스 강남점',
  legal_name: '스타벅스커피코리아',
  mcc_id: '5812',
  city: '서울',
  country: 'KR',
  is_whitelisted: false,
  trust_score: 85
})-[:HAS_MCC]->(mcc)

// 유흥업소 (HIGH_RISK)
MATCH (mcc:MCC {code: '7273'})
CREATE (m2:Merchant {
  id: 'merchant-002',
  name: '강남 룸살롱',
  mcc_id: '7273',
  city: '서울',
  country: 'KR',
  is_whitelisted: false,
  trust_score: 20
})-[:HAS_MCC]->(mcc)

// 도박 사이트 (BLACK)
MATCH (mcc:MCC {code: '7995'})
CREATE (m3:Merchant {
  id: 'merchant-003',
  name: 'Online Casino XYZ',
  mcc_id: '7995',
  country: 'MT',
  is_whitelisted: false,
  trust_score: 0
})-[:HAS_MCC]->(mcc)

RETURN m1, m2, m3
```

---

### 3.3 직원 데이터

```cypher
CREATE (e1:Employee {
  id: 'emp-001',
  employee_number: 'E2025001',
  name: '김철수',
  email: 'kim@company.com',
  department: '영업팀',
  position: '과장',
  role: 'SALES',
  spending_limit_daily: 500000,
  spending_limit_monthly: 10000000,
  is_frequent_traveler: true,
  approval_authority: false,
  is_active: true
})

CREATE (e2:Employee {
  id: 'emp-002',
  employee_number: 'E2025002',
  name: '박영희',
  email: 'park@company.com',
  department: '개발팀',
  position: '대리',
  role: 'ENGINEERING',
  spending_limit_daily: 300000,
  spending_limit_monthly: 5000000,
  is_frequent_traveler: false,
  approval_authority: false,
  is_active: true
})

RETURN e1, e2
```

---

### 3.4 거래 데이터 (정상 vs 의심)

```cypher
// 정상 거래: 스타벅스
MATCH (e:Employee {employee_number: 'E2025001'})
MATCH (m:Merchant {id: 'merchant-001'})
CREATE (t1:Transaction {
  id: 'tx-001',
  amount: 45000,
  currency: 'KRW',
  transacted_at: datetime('2025-10-20T14:30:00'),
  status: 'SETTLED',
  transaction_type: 'PURCHASE',
  is_online: false,
  risk_score: 0
})
CREATE (t1)-[:MADE_BY]->(e)
CREATE (t1)-[:BELONGS_TO]->(m)

// 의심 거래: 유흥업소 (심야 + 고액)
MATCH (e:Employee {employee_number: 'E2025002'})
MATCH (m:Merchant {id: 'merchant-002'})
CREATE (t2:Transaction {
  id: 'tx-002',
  amount: 3000000,
  currency: 'KRW',
  transacted_at: datetime('2025-10-19T23:45:00'),
  status: 'SETTLED',
  transaction_type: 'PURCHASE',
  is_online: false,
  risk_score: 85
})
CREATE (t2)-[:MADE_BY]->(e)
CREATE (t2)-[:BELONGS_TO]->(m)

// 블랙 거래: 도박 사이트
MATCH (e:Employee {employee_number: 'E2025002'})
MATCH (m:Merchant {id: 'merchant-003'})
CREATE (t3:Transaction {
  id: 'tx-003',
  amount: 500000,
  currency: 'KRW',
  transacted_at: datetime('2025-10-20T02:15:00'),
  status: 'BLOCKED',
  transaction_type: 'PURCHASE',
  is_online: true,
  risk_score: 100
})
CREATE (t3)-[:MADE_BY]->(e)
CREATE (t3)-[:BELONGS_TO]->(m)

RETURN t1, t2, t3
```

---

## 🔍 Step 4: 실전 쿼리 연습

데이터를 다 넣었으면 이제 쿼리로 분석해봅니다!

### 4.1 모든 데이터 시각화

```cypher
// 전체 그래프 보기
MATCH (n)
RETURN n
LIMIT 50
```

**예상 결과:**
- Transaction, Employee, Merchant, MCC 노드들이 관계로 연결된 그래프

---

### 4.2 도박 MCC로 거래한 모든 거래 찾기

```cypher
MATCH (t:Transaction)-[:BELONGS_TO]->(m:Merchant)-[:HAS_MCC]->(mcc:MCC)
WHERE mcc.is_gambling = true
RETURN t.id, t.amount, m.name, mcc.code, t.risk_score
```

**배운 개념:**
- 경로 쿼리: Transaction → Merchant → MCC (3단계 순회)
- WHERE로 필터링

---

### 4.3 리스크 점수 70 이상 거래 + 직원 정보

```cypher
MATCH (t:Transaction)-[:MADE_BY]->(e:Employee)
WHERE t.risk_score >= 70
RETURN t.id, t.amount, t.transacted_at, e.name, e.department, t.risk_score
ORDER BY t.risk_score DESC
```

**배운 개념:**
- ORDER BY로 정렬 (리스크 점수 높은 순)

---

### 4.4 특정 직원의 모든 거래 (시간순)

```cypher
MATCH (e:Employee {name: '박영희'})<-[:MADE_BY]-(t:Transaction)-[:BELONGS_TO]->(m:Merchant)
RETURN t.transacted_at, m.name, t.amount, t.risk_score
ORDER BY t.transacted_at DESC
```

---

### 4.5 집계: 직원별 총 지출

```cypher
MATCH (e:Employee)<-[:MADE_BY]-(t:Transaction)
WHERE t.status = 'SETTLED'
RETURN e.name,
       COUNT(t) AS transaction_count,
       SUM(t.amount) AS total_spending
ORDER BY total_spending DESC
```

**배운 개념:**
- COUNT, SUM 집계 함수
- GROUP BY 없이도 RETURN에서 자동 그룹핑

---

## 🎯 도전 과제

### 과제 1: 의심스러운 거래 찾기

요구사항:
- 리스크 스코어 50 이상
- HIGH_RISK 또는 BLACK MCC
- 금액 100만원 이상

<details>
<summary>💡 답안 보기</summary>

```cypher
MATCH (t:Transaction)-[:BELONGS_TO]->(m:Merchant)-[:HAS_MCC]->(mcc:MCC)
WHERE t.risk_score >= 50
  AND mcc.risk_group IN ['HIGH_RISK', 'BLACK']
  AND t.amount >= 1000000
RETURN t.id, t.amount, mcc.category, t.risk_score, t.transacted_at
ORDER BY t.risk_score DESC
```
</details>

---

### 과제 2: 가맹점별 평균 거래 금액

<details>
<summary>💡 답안 보기</summary>

```cypher
MATCH (m:Merchant)<-[:BELONGS_TO]-(t:Transaction)
RETURN m.name,
       COUNT(t) AS tx_count,
       AVG(t.amount) AS avg_amount,
       MAX(t.amount) AS max_amount
ORDER BY avg_amount DESC
```
</details>

---

## 🚀 다음 단계

1. **학습 문서 복습**:
   - `docs/learning/02-relationships-and-graphs.md` 다시 읽기
   - 실제 Neo4j에서 예제 실행

2. **더 복잡한 데이터 추가**:
   - Receipt (증빙) 엔터티
   - Trip (출장) 엔터티
   - Case (사건) 엔터티

3. **Python 연동**:
   - `neo4j` 파이썬 드라이버 설치
   - 스코어링 엔진 구현

---

**Last Updated:** 2025-10-20
**Version:** 1.0
