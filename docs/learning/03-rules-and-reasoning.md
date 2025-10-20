# 3. 규칙과 추론: 온톨로지의 지능

> **학습 목표**: 현재 프로젝트의 `blacklist.json`과 `scoring.md`를 분석하면서 규칙 엔진과 추론의 원리를 이해합니다.

---

## 1. 규칙(Rule)이란 무엇인가?

### 1.1 절차적 코드 vs 선언적 규칙

**절차적 방식 (Procedural):**

```python
# main.py
if transaction.merchant.mcc.code == "7995":
    return "BLOCK"
elif transaction.merchant.mcc.code in ["7273", "5813"]:
    if transaction.amount > 100000:
        return "REVIEW"
    else:
        return "APPROVE"
# ... 수백 개의 if-elif-else
```

**문제점:**
- 규칙이 코드에 **하드코딩**
- 정책 변경 시 코드 수정 → 재배포 필요
- 비개발자(법무팀, 세무팀)는 규칙 이해 불가

**선언적 방식 (Declarative):**

```json
{
  "code": "7995",
  "action": "BLOCK",
  "reason": "업무와 무관한 도박성 지출",
  "legal_reference": {
    "law": "법인세법",
    "article": "제27조"
  }
}
```

**장점:**
- 규칙이 **데이터** (JSON, YAML, DB)
- 코드 수정 없이 규칙만 변경
- 법무팀도 직접 검토 가능
- 버전 관리 (Git으로 규칙 변경 추적)

### 1.2 규칙의 3요소

```
IF (조건) THEN (결론) BECAUSE (근거)
```

**현재 프로젝트 예시:**

```json
{
  "조건": "mcc_code == '7995'",
  "결론": "action = BLOCK",
  "근거": "legal_reference.law = '법인세법 제27조'"
}
```

---

## 2. 실제 프로젝트 분석: Blacklist 규칙

> 📂 파일: `rules/blacklist.json` (Line 10-29)

### 2.1 MCC 7995 (도박) 규칙 해부

```json
{
  "code": "7995",
  "category": "Betting/Casino Gambling",
  "description": "Gambling transactions including online betting, casinos, lotteries",
  "action": "BLOCK",
  "severity": "CRITICAL",
  "reason": "업무와 무관한 도박성 지출",
  "legal_reference": {
    "law": "법인세법",
    "article": "제27조",
    "description": "업무무관 비용 손금불산입",
    "url": "https://www.law.go.kr/..."
  },
  "network_reference": {
    "source": "VISA",
    "url": "https://usa.visa.com/...",
    "section": "Merchant Category Codes"
  },
  "exception_conditions": []
}
```

#### 필드별 분석

**1. `action: "BLOCK"`**
- 실시간 거래 차단
- 카드 승인 자체를 거부

**2. `severity: "CRITICAL"`**
- 심각도 레벨 설정
- 알림 대상 결정 (직원 + 매니저 + 컴플라이언스팀)

**3. `legal_reference`**
- **핵심:** 모든 규칙은 법적 근거 필수
- 직원에게 거부 사유 설명 시 법 조항 제시
- 감사 시 근거 자료로 사용

**4. `network_reference`**
- MCC 정의의 출처 (Visa, Mastercard 공식 문서)
- MCC 분류가 정확한지 검증 가능

**5. `exception_conditions: []`**
- 예외 없음 (절대 금지)
- 다른 MCC (6051)는 예외 조건 있음

### 2.2 예외 조건이 있는 규칙: MCC 6051 (준현금)

```json
{
  "code": "6051",
  "category": "Quasi-Cash",
  "action": "BLOCK",
  "exception_conditions": [
    {
      "condition": "PRE_APPROVED_BY_CFO",
      "description": "CFO 사전 승인 시 허용 (해외 출장 외화 환전)"
    }
  ]
}
```

**분석:**

준현금(외화, 암호화폐) 거래는 원칙적으로 차단하지만:
- 해외 출장 시 외화 환전 필요
- CFO 사전 승인으로 예외 허용

**개념 포인트 1: 규칙의 우선순위**

```
1. 절대 금지 (exception_conditions: [])
2. 조건부 허용 (예외 조건 있음)
3. 기본 허용 (블랙리스트 아님)
```

