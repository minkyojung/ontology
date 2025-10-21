# Evaluation Metrics

시스템의 성능을 측정하고 평가하기 위한 메트릭을 정의합니다.

---

## 1. 탐지 정확도 메트릭

### 1.1 Precision (정밀도)

**정의:** 시스템이 "위반"으로 판정한 것 중 실제로 위반인 비율

```
Precision = True Positives / (True Positives + False Positives)
```

**목표:** ≥90%

**의미:**
- 높을수록 오탐(False Positive)이 적음
- 직원 불만 감소, 검토 효율 증가

**측정 방법:**
```python
def calculate_precision(period_days=30):
    """지난 N일간의 정밀도 계산"""

    # 시스템이 위반으로 판정한 케이스
    flagged_cases = Case.query.filter(
        Case.detected_at >= datetime.now() - timedelta(days=period_days),
        Case.status.in_(["RESOLVED", "CLOSED"])
    ).all()

    true_positives = sum(1 for c in flagged_cases if c.resolution == "REJECTED")
    false_positives = sum(1 for c in flagged_cases if c.resolution == "APPROVED")

    if len(flagged_cases) == 0:
        return None

    return true_positives / len(flagged_cases)
```

### 1.2 Recall (재현율)

**정의:** 실제 위반 중 시스템이 탐지한 비율

```
Recall = True Positives / (True Positives + False Negatives)
```

**목표:** ≥85%

**의미:**
- 높을수록 놓친 위반(False Negative)이 적음
- 리스크 관리 효과 증대

**측정 방법:**
```python
def calculate_recall(golden_set):
    """골든 데이터셋 기반 재현율 계산"""

    # 골든 데이터셋: 실제 위반 거래 목록
    actual_frauds = [t for t in golden_set if t.label == "FRAUD"]

    # 시스템이 탐지한 건수
    detected = sum(1 for t in actual_frauds if was_detected_by_system(t.id))

    return detected / len(actual_frauds)
```

### 1.3 F1 Score

**정의:** Precision과 Recall의 조화 평균

```
F1 = 2 * (Precision * Recall) / (Precision + Recall)
```

**목표:** ≥87%

**의미:** 정밀도와 재현율의 균형 지표

### 1.4 False Positive Rate (오탐률)

**정의:** 정상 거래를 위반으로 잘못 판정한 비율

**블랙리스트:**
```
FPR_Black = False Positives_Black / All_Blocked_Transactions
```
**목표:** ≤0.5%

**그레이리스트:**
```
FPR_Gray = False Positives_Gray / All_Flagged_Transactions
```
**목표:** ≤10%

**측정 방법:**
```python
def calculate_fpr_by_level():
    """레벨별 오탐률 계산"""

    results = {}

    for level in ["BLACK", "GRAY"]:
        cases = Case.query.filter(
            Case.severity == ("CRITICAL" if level == "BLACK" else "MEDIUM"),
            Case.status == "RESOLVED"
        ).all()

        false_positives = sum(1 for c in cases if c.resolution == "APPROVED")
        total = len(cases)

        results[level] = {
            "fpr": false_positives / total if total > 0 else 0,
            "false_positives": false_positives,
            "total": total
        }

    return results
```

---

## 2. 성능 메트릭

### 2.1 Latency (지연 시간)

**p50 (중앙값):**
- 실시간 차단 (블랙): <300ms
- 사후 케이스 생성 (그레이): <2초

**p95 (95백분위):**
- 실시간 차단: <1초
- 사후 케이스 생성: <5분

**p99 (99백분위):**
- 실시간 차단: <2초
- 사후 케이스 생성: <10분

**측정 방법:**
```python
def calculate_latency_percentiles(operation_type):
    """지연 시간 백분위 계산"""

    logs = PerformanceLog.query.filter_by(
        operation=operation_type,
        timestamp >= datetime.now() - timedelta(days=7)
    ).all()

    latencies = [log.latency_ms for log in logs]

    return {
        "p50": np.percentile(latencies, 50),
        "p95": np.percentile(latencies, 95),
        "p99": np.percentile(latencies, 99),
        "mean": np.mean(latencies),
        "max": max(latencies)
    }
```

### 2.2 Throughput (처리량)

**목표:**
- 초당 거래 처리: ≥100 TPS (Transactions Per Second)
- 일일 거래 처리: ≥100,000건

### 2.3 Availability (가용성)

**목표:** 99.9% (월 43분 이하 다운타임)

**측정:**
```python
def calculate_availability(period_days=30):
    """가용성 계산"""

    total_minutes = period_days * 24 * 60
    downtime_minutes = Incident.query.filter(
        Incident.resolved_at >= datetime.now() - timedelta(days=period_days)
    ).sum(lambda i: (i.resolved_at - i.occurred_at).total_seconds() / 60)

    uptime_pct = (total_minutes - downtime_minutes) / total_minutes * 100
    return uptime_pct
```

---

