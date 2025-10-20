# 1. 온톨로지 기초: 엔터티 설계의 철학

> **학습 목표**: 현재 프로젝트의 `entities.md`를 분석하면서 온톨로지의 핵심 개념을 역으로 이해합니다.

---

## 1. 시작하기 전에: 온톨로지란 무엇인가?

### 1.1 데이터 모델링 vs 온톨로지 모델링

**일반적인 데이터베이스 설계:**
```
"거래 테이블을 만들자. 필요한 컬럼은... id, amount, date, merchant_name..."
→ 기능(Feature) 중심 사고
```

**온톨로지 설계:**
```
"'거래'란 무엇인가? 거래의 본질은? 거래는 누구와 무엇을 연결하는가?"
→ 개념(Concept)과 관계 중심 사고
```

**핵심 차이:**
| 관점 | 데이터 모델링 | 온톨로지 모델링 |
|------|-------------|---------------|
| 목적 | 데이터 저장 최적화 | **지식 표현** |
| 중심 | 테이블, 컬럼 | **엔터티, 관계** |
| 설계 질문 | "어떻게 저장할까?" | **"이것은 무엇인가?"** |
| 재사용성 | 프로젝트 종속적 | **도메인 전반에 걸쳐 재사용** |

### 1.2 왜 기업들이 온톨로지를 쓰는가?

**실제 사례 복습:**
- **NASA**: 시스템 엔지니어링 데이터를 온톨로지로 통합 → 요구사항 추적, 검증 자동화
- **Schneider Electric**: IoT 디바이스 2,500만 이벤트/일 → 온톨로지로 연결
- **Dow Jones**: 뉴스 엔터티(기업, 인물, 사건)를 온톨로지로 표현 → 검색·추천 정확도 향상

**공통점:**
1. **복잡한 도메인 지식**을 체계적으로 표현
2. **서로 다른 시스템** 간 데이터를 자동 연결
3. **추론**으로 명시되지 않은 지식 발견 (예: "MCC 7995는 도박" + "도박은 블랙" → "MCC 7995는 차단")

---

## 2. 실제 프로젝트 분석: Transaction 엔터티

> 📂 파일: `projects/01-expense-fraud-detection/ontology/entities.md` (Line 7-51)

### 2.1 엔터티 정의 해부

```markdown
## 1. Transaction (거래)

**정의:** 법인카드를 통한 개별 금융 거래 기록

**비즈니스 의미:** 직원이 법인카드로 상품/서비스를 구매한 단일 이벤트.
                 승인과 매입 단계를 모두 포함.
```

**분석: 왜 이렇게 정의했는가?**

1. **"개별 금융 거래"**:
   - ❌ "거래 내역" (너무 모호)
   - ✅ "개별 금융 거래 기록" (명확한 범위)

2. **"승인과 매입 단계를 모두 포함"**:
   - 카드 거래는 승인(Authorization) → 매입(Settlement) 2단계
   - 이 엔터티 하나로 전체 라이프사이클 표현
   - → **설계 철학**: 엔터티는 **비즈니스 프로세스의 한 주기**를 담아야 함

### 2.2 속성(Attribute) 설계 분석

#### 필수(Required) vs 선택(Optional)의 기준

| 속성 | 필수 | 이유 |
|------|------|------|
| `id` | ✓ | 모든 엔터티의 정체성(Identity) |
| `amount` | ✓ | 거래의 본질적 속성 (금액 없는 거래는 존재 불가) |
| `location` | ○ | 온라인 거래는 물리적 위치 없음 |
| `risk_score` | ○ | **계산되는** 속성이므로 선택적 |

**개념 포인트 1: 본질적 속성 vs 파생 속성**

```
본질적 속성: 엔터티가 생성될 때부터 존재
  - amount, transacted_at, merchant_id

파생 속성: 다른 속성이나 규칙으로부터 계산됨
  - risk_score (스코어링 알고리즘으로 계산)
  - policy_evaluation_result (정책 평가로 생성)
```