---

## 3. 패턴 기반 규칙

> 📂 파일: `blacklist.json` (Line 97-138)

### 3.1 복합 조건 규칙

```json
{
  "pattern_id": "MULTIPLE_GAMBLING",
  "description": "도박 관련 MCC로 2회 이상 거래 시도",
  "conditions": [
    {
      "field": "mcc_code",
      "operator": "IN",
      "value": ["7995"]
    },
    {
      "field": "count",
      "operator": ">=",
      "value": 2,
      "timeframe": "30 days"
    }
  ],
  "action": "BLOCK_AND_ESCALATE",
  "escalation_target": "COMPLIANCE_TEAM"
}
```

**왜 이 규칙이 필요한가?**

시나리오:
```
1/10: MCC 7995 거래 → BLOCK (첫 시도)
1/15: MCC 7995 거래 → BLOCK (두 번째 시도)
      → 패턴 탐지! "의도적 위반" 의심
      → 컴플라이언스팀에 에스컬레이션
```

**개념 포인트 2: 상태 기반(Stateful) 규칙**

```
단일 규칙: 각 거래를 독립적으로 평가
패턴 규칙: 과거 거래 이력과 결합하여 평가
```

패턴 규칙은 **추론**의 한 형태:
- 명시적: "이 거래는 7995"
- 암묵적: "이 직원은 도박 거래를 반복 시도하는 고위험군"

### 3.2 시계열 조건: timeframe

```json
"timeframe": "30 days"
```

**구현 개념:**

```python
# 의사 코드
def check_pattern(transaction):
    recent_gambling = Transaction.query(
        employee_id=transaction.employee_id,
        mcc_code="7995",
        transacted_at__gte=now() - timedelta(days=30)
    )

    if len(recent_gambling) >= 2:
        escalate_to_compliance()
```

**왜 30일인가?**
- 비즈니스 판단: 1개월 이내 재시도는 "의도적"으로 간주
- 조정 가능: JSON 설정만 변경하면 됨

---

## 4. 리스크 스코어링: 규칙의 정량화

> 📂 파일: `rules/scoring.md`

### 4.1 스코어링 프레임워크

```markdown
Final Risk Score = Base Score + MCC Risk + Pattern Modifiers + Context Modifiers - Whitelist Reductions

제약:
- 최소값: 0
- 최대값: 100
```

**왜 0-100 점수 체계인가?**

| 접근 | 장점 | 단점 |
|------|------|------|
| Boolean (사기/정상) | 단순 명확 | 그레이 영역 처리 불가 |
| **0-100 점수** | **세밀한 우선순위** | **임계값 설정 필요** |
| 확률 (0.0-1.0) | 통계적 해석 가능 | 비전문가 이해 어려움 |

**개념 포인트 3: 점수는 "우선순위 큐"**

```
점수 100: 즉시 차단
점수 85: 4시간 내 검토 필요
점수 70: 12시간 내 검토
점수 50: 72시간 내 검토
점수 30: 로그만 기록
점수 0: 정상
```

→ 점수 = **SLA(Service Level Agreement) 매핑**

### 4.2 MCC 리스크 점수 (기본 점수)

> 📂 파일: `scoring.md` (Line 26-58)

```python
def get_mcc_risk_score(mcc_code: str) -> int:
    mcc_data = MCC.get(code=mcc_code)

    if mcc_data.risk_group == "BLACK":
        return 100  # 자동 차단
    elif mcc_data.risk_group == "HIGH_RISK":
        return 40
    elif mcc_data.risk_group == "MEDIUM_RISK":
        return 25
    # ...
```

**분석:**

BLACK (100점)과 HIGH_RISK (40점)의 **60점 차이**가 의미하는 것:
- BLACK: 절대 불가 (예외 없음)
- HIGH_RISK: 맥락에 따라 허용 가능 (유흥이지만 업무 회식)

### 4.3 패턴 가산: 시간대 패턴

> 📂 파일: `scoring.md` (Line 63-98)

```python
def time_pattern_score(transaction: Transaction, employee: Employee) -> int:
    score = 0
    hour = transaction.transacted_at.hour

    # 심야
    if hour >= 22 or hour < 6:
        score += 20

    # 주말
    if day_of_week in [5, 6]:  # Saturday, Sunday
        score += 15

    return score
```