## 3. 비즈니스 메트릭

### 3.1 회수액 / 방지액

**정의:**
- **회수액**: 위반 거래로 판정되어 직원으로부터 회수한 금액
- **방지액**: 블랙 MCC 차단으로 미연에 방지한 금액

**목표:** 월 ≥₩10,000,000 (시스템 ROI 입증)

**측정 방법:**
```python
def calculate_recovery_prevention_amount(period_days=30):
    """회수액 및 방지액 계산"""

    start_date = datetime.now() - timedelta(days=period_days)

    # 회수액
    recovered = Case.query.filter(
        Case.resolution == "RECOVERED",
        Case.resolved_at >= start_date
    ).sum(lambda c: c.amount_recovered)

    # 방지액 (차단된 블랙 MCC 거래)
    prevented = Transaction.query.filter(
        Transaction.status == "CANCELLED",
        Transaction.risk_score == 100,
        Transaction.transacted_at >= start_date
    ).sum(lambda t: t.amount)

    return {
        "recovered": recovered,
        "prevented": prevented,
        "total": recovered + prevented
    }
```

### 3.2 케이스 전환율

**정의:** 그레이 케이스 중 실제 위반으로 확정된 비율

```
Conversion Rate = Cases_Rejected / Cases_Total
```

**목표:** 30-50% (너무 높으면 임계치 너무 낮음, 너무 낮으면 오탐 많음)

### 3.3 재범률

**정의:** 3개월 내 동일 직원의 재위반 비율

```
Repeat Offender Rate = Repeat_Offenders / Total_Offenders
```

**목표:** ≤5%

**측정 방법:**
```python
def calculate_repeat_offender_rate():
    """재범률 계산"""

    # 3개월 내 위반자
    offenders = set(
        Case.query.filter(
            Case.resolution == "REJECTED",
            Case.resolved_at >= datetime.now() - timedelta(days=90)
        ).values(Case.employee_id)
    )

    # 재범자 (2회 이상)
    repeat_offenders = set()
    for emp_id in offenders:
        case_count = Case.query.filter(
            Case.employee_id == emp_id,
            Case.resolution == "REJECTED",
            Case.resolved_at >= datetime.now() - timedelta(days=90)
        ).count()

        if case_count >= 2:
            repeat_offenders.add(emp_id)

    return len(repeat_offenders) / len(offenders) if offenders else 0
```

---

## 4. 운영 메트릭

### 4.1 SLA 준수율

**정의:** SLA 내에 처리된 케이스 비율

```
SLA Compliance Rate = Cases_Within_SLA / Total_Cases
```

**목표:** ≥90%

**SLA 기준:**
| 심각도 | 응답 시간 | 해결 시간 |
|--------|-----------|-----------|
| CRITICAL | 4시간 | 12시간 |
| HIGH | 12시간 | 24시간 |
| MEDIUM | 24시간 | 72시간 |

**측정 방법:**
```python
def calculate_sla_compliance():
    """SLA 준수율 계산"""

    cases = Case.query.filter(
        Case.status == "RESOLVED"
    ).all()

    sla_met = 0
    for case in cases:
        response_time = (case.first_reviewed_at - case.detected_at).total_seconds() / 3600
        resolution_time = (case.resolved_at - case.detected_at).total_seconds() / 3600

        sla = get_sla_for_severity(case.severity)

        if response_time <= sla["response_hours"] and resolution_time <= sla["resolution_hours"]:
            sla_met += 1

    return sla_met / len(cases) if cases else 0
```

### 4.2 영수증 제출율

**정의:** 영수증 필수 거래 중 기한 내 제출된 비율

```
Receipt Submission Rate = Receipts_Submitted_On_Time / Receipts_Required
```

**목표:** ≥90%

**측정 방법:**
```python
def calculate_receipt_submission_rate():
    """영수증 제출율 계산"""

    # 영수증 필수 거래 (10만원 이상)
    required_txns = Transaction.query.filter(
        Transaction.amount >= 100000,
        Transaction.transacted_at >= datetime.now() - timedelta(days=30)
    ).all()

    on_time = 0
    for txn in required_txns:
        receipt = Receipt.query.filter_by(transaction_id=txn.id).first()
        if receipt:
            hours_diff = (receipt.submitted_at - txn.transacted_at).total_seconds() / 3600
            if hours_diff <= 72:  # 정책 기한
                on_time += 1

    return on_time / len(required_txns) if required_txns else 0
```

### 4.3 검토 효율

**정의:** 검토자 1인당 일일 처리 건수

**목표:** ≥20건/일

---

## 5. 세법 준수 메트릭

### 5.1 세법 태깅 정확도

**정의:** 자동 태깅 결과와 회계팀 수동 검증 결과의 일치율

```
Tax Tagging Accuracy = Matching_Tags / Total_Sampled
```

**목표:** ≥95%

