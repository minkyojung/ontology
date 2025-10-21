# Risk Scoring Logic

거래의 리스크 점수를 계산하는 알고리즘을 정의합니다. 점수는 0-100 범위이며, 높을수록 위험도가 높습니다.

---

## 1. 기본 스코어링 프레임워크

### 1.1 초기 점수

모든 거래는 **기본 점수 0**에서 시작합니다.

### 1.2 최종 점수

```
Final Risk Score = Base Score + MCC Risk + Pattern Modifiers + Context Modifiers - Whitelist Reductions
```

**제약:**
- 최소값: 0
- 최대값: 100
- 반올림: 정수

---

## 2. MCC 기반 리스크

### 2.1 MCC 리스크 그룹

| Risk Group | Base Score | 예시 MCC |
|------------|-----------|----------|
| BLACK | 100 (즉시 차단) | 7995, 6010, 6011, 6051 |
| HIGH_RISK | 40 | 7273 (유흥) |
| MEDIUM_RISK | 25 | 5813 (주점), 5921 (주류) |
| LOW_RISK | 10 | 5735 (엔터테인먼트) |
| NORMAL | 0 | 5812 (음식점), 5411 (식료품) |
| TRUSTED | -10 | 4411 (선박/항공), 3000-3999 (항공사) |

### 2.2 MCC 스코어 할당 로직

```python
def get_mcc_risk_score(mcc_code: str) -> int:
    """MCC 코드로부터 기본 리스크 점수 반환"""
    mcc_data = MCC.get(code=mcc_code)

    if mcc_data.risk_group == "BLACK":
        return 100  # 자동 차단
    elif mcc_data.risk_group == "HIGH_RISK":
        return 40
    elif mcc_data.risk_group == "MEDIUM_RISK":
        return 25
    elif mcc_data.risk_group == "LOW_RISK":
        return 10
    elif mcc_data.risk_group == "TRUSTED":
        return -10
    else:
        return 0  # NORMAL
```

---

## 3. 패턴 기반 스코어 가산

### 3.1 시간대 패턴

| 패턴 | 조건 | 가산 점수 |
|------|------|-----------|
| 심야 | 22:00 ~ 06:00 | +20 |
| 주말 | 토요일, 일요일 | +15 |
| 공휴일 | 한국 법정 공휴일 | +15 |
| 근무시간 외 | 근무시간 외 (18:00 ~ 09:00) | +10 |

**구현:**
```python
def time_pattern_score(transaction: Transaction, employee: Employee) -> int:
    score = 0
    hour = transaction.transacted_at.hour
    day_of_week = transaction.transacted_at.weekday()

    # 심야
    if hour >= 22 or hour < 6:
        score += 20

    # 주말
    if day_of_week in [5, 6]:  # Saturday, Sunday
        score += 15

    # 공휴일 (별도 함수로 확인)
    if is_korean_holiday(transaction.transacted_at.date()):
        score += 15

    # 근무시간 외 (심야와 중복 방지)
    if 18 <= hour < 22 or 6 <= hour < 9:
        if score < 20:  # 심야가 아닌 경우만
            score += 10

    return score
```

### 3.2 위치 패턴

| 패턴 | 조건 | 가산 점수 |
|------|------|-----------|
| 원거리 | 근무지와 50km 이상, 출장 없음 | +25 |
| 해외 | 국내 근무자의 해외 거래, 출장 없음 | +30 |
| GPS 불일치 | 직원 GPS와 거래 위치 괴리 | +20 |

**구현:**
```python
def location_pattern_score(transaction: Transaction, employee: Employee) -> int:
    score = 0

    if not transaction.location:
        return 0

    # 출장과 연결되어 있으면 면제
    if transaction.linked_trips:
        return 0

    # 근무지와의 거리
    distance_km = calculate_distance(
        employee.office_location,
        transaction.location
    )

    if distance_km > 50:
        score += 25

    # 해외 거래
    if transaction.merchant.country != employee.office_country:
        score += 30

    return score
```

### 3.3 금액 패턴

| 패턴 | 조건 | 가산 점수 |
|------|------|-----------|
| 고액 | 일일 한도의 80% 이상 | +15 |
| 평소 대비 급증 | 30일 평균의 3배 이상 | +20 |
| 분할 결제 | 30분 내 동일 가맹점 3건↑ | +35 |

**구현:**
```python
def amount_pattern_score(transaction: Transaction, employee: Employee) -> int:
    score = 0

    # 고액 (일일 한도 기준)
    if transaction.amount >= employee.spending_limit_daily * 0.8:
        score += 15

    # 평소 대비 급증
    avg_30d = get_average_daily_spending(employee.id, days=30)
    if transaction.amount >= avg_30d * 3:
        score += 20

    # 분할 결제 탐지
    recent_same_merchant = get_transactions(
        employee_id=employee.id,
        merchant_id=transaction.merchant_id,
        time_range=(transaction.transacted_at - timedelta(minutes=30),
                    transaction.transacted_at)
    )
    if len(recent_same_merchant) >= 3:
        score += 35

    return score
```