**왜 심야가 +20점인가?**

비즈니스 가정:
- 정상 업무: 09:00-18:00
- 심야 거래: 개인 용도 가능성 높음
- 하지만 +20점만 (절대 차단 아님)
  → 야근 후 저녁 식사 가능성 고려

**개념 포인트 4: 가중치는 비즈니스 경험의 정량화**

```
심야 +20점 = "경험상 심야 거래의 20%는 의심스러움"
주말 +15점 = "경험상 주말 거래의 15%는 의심스러움"
```

가중치 조정 = 기계학습의 "하이퍼파라미터 튜닝"과 유사

### 4.4 맥락 조정: 출장 면제

> 📂 파일: `scoring.md` (Line 209-270)

```python
def context_adjustment_score(...) -> int:
    adjustment = 0

    # 출장 연계
    for trip in transaction.linked_trips:
        if trip.approval_status == "APPROVED":
            adjustment -= 20  # 점수 감소
            if calculate_distance(trip.location, transaction.location) < 10:
                adjustment -= 15  # 추가 감소
            break

    return adjustment
```

**분석:**

```
기본 계산:
심야(+20) + 원거리(+25) = +45점 (ORANGE, 검토 필요)

출장 연계 후:
45 - 20 (출장) - 15 (위치 일치) = +10점 (GREEN, 정상)
```

**개념 포인트 5: 맥락(Context)이 의미를 바꾼다**

```
동일 거래도:
- 맥락 없음: 의심
- 맥락 있음: 정상

→ 온톨로지의 힘: 거래-출장-직원을 연결해 맥락 파악
```

---

## 5. 추론(Reasoning)의 원리

### 5.1 명시적 지식 vs 암묵적 지식

**명시적 지식 (Explicit Knowledge):**
```
MCC 7995는 "도박"이다. (MCC 테이블에 저장)
도박은 블랙리스트다. (blacklist.json에 저장)
```

**암묵적 지식 (Implicit Knowledge):**
```
→ "MCC 7995는 차단해야 한다" (추론으로 도출)
```

**추론 과정:**

```
1. MCC(code="7995", is_gambling=true)           # 사실
2. Blacklist(condition="is_gambling=true",       # 규칙
             action="BLOCK")
3. ∴ Action(mcc="7995", action="BLOCK")         # 결론
```

### 5.2 추론 엔진의 작동 방식

**Forward Chaining (전방 추론):**

```
사실 → 규칙 적용 → 새로운 사실 생성 → 반복

예시:
1. 거래(mcc=7995, amount=100000)
2. 규칙: is_gambling → risk_score += 100
3. 결론: risk_score = 100
4. 규칙: risk_score >= 100 → action = BLOCK
5. 결론: action = BLOCK
```

**Backward Chaining (후방 추론):**

```
목표 → 이를 위한 조건 탐색 → 조건 만족 여부 확인

예시:
목표: "이 거래를 차단해야 하는가?"
← risk_score >= 100인가?
  ← is_gambling인가?
    ← mcc = 7995인가?
      → YES → 차단
```

**현재 프로젝트는 Forward Chaining 사용:**

```python
# scoring.md의 calculate_risk_score 함수
score = get_mcc_risk_score(...)         # 사실 1
score += time_pattern_score(...)        # 규칙 1 적용
score += location_pattern_score(...)    # 규칙 2 적용
# ...
action = get_action_for_score(score)    # 최종 결론
```

### 5.3 SWRL (Semantic Web Rule Language) 스타일 표현

**현재 프로젝트의 규칙을 SWRL로 표현하면:**

```
# 블랙리스트 규칙
Transaction(?t) ∧ belongsTo(?t, ?m) ∧ has(?m, ?mcc) ∧
is_gambling(?mcc, true) → action(?t, "BLOCK")

# 출장 면제 규칙
Transaction(?t) ∧ linkedTo(?t, ?trip) ∧ approved(?trip, true) →
risk_score_adjustment(?t, -20)
```

**개념 포인트 6: 온톨로지 = 데이터 + 규칙 + 추론**

```
관계형 DB: 데이터만
온톨로지: 데이터 + 규칙 + 추론 엔진
        → "지식 시스템"
```