**측정 방법:**
```python
def calculate_tax_accuracy(sample_size=100):
    """세법 태깅 정확도 계산"""

    # 무작위 샘플링
    sample = Transaction.query.order_by(func.random()).limit(sample_size).all()

    matches = 0
    for txn in sample:
        auto_tags = set(tag["tag"] for tag in txn.tax_tags)
        manual_tags = set(get_manual_tax_review(txn.id))  # 회계팀 검증

        if auto_tags == manual_tags:
            matches += 1

    return matches / sample_size
```

### 5.2 손금불산입 금액

**정의:** 법인세법 제27조 적용 거래의 월별 총액

**목표:** 추적 및 보고 (목표값 없음, 낮을수록 좋음)

---

## 6. 대시보드 지표

### 실시간 지표 (갱신 주기: 1분)

```python
REAL_TIME_METRICS = {
    "transactions_today": "오늘의 거래 건수",
    "amount_today": "오늘의 거래 총액",
    "blocked_today": "오늘 차단된 거래 (블랙)",
    "cases_open": "검토 대기 중 케이스",
    "sla_at_risk": "SLA 위험 케이스 (4시간 내 응답 필요)"
}
```

### 일일 지표

```python
DAILY_METRICS = {
    "precision": "정밀도",
    "recall": "재현율",
    "fpr_black": "블랙 오탐률",
    "fpr_gray": "그레이 오탐률",
    "latency_p95": "p95 지연 시간",
    "receipt_submission_rate": "영수증 제출율",
    "recovery_amount": "회수액"
}
```

### 월간 지표

```python
MONTHLY_METRICS = {
    "total_transactions": "총 거래 건수",
    "total_amount": "총 거래 금액",
    "cases_created": "생성된 케이스",
    "cases_resolved": "해결된 케이스",
    "recovery_prevention_total": "회수액 + 방지액",
    "repeat_offender_rate": "재범률",
    "sla_compliance": "SLA 준수율",
    "tax_accuracy": "세법 태깅 정확도"
}
```

---

## 7. 알림 임계치

| 메트릭 | 경고 (Yellow) | 위험 (Red) | 액션 |
|--------|---------------|------------|------|
| Precision | <92% | <90% | 정책 리뷰 회의 |
| Recall | <87% | <85% | 임계치 낮추기 검토 |
| FPR (블랙) | >0.3% | >0.5% | 블랙리스트 재검토 |
| FPR (그레이) | >7% | >10% | 스코어링 가중치 조정 |
| Latency p95 (실시간) | >0.8s | >1s | 인프라 스케일업 |
| SLA Compliance | <92% | <90% | 인력 증원 검토 |
| Tax Accuracy | <97% | <95% | 룰 재검토 |

---

## 8. A/B 테스트 프레임워크

### 8.1 테스트 시나리오 예시

**가설:** 그레이 임계치를 50 → 60으로 상향하면 오탐률이 감소할 것

**실험 설계:**
- **Control Group (A)**: 임계치 50 (기존)
- **Treatment Group (B)**: 임계치 60 (신규)
- 샘플 크기: 각 1,000건
- 기간: 1주일

**측정 지표:**
- 오탐률 (FPR)
- 재현율 (Recall)
- 케이스 생성 건수

**통계적 유의성:**
- p-value < 0.05 (95% 신뢰 수준)

### 8.2 구현

```python
def ab_test_risk_threshold():
    """리스크 임계치 A/B 테스트"""

    # 트래픽 50%씩 분할
    transactions = get_recent_transactions(days=7)

    group_a = [t for t in transactions if hash(t.id) % 2 == 0]
    group_b = [t for t in transactions if hash(t.id) % 2 == 1]

    # Group A: 기존 임계치 50
    results_a = evaluate_with_threshold(group_a, threshold=50)

    # Group B: 신규 임계치 60
    results_b = evaluate_with_threshold(group_b, threshold=60)

    # 통계 분석
    from scipy import stats
    t_stat, p_value = stats.ttest_ind(
        results_a["fpr_list"],
        results_b["fpr_list"]
    )

    return {
        "group_a": results_a,
        "group_b": results_b,
        "p_value": p_value,
        "significant": p_value < 0.05
    }
```

---

## 9. 메트릭 수집 스택

```
[Transaction/Case Events]
         ↓
   [Event Stream (Kafka)]
         ↓
   [Metric Aggregator]
         ↓
   [Time-Series DB (InfluxDB/Prometheus)]
         ↓
   [Dashboard (Grafana)]
```

---

## 10. 보고 주기

| 대상 | 주기 | 내용 |
|------|------|------|
| Finance Team | 일일 | 케이스 현황, SLA 위험 |
| 경영진 | 주간 | 회수액, 오탐률, 주요 사건 |
| CFO | 월간 | 전체 지표, 정책 효과, ROI |
| 이사회 | 분기 | 감사 결과, 리스크 트렌드 |

---

**Last Updated:** 2025-10-20
**Version:** 1.0