**왜 파생 속성도 저장하는가?**
- 추적성(Audit): 당시의 점수를 기록 (스코어링 알고리즘 변경 후에도 과거 점수 확인)
- 성능: 매번 재계산하지 않고 캐싱

#### 제약조건(Constraints)의 비즈니스 의미

```markdown
| `amount` | Decimal(15,2) | ✓ | 거래 금액 | > 0 |
```

**분석:**
- `Decimal(15,2)`: 정수 13자리 + 소수점 2자리 → 최대 999조 원까지 표현 가능
- `> 0`: 환불(REFUND)도 양수로 저장하고 `transaction_type`으로 구분

**개념 포인트 2: 제약조건은 비즈니스 규칙의 첫 번째 방어선**

```
비즈니스 규칙 계층:
1단계: 데이터 타입/제약조건 (amount > 0)
2단계: 비즈니스 규칙 (amount는 vat_amount의 10배 이내)
3단계: 정책 규칙 (amount >= 100,000이면 증빙 필수)
```

### 2.3 비즈니스 규칙 분석

```markdown
### 비즈니스 규칙

1. **금액 검증**: `amount`는 반드시 양수. `vat_amount`는 `amount`의 10% 이하 (한국 부가세율)
2. **시간 정합성**: `transacted_at`은 미래 시점일 수 없음
3. **상태 전이**: APPROVED → SETTLED → (CANCELLED | DISPUTED)만 허용
4. **온라인/위치**: `is_online = true`인 경우 `location`은 가맹점 등록 주소 사용
```

**왜 엔터티 정의에 규칙을 포함하는가?**

→ 온톨로지는 단순 데이터 구조가 아니라 **"살아있는 지식 체계"**

**개념 포인트 3: 선언적 규칙(Declarative Rules)**

```python
# 절차적(Procedural) 방식
if transaction.transacted_at > datetime.now():
    raise ValueError("미래 거래 불가")

# 선언적(Declarative) 방식 (온톨로지)
constraints:
  - transacted_at: NOT_FUTURE
```

선언적 방식의 장점:
- 코드 없이도 규칙 이해 가능
- 추론 엔진이 자동 검증
- 규칙 변경 시 로직 수정 불필요

---

## 3. 엔터티 간 비교: MCC vs Merchant

> 📂 파일: `entities.md` (Line 53-141)

### 3.1 두 엔터티의 역할

| 엔터티 | 정의 | 인스턴스 수 | 변경 빈도 |
|--------|------|------------|----------|
| **MCC** | 업종 분류 표준 코드 | ~1,000개 (Visa/MC 정의) | 거의 없음 |
| **Merchant** | 실제 가맹점 | 수만~수십만 개 | 매우 빈번 |

### 3.2 왜 분리했는가?

**나쁜 설계 (분리하지 않음):**
```json
{
  "merchant_name": "스타벅스 강남점",
  "category": "음식점",
  "risk_level": 0
}
```

문제:
- 스타벅스 1,000개 지점마다 "음식점", risk_level 0 중복 저장
- MCC 정책 변경 시 모든 가맹점 레코드 수정 필요

**좋은 설계 (분리):**
```json
MCC: {
  "code": "5812",
  "category": "Eating Places",
  "risk_level": 0
}

Merchant: {
  "name": "스타벅스 강남점",
  "mcc_id": "5812"  // 참조만
}
```

**개념 포인트 4: 정규화(Normalization) vs 온톨로지 계층(Hierarchy)**

| 관점 | 정규화 (DB) | 온톨로지 |
|------|------------|----------|
| 목적 | 중복 제거 | **개념의 계층 표현** |
| 분리 기준 | 함수 종속성 | **비즈니스 의미의 독립성** |

MCC는 단순히 "중복 제거"가 아니라 **"업종이라는 독립적 개념"**이기에 분리

### 3.3 실제 분석: MCC의 속성 설계

```markdown
| `is_gambling` | Boolean | ✓ | 도박 여부 | Default: false |
| `is_entertainment` | Boolean | ✓ | 유흥 여부 | Default: false |
| `requires_justification` | Boolean | ✓ | 사유 필수 여부 | Default: false |
```