---

## 6. 실제 사례 분석: 3가지 거래 시나리오

> 📂 파일: `scoring.md` (Line 386-448)

### 사례 1: 정상 거래

```
거래:
- 금액: 50,000원
- 가맹점: 스타벅스 (MCC 5814)
- 시간: 14:00 (평일)
- 위치: 사무실 1km

계산:
MCC: 0 (NORMAL)
시간: 0
위치: 0
금액: 0
증빙: 0
맥락: 0

최종: 0점 (GREEN) → 자동 승인
```

### 사례 2: 의심 거래

```
거래:
- 금액: 300,000원
- 가맹점: 룸살롱 (MCC 5813)
- 시간: 23:30 (토요일)
- 위치: 70km, 출장 없음
- 증빙: 미제출 (80시간 경과)

계산:
MCC: +25 (MEDIUM_RISK)
시간: +20 (심야) +15 (주말) = +35
위치: +25 (원거리)
금액: 0
증빙: +40 (미제출)
맥락: 0

최종: 125 → 100 (상한) → BLACK → 즉시 차단
```

**분석:**
- 여러 리스크 요인 결합 → 점수 폭발
- 상한 100점 설정 → 무한대 방지
- 즉시 차단으로 추가 피해 방지

### 사례 3: 출장 관련 거래

```
거래:
- 금액: 150,000원
- 가맹점: 호텔 (MCC 7011)
- 시간: 02:00 (화요일)
- 위치: 부산 (400km)
- 출장: 승인된 부산 출장

계산:
MCC: 0
시간: +20 (심야)
위치: 0 (출장 연결되어 면제)
금액: 0
증빙: 0
맥락: -20 (승인된 출장)

최종: 0점 (GREEN) → 자동 승인
```

**개념 포인트 7: 맥락이 점수를 역전시킨다**

출장 정보 없으면:
```
시간(+20) + 위치(+30, 해외급) = 50점 (ORANGE, 검토 필요)
```

출장 연결 후:
```
0점 (GREEN, 정상)
```

---

## 7. 규칙의 버전 관리

### 7.1 왜 규칙을 버전 관리하는가?

**시나리오:**

```
2025-01-01: 유흥 MCC 리스크 점수 25점
2025-07-01: 법 개정으로 40점으로 상향

질문: 2025-06-15 거래는 어떤 점수로 평가해야 하는가?
답변: 25점 (거래 당시 유효했던 규칙)
```

**개념 포인트 8: 시간 여행(Temporal Reasoning)**

```python
def get_active_policy(date):
    return Policy.query(
        effective_from <= date,
        effective_until >= date OR effective_until IS NULL
    ).first()
```

### 7.2 현재 프로젝트의 버전 관리

> 📂 파일: `entities.md` - Policy 엔터티 (Line 197, 207-209)

```markdown
| `version` | String(20) | ✓ | 버전 | Semantic versioning (예: 2.1.0) |
| `effective_from` | Date | ✓ | 시행일 | - |
| `effective_until` | Date | ○ | 종료일 | null이면 무기한 |
```

**비즈니스 규칙:**
```
동일 시점에 is_active = true인 정책은 1개만 존재
정책 변경 시 이전 버전은 is_active = false로 보관 (삭제 금지)
```

**감사 추적 예시:**

```
2025-01-01 ~ 2025-06-30: Policy v1.0 (유흥 25점)
2025-07-01 ~ 현재:      Policy v2.0 (유흥 40점)

2025-06-15 거래 감사:
  → Policy v1.0 적용 (당시 유효)
  → 리스크 점수 재계산 시 일관성 유지
```

---

## 8. 실습: 규칙 설계

### 과제 1: 새로운 블랙리스트 규칙 추가

**요구사항:**
- MCC 5933 (전당포)를 블랙리스트에 추가
- 법적 근거: 법인세법 제27조
- 예외 조건: 없음

<details>
<summary>💡 답안 (JSON)</summary>