### 3.4 증빙 패턴

| 패턴 | 조건 | 가산 점수 |
|------|------|-----------|
| 증빙 미제출 | 10만원↑, 72시간 경과 | +40 |
| 증빙 불일치 | 금액 차이 5%↑ | +30 |
| 사업자 미확인 | 공급자 사업자번호 없음 | +15 |

**구현:**
```python
def receipt_pattern_score(transaction: Transaction) -> int:
    score = 0

    # 증빙 미제출
    if transaction.amount >= 100000:
        hours_since = (datetime.now() - transaction.transacted_at).total_seconds() / 3600
        if hours_since > 72 and not transaction.receipts:
            score += 40

    # 증빙 불일치
    for receipt in transaction.receipts:
        if receipt.total_amount:
            diff_pct = abs(receipt.total_amount - transaction.amount) / transaction.amount * 100
            if diff_pct > 5:
                score += 30
                break

    # 사업자 미확인
    if transaction.amount >= 100000:
        if not any(r.supplier_business_number for r in transaction.receipts):
            score += 15

    return score
```

---

## 4. 맥락 기반 스코어 조정

### 4.1 출장 연계

| 조건 | 스코어 조정 |
|------|------------|
| 승인된 출장 일정과 연결 | -20 |
| 출장 목적지 반경 10km 이내 | -15 |
| 출장 예산 범위 내 | -5 |

### 4.2 직원 프로필

| 조건 | 스코어 조정 |
|------|------------|
| 빈번 출장자 (`is_frequent_traveler`) | 시간/위치 패턴 가중치 50% 감소 |
| 영업/해외사업 직무 | 위치 패턴 -10 |
| 임원 (`EXECUTIVE` tier) | 주말/공휴일 패턴 면제 |
| 신입 (입사 3개월 이하) | 전체 패턴 +5 |

### 4.3 가맹점 신뢰도

| 조건 | 스코어 조정 |
|------|------------|
| 화이트리스트 가맹점 | -30 |
| 신뢰도 80↑ | -10 |
| 신뢰도 40↓ | +15 |
| 신규 가맹점 (첫 거래) | +10 |

**구현:**
```python
def context_adjustment_score(
    transaction: Transaction,
    employee: Employee,
    merchant: Merchant
) -> int:
    adjustment = 0

    # 출장 연계
    for trip in transaction.linked_trips:
        if trip.approval_status == "APPROVED":
            adjustment -= 20
            if calculate_distance(trip.location, transaction.location) < 10:
                adjustment -= 15
            break

    # 직원 프로필
    if employee.is_frequent_traveler:
        # 시간/위치 패턴 가중치를 별도로 조정 (여기서는 단순화)
        adjustment -= 10

    if employee.role in ["SALES", "INTERNATIONAL"]:
        adjustment -= 10

    # 가맹점 신뢰도
    if merchant.is_whitelisted:
        adjustment -= 30
    elif merchant.trust_score >= 80:
        adjustment -= 10
    elif merchant.trust_score <= 40:
        adjustment += 15

    return adjustment
```

---

## 5. 종합 스코어링 알고리즘

```python
def calculate_risk_score(transaction: Transaction) -> int:
    """거래의 최종 리스크 점수 계산"""

    # 0. 엔터티 조회
    employee = Employee.get(transaction.employee_id)
    merchant = Merchant.get(transaction.merchant_id)
    mcc = MCC.get(merchant.mcc_id)

    # 1. MCC 기본 점수
    score = get_mcc_risk_score(mcc.code)

    # BLACK MCC는 즉시 100점 반환 (차단)
    if score == 100:
        return 100

    # 2. 패턴 가산
    score += time_pattern_score(transaction, employee)
    score += location_pattern_score(transaction, employee)
    score += amount_pattern_score(transaction, employee)
    score += receipt_pattern_score(transaction)

    # 3. 맥락 조정
    score += context_adjustment_score(transaction, employee, merchant)

    # 4. 범위 제한
    score = max(0, min(100, score))

    return round(score)
```

---

## 6. 임계치 및 액션

| 점수 범위 | 레벨 | 액션 |
|-----------|------|------|
| 0-29 | **GREEN** | 자동 승인, 정상 정산 |
| 30-49 | **YELLOW** | 로그 기록, 자동 승인 |
| 50-69 | **ORANGE** | Case 생성, HITL 검토 필요 |
| 70-84 | **RED** | 거래 보류, 긴급 승인 요청 |
| 85-99 | **CRITICAL** | 거래 보류, 관리자 즉시 통보 |
| 100 | **BLACK** | 즉시 차단 |