**왜 이런 Boolean 속성들이 필요한가?**

→ **추론과 정책 평가의 속도**

```python
# Boolean 속성 없이 (느림)
if mcc.code in ["7995", "7273", "..."]:  # 매번 리스트 검색
    action = "BLOCK"

# Boolean 속성 사용 (빠름)
if mcc.is_gambling:  # O(1) 조회
    action = "BLOCK"
```

**개념 포인트 5: 계산 가능한 속성을 왜 저장하는가?**

`is_gambling`은 `code == "7995"`로도 알 수 있지만 저장하는 이유:
1. **성능**: 실시간 거래 평가 (밀리초 단위)
2. **명시성**: 코드만 보고도 도박 여부 즉시 파악
3. **유연성**: 향후 도박 MCC 추가 시 Boolean만 변경

---

## 4. 복잡한 엔터티: Case (사건)

> 📂 파일: `entities.md` (Line 335-375)

### 4.1 왜 Case를 별도 엔터티로?

**질문:** Transaction에 `is_fraud` Boolean 하나 추가하면 되지 않나?

**답변:** Case는 단순 플래그가 아니라 **"조사 프로세스 전체"**를 담는 엔터티

```markdown
| 속성명 | 설명 |
|--------|------|
| `case_type` | 사건 유형 (BLACKLIST_MCC, HIGH_RISK_SCORE, ...) |
| `status` | 처리 상태 (OPEN, UNDER_REVIEW, RESOLVED, CLOSED) |
| `assigned_to` | 담당자 |
| `resolution` | 처리 결과 (APPROVED, REJECTED, RECOVERED, WARNING_ISSUED) |
| `amount_recovered` | 회수 금액 |
| `previous_case_ids` | 이전 사건 ID 목록 (재범 추적) |
```

**개념 포인트 6: 엔터티는 프로세스의 상태를 담는다**

```
Transaction: 거래의 생명주기 (승인 → 매입 → 정산)
Case: 조사의 생명주기 (탐지 → 검토 → 해결 → 종결)
```

각각은 독립적인 **상태 기계(State Machine)**

### 4.2 재범 추적 설계 분석

```markdown
| `is_repeat_offense` | Boolean | ✓ | 재범 여부 | Default: false |
| `previous_case_ids` | Array[UUID] | ○ | 이전 사건 ID 목록 | FK → Case[] |
```

**왜 Boolean과 Array를 동시에?**

```python
# 성능 쿼리: 재범자만 빠르게 조회
SELECT * FROM Case WHERE is_repeat_offense = true

# 상세 추적: 재범 이력 전체 조회
SELECT * FROM Case WHERE id = ANY(previous_case_ids)
```

**개념 포인트 7: 캐싱 vs 정규화의 균형**

- `is_repeat_offense`: 캐싱 (빠른 필터링)
- `previous_case_ids`: 정규화 (정확한 추적)

---

## 5. 온톨로지 설계 원칙 정리

현재 프로젝트의 10개 엔터티를 분석하며 추출한 원칙:

### 원칙 1: 엔터티는 "명사"가 아니라 "개념"이다

❌ "이 정보를 저장해야 하니까 엔터티 만들자"
✅ "이 개념이 비즈니스에서 독립적 의미를 가지는가?"

**예시:**
- `Receipt`는 단순 "첨부 파일"이 아니라 **"적법성 증명"**이라는 개념
- `Policy`는 "설정"이 아니라 **"규칙의 버전 관리된 집합"**

### 원칙 2: 속성은 측정 가능하고 검증 가능해야 한다

```markdown
✅ amount: Decimal(15,2), > 0
✅ transacted_at: DateTime, ISO 8601
❌ "대략적인 거래 시점"
❌ "많은 금액"
```

### 원칙 3: 엔터티 개수는 10개 이하를 권장

**이유:**
- 10개 초과 시 관계 복잡도 폭발 (n² 개의 관계 가능)
- 유지보수 어려움
- 핵심 개념에 집중