```json
{
  "code": "5933",
  "category": "Pawn Shops",
  "description": "Pawn shops and salvage yards",
  "action": "BLOCK",
  "severity": "CRITICAL",
  "reason": "업무와 무관한 전당포 거래",
  "legal_reference": {
    "law": "법인세법",
    "article": "제27조",
    "description": "업무무관 비용 손금불산입",
    "url": "https://www.law.go.kr/lsLawLinkInfo.do?chrClsCd=010202&lsJoLnkSeq=900178234"
  },
  "network_reference": {
    "source": "VISA",
    "url": "https://usa.visa.com/dam/VCOM/download/merchants/visa-merchant-data-standards-manual.pdf",
    "section": "Merchant Category Codes"
  },
  "exception_conditions": []
}
```
</details>

### 과제 2: 스코어링 로직 설계

**요구사항:**
- "분할 결제" 패턴 탐지
- 30분 내 동일 가맹점 3건 이상
- 각 거래 금액 < 10만원
- 총합 > 30만원
- 리스크 점수 +35

<details>
<summary>💡 답안 (Python 의사 코드)</summary>

```python
def split_payment_score(transaction: Transaction) -> int:
    # 30분 내 동일 가맹점 거래
    recent = get_transactions(
        employee_id=transaction.employee_id,
        merchant_id=transaction.merchant_id,
        time_range=(transaction.transacted_at - timedelta(minutes=30),
                    transaction.transacted_at)
    )

    if len(recent) >= 3:
        # 각 거래 10만원 미만
        if all(t.amount < 100000 for t in recent):
            # 총합 30만원 초과
            if sum(t.amount for t in recent) > 300000:
                return 35

    return 0
```
</details>

### 과제 3: 추론 규칙 작성

**요구사항:**
- 직원이 3개월 내 3회 이상 위반 시 "고위험군" 태그
- 고위험군은 모든 거래에 +15점

<details>
<summary>💡 개념 힌트</summary>

```python
# 추론 단계
1. 직원의 과거 Case 조회
2. 3개월 내 3회 이상 확인
3. Employee에 is_high_risk = true 태그 추가
4. 스코어링 시 is_high_risk 확인 → +15점
```

이것은 **상태 변경(State Mutation)** 추론:
- 입력: 거래 이력
- 추론: 위험 패턴 탐지
- 출력: 엔터티 속성 변경 (is_high_risk)
</details>

---

## 9. 규칙 설계 원칙 정리

### 원칙 1: 모든 규칙은 근거를 명시

```json
"legal_reference": {
  "law": "법인세법",
  "article": "제27조",
  "url": "https://www.law.go.kr/..."
}
```

### 원칙 2: 규칙은 데이터로 관리 (코드 아님)

```
✅ JSON, YAML, DB에 저장
❌ if-elif-else 코드로 하드코딩
```

### 원칙 3: 점수 체계는 비즈니스 우선순위 반영

```
100점: 즉시 차단
70점: 12시간 내 검토
50점: 72시간 내 검토
```

### 원칙 4: 맥락 조정으로 유연성 확보

```
기본 점수 + 패턴 가산 - 맥락 감소
→ 화이트/블랙이 아닌 그레이 처리
```

### 원칙 5: 규칙은 버전 관리 필수

```
effective_from, effective_until로 시간 추적
감사 시 당시 규칙으로 재평가
```

---

## 10. 다음 단계

규칙과 추론의 원리를 이해했습니다. 이제 실제 구현으로 넘어갈 준비가 되었습니다!

**추천 다음 단계:**
1. Neo4j + Cypher로 간단한 그래프 DB 구축
2. Python으로 스코어링 엔진 구현
3. LangChain + Graph RAG 실습

**실무 프로젝트 아이디어:**
- 현재 프로젝트를 실제 Neo4j로 구현
- 블랙리스트 규칙을 JSON에서 로드하는 엔진 작성
- 대시보드로 리스크 점수 시각화

---

## 11. 참고 자료

### 현재 프로젝트 파일
- `projects/01-expense-fraud-detection/rules/blacklist.json`
- `projects/01-expense-fraud-detection/rules/scoring.md`

### 추론 엔진
- Apache Jena (SWRL 지원)
- RDFox (고성능 추론)
- Stardog (기업용)

### 실제 사례
- Statoil: RDFox로 석유 생산 데이터 추론
- EDF: 전력망 규칙 기반 이상 탐지

---

**Last Updated:** 2025-10-20
**Version:** 1.0
**학습 시간:** 약 55분