**구현:**
```python
def get_action_for_score(score: int) -> dict:
    """점수에 따른 액션 반환"""
    if score >= 100:
        return {
            "level": "BLACK",
            "action": "BLOCK",
            "notify": ["EMPLOYEE", "MANAGER", "COMPLIANCE"],
            "require_approval": False,  # 차단이므로 승인 불가
            "create_case": True,
            "severity": "CRITICAL"
        }
    elif score >= 85:
        return {
            "level": "CRITICAL",
            "action": "HOLD",
            "notify": ["EMPLOYEE", "MANAGER", "CFO"],
            "require_approval": True,
            "create_case": True,
            "severity": "CRITICAL",
            "sla_hours": 4
        }
    elif score >= 70:
        return {
            "level": "RED",
            "action": "HOLD",
            "notify": ["EMPLOYEE", "MANAGER"],
            "require_approval": True,
            "create_case": True,
            "severity": "HIGH",
            "sla_hours": 12
        }
    elif score >= 50:
        return {
            "level": "ORANGE",
            "action": "REVIEW",
            "notify": ["MANAGER"],
            "require_approval": False,
            "create_case": True,
            "severity": "MEDIUM",
            "sla_hours": 72
        }
    elif score >= 30:
        return {
            "level": "YELLOW",
            "action": "LOG",
            "notify": [],
            "require_approval": False,
            "create_case": False,
            "severity": "LOW"
        }
    else:
        return {
            "level": "GREEN",
            "action": "APPROVE",
            "notify": [],
            "require_approval": False,
            "create_case": False,
            "severity": "NONE"
        }
```

---

## 7. 스코어링 예시

### 예시 1: 정상 거래

```
거래:
- 금액: 50,000원
- 가맹점: 스타벅스 (MCC 5814 - 음식점)
- 시간: 14:00 (평일)
- 위치: 사무실 반경 1km

계산:
- MCC 점수: 0 (NORMAL)
- 시간 패턴: 0
- 위치 패턴: 0
- 금액 패턴: 0
- 증빙 패턴: 0
- 맥락 조정: 0

최종 점수: 0 (GREEN) → 자동 승인
```

### 예시 2: 의심 거래

```
거래:
- 금액: 300,000원
- 가맹점: 룸살롱 (MCC 5813 - 주점)
- 시간: 23:30 (토요일)
- 위치: 사무실 70km 거리, 출장 없음
- 증빙: 미제출 (80시간 경과)

계산:
- MCC 점수: 25 (MEDIUM_RISK)
- 시간 패턴: +20 (심야) +15 (주말) = +35
- 위치 패턴: +25 (원거리)
- 금액 패턴: 0
- 증빙 패턴: +40 (미제출)
- 맥락 조정: 0

최종 점수: 25 + 35 + 25 + 40 = 125 → 100 (상한)
실제: 100 (BLACK) → 즉시 차단
```

### 예시 3: 출장 관련 거래

```
거래:
- 금액: 150,000원
- 가맹점: 호텔 (MCC 7011)
- 시간: 02:00 (화요일)
- 위치: 부산 (사무실 400km)
- 출장: 승인된 부산 출장 일정과 연결

계산:
- MCC 점수: 0 (NORMAL)
- 시간 패턴: +20 (심야)
- 위치 패턴: 0 (출장 연결되어 면제)
- 금액 패턴: 0
- 증빙 패턴: 0
- 맥락 조정: -20 (승인된 출장)

최종 점수: 0 + 20 + 0 + 0 - 20 = 0 (GREEN) → 자동 승인
```

---

## 8. 스코어 재계산 트리거

다음 이벤트 발생 시 스코어를 재계산합니다:

1. **증빙 제출**: 미제출 패턴 점수 제거 (-40)
2. **출장 연결**: 위치/시간 패턴 점수 감소
3. **사후 승인**: 전체 점수 재평가
4. **정책 변경**: 활성 정책의 임계치 변경 시

```python
def recalculate_on_event(transaction_id: UUID, event_type: str):
    """이벤트 발생 시 스코어 재계산"""
    transaction = Transaction.get(transaction_id)
    old_score = transaction.risk_score

    new_score = calculate_risk_score(transaction)
    transaction.risk_score = new_score
    transaction.save()

    # 점수가 임계치 아래로 내려가면 Case 자동 해결
    if old_score >= 50 and new_score < 50:
        auto_resolve_cases(transaction_id, reason="Risk score reduced below threshold")

    log_score_change(transaction_id, old_score, new_score, event_type)
```

---

## 9. 머신러닝 향후 확장

현재는 **규칙 기반 스코어링**이지만, 향후 ML 모델로 확장 가능:

1. **Training Data**: 과거 Case의 최종 판정 (FRAUD/LEGITIMATE)
2. **Features**: 위의 모든 패턴 점수를 feature로 사용
3. **Model**: Gradient Boosting (XGBoost, LightGBM)
4. **Ensemble**: 규칙 기반 스코어 × 0.4 + ML 스코어 × 0.6

---

**Last Updated:** 2025-10-20
**Version:** 1.0