현재 프로젝트: **정확히 10개** → 잘 설계됨

### 원칙 4: 비즈니스 규칙은 엔터티에 명시

```markdown
### 비즈니스 규칙

1. **금액 검증**: ...
2. **시간 정합성**: ...
```

코드가 아니라 **선언적 문서**로 관리 → 비개발자도 이해 가능

### 원칙 5: 라이프사이클을 명시

```markdown
### 라이프사이클

[승인 요청] → APPROVED → [매입 처리] → SETTLED → [정산 완료]
                ↓                          ↓
            CANCELLED                  DISPUTED
```

→ 엔터티의 **상태 전이 규칙** 명확화

---

## 6. 실습: 직접 분석해보기

### 과제 1: Employee 엔터티 분석

> 📂 파일: `entities.md` (Line 145-181)

**질문:**
1. `spending_limit_daily`와 `spending_limit_monthly`를 왜 둘 다 저장하는가?
2. `is_frequent_traveler` Boolean이 리스크 스코어링에 어떻게 영향을 주는가?
3. `approval_authority`는 어떤 관계에서 사용되는가?

<details>
<summary>💡 힌트 (클릭해서 보기)</summary>

1. 일일 한도와 월 한도는 **독립적 제약**
   - 일일 100만원, 월 1,000만원 설정 가능
   - 한 쪽만 저장하면 다른 쪽 계산 불가

2. `is_frequent_traveler`는 `scoring.md` (Line 221)에서 사용:
   ```
   빈번 출장자: 시간/위치 패턴 가중치 50% 감소
   ```

3. `Approval` 엔터티의 `approver_id` 검증:
   ```
   approver_id는 반드시 Employee.approval_authority = true
   ```
</details>

### 과제 2: TaxRule 엔터티의 설계 철학 이해

> 📂 파일: `entities.md` (Line 379-431)

**질문:**
1. 왜 세법 조문을 별도 엔터티로 만들었는가?
2. `effective_from`과 `effective_until`의 역할은?
3. `auto_tag_conditions` JSON 필드의 목적은?

<details>
<summary>💡 답안</summary>

1. **세법은 시간에 따라 변하는 외부 지식**
   - 법 개정 시 새 버전 생성
   - 과거 거래는 당시 유효했던 법 버전 참조 (감사 추적)

2. **버전 관리**:
   - `effective_from`: 이 법이 언제부터 유효한가
   - `effective_until`: null이면 현행법, 날짜가 있으면 폐지된 법

3. **자동 태깅**:
   ```json
   "auto_tag_conditions": {
     "mcc_in": ["7995"],
     "amount_gt": 0
   }
   ```
   → MCC 7995 거래는 자동으로 "법인세법 제27조" 태그

</details>

---

## 7. 다음 단계

온톨로지 엔터티의 개념을 이해했다면, 이제 **관계(Relationship)**를 배울 차례입니다.

**다음 학습 문서:**
- `02-relationships-and-graphs.md`: 엔터티 간 관계를 그래프로 표현하고 순회하는 방법

**핵심 질문 미리보기:**
- Transaction과 Merchant는 어떤 관계인가? (N:1의 의미)
- 왜 Trip/Event와 Transaction은 N:N 관계인가?
- Cypher 쿼리로 "3단계 떨어진 관계"를 어떻게 찾는가?

---

## 8. 참고 자료

### 현재 프로젝트 파일
- `projects/01-expense-fraud-detection/ontology/entities.md`
- `projects/01-expense-fraud-detection/GUIDE.md`

### 외부 리소스
- [Palantir Ontology 공식 문서](https://www.palantir.com/platforms/foundry/foundry-ontology/)
- [W3C Ontology Engineering](https://www.w3.org/TR/owl2-overview/)

### 실제 사례
- NASA: 시스템 엔지니어링 온톨로지
- Schneider Electric: Building Graph (IoT 온톨로지)

---

**Last Updated:** 2025-10-20
**Version:** 1.0
**학습 시간:** 약 45분
