# End-to-End Workflow

법인카드 거래 발생부터 최종 정산까지의 전체 워크플로우를 정의합니다.

---

## 워크플로우 개요

```
[거래 발생] → [수집] → [정규화] → [정책 평가] → [HITL 검토] → [정산] → [감사]
```

---

## Phase 1: Ingest (데이터 수집)

### 1.1 실시간 거래 수집

**데이터 소스:**
- 카드사 승인 Webhook (실시간)
- 카드사 매입 배치 파일 (일 1회)
- 영수증 업로드 (모바일 앱/웹)
- 캘린더 API (Google Calendar, Outlook)
- HR 시스템 (조직도, 근무지)

**수집 시점:**
- **승인 시점**: 거래 발생 후 1초 이내 (실시간 차단 필요)
- **매입 시점**: D+1 ~ D+3 (최종 정산 금액)
- **영수증**: 거래 후 72시간 이내 (정책 기한)

**수집 데이터 예시:**
```json
{
  "approval_code": "A12345",
  "amount": 150000,
  "currency": "KRW",
  "transacted_at": "2025-01-15T14:30:00Z",
  "merchant": {
    "name": "스타벅스 강남점",
    "mcc": "5814",
    "location": {"lat": 37.5, "lon": 127.0}
  },
  "card": {
    "card_id": "uuid-123",
    "employee_id": "uuid-emp-456"
  }
}
```

### 1.2 영수증 수집

**방법:**
1. 모바일 앱에서 사진 촬영 → 업로드
2. 이메일 자동 전달 (카드사 → 시스템)
3. 웹 대시보드 수동 업로드

**OCR 처리:**
- 제공자: Google Vision API, Naver Clova OCR
- 추출 항목: 가맹점명, 사업자번호, 금액, 부가세, 발행일
- 처리 시간: <5초

---

## Phase 2: Normalize (데이터 정규화)

### 2.1 표준화

| 항목 | 변환 |
|------|------|
| **통화** | USD, JPY 등 → KRW 환산 (당일 환율) |
| **시간대** | UTC → KST |
| **좌표** | 다양한 포맷 → WGS84 (EPSG:4326) |
| **가맹점명** | "스타벅스강남점" → "스타벅스 강남점" (정규화) |

### 2.2 엔터티 매칭

**가맹점 매칭:**
```python
def match_merchant(merchant_name: str, mcc: str, location: Point) -> UUID:
    """가맹점 이름과 MCC, 위치로 기존 가맹점 매칭 또는 신규 생성"""

    # 1. 정확한 이름 + MCC 매칭
    merchant = Merchant.query.filter_by(name=merchant_name, mcc_id=mcc).first()
    if merchant:
        return merchant.id

    # 2. 유사 이름 + 근거리 (100m 이내)
    similar = find_similar_merchants(merchant_name, location, radius_m=100)
    if similar and similar.mcc_id == mcc:
        return similar.id

    # 3. 신규 가맹점 생성
    new_merchant = Merchant.create(
        name=merchant_name,
        mcc_id=mcc,
        location=location,
        trust_score=50  # 초기 신뢰도
    )
    return new_merchant.id
```

**MCC 검증:**
- MCC 테이블에 존재하지 않는 코드 → 로그 + 기본값(NORMAL) 할당
- 네트워크 문서 업데이트 시 주기적으로 MCC 테이블 갱신

### 2.3 사업자 조회 (한국)

**국세청 API 연동:**
```python
def verify_business_number(business_number: str) -> dict:
    """국세청 API로 사업자등록번호 검증"""
    response = requests.post(
        "https://api.odcloud.kr/api/nts-businessman/v1/status",
        json={"b_no": [business_number]},
        headers={"Authorization": f"Bearer {API_KEY}"}
    )

    data = response.json()
    return {
        "valid": data["status_code"] == "01",  # 01: 계속사업자
        "company_name": data["tax_type"],
        "tax_type": data["tax_type"]
    }
```

---

## Phase 3: Policy Evaluate (정책 평가)

### 3.1 블랙리스트 체크 (실시간)

**처리 시간:** <500ms (승인 결제 차단 필요)

```python
def check_blacklist(transaction: Transaction) -> dict:
    """블랙리스트 MCC 체크"""
    policy = Policy.get_active()
    merchant = Merchant.get(transaction.merchant_id)

    if merchant.mcc_id in policy.blacklist_mccs:
        return {
            "action": "BLOCK",
            "reason": f"금지된 MCC: {merchant.mcc_id}",
            "severity": "CRITICAL",
            "notify": ["EMPLOYEE", "MANAGER", "COMPLIANCE"]
        }

    return {"action": "PASS"}
```

**차단 시 액션:**
1. 거래 상태 → `CANCELLED`
2. 직원에게 푸시 알림 발송
3. 관리자/컴플라이언스 팀에 이메일 발송
4. Case 자동 생성 (severity: CRITICAL)

### 3.2 리스크 스코어 계산

**처리 시간:** <3초 (비실시간 허용)

```python
def evaluate_risk(transaction: Transaction) -> dict:
    """리스크 스코어 계산 및 액션 결정"""

    # 1. 스코어 계산
    score = calculate_risk_score(transaction)
    transaction.risk_score = score
    transaction.save()

    # 2. 액션 결정
    action = get_action_for_score(score)

    # 3. Case 생성 (필요 시)
    if action["create_case"]:
        case = Case.create(
            transaction_id=transaction.id,
            case_type="HIGH_RISK_SCORE",
            severity=action["severity"],
            status="OPEN"
        )

    # 4. 세법 태깅
    apply_tax_tags(transaction)

    return action
```

### 3.3 세법 태깅

```python
def apply_tax_tags(transaction: Transaction):
    """거래에 세법 룰 자동 태깅"""
    merchant = Merchant.get(transaction.merchant_id)
    mcc = MCC.get(merchant.mcc_id)

    tax_rules = TaxRule.query.filter(
        TaxRule.related_mcc_codes.contains([mcc.code])
    ).all()

    tags = []
    for rule in tax_rules:
        # 조건 평가
        if evaluate_tax_conditions(transaction, rule):
            tags.append({
                "rule_id": rule.id,
                "article": f"{rule.law_name} {rule.article_number}",
                "tag": rule.category,
                "url": rule.law_url
            })

    transaction.tax_tags = tags
    transaction.save()
```

---

## Phase 4: HITL Review (사람 검토)

### 4.1 검토 큐 생성

**트리거:**
- 리스크 스코어 ≥ 50
- 그레이 패턴 매칭
- 수동 신고

**큐 할당:**
```python
def assign_reviewer(case: Case) -> UUID:
    """케이스를 적절한 검토자에게 할당"""
    transaction = Transaction.get(case.transaction_id)
    employee = Employee.get(transaction.employee_id)

    if case.severity == "CRITICAL":
        return get_finance_team_lead()
    elif case.severity == "HIGH":
        return get_manager(employee.id)
    else:
        return employee.manager_id  # 직속 상사
```

### 4.2 증빙 요청

**자동 요청 트리거:**
- 10만원 이상, 영수증 미제출 (48시간 경과)
- 그레이 MCC (유흥, 주류)
- 위치 불일치

**요청 템플릿:**
```
[자동 알림]
거래 ID: {transaction_id}
금액: {amount}원
가맹점: {merchant_name}
사유: {reason}

다음 증빙을 72시간 이내 제출해주세요:
- [ ] 영수증 또는 세금계산서
- [ ] 참석자 명단 (해당 시)
- [ ] 업무 관련성 설명

미제출 시 지급이 보류됩니다.
```

### 4.3 검토 프로세스

**단계:**
1. **자동 증빙 매칭**: 제출된 영수증과 거래 금액 비교
2. **사전 승인 확인**: Approval 테이블에서 사전 승인 이력 조회
3. **출장 연계 확인**: Trip/Event와 자동 매칭
4. **수동 판정**: 검토자가 APPROVED / REJECTED 결정

**판정 기준:**
```python
REVIEW_CRITERIA = {
    "APPROVED": [
        "영수증 제출 완료",
        "업무 관련성 명확",
        "사전 승인 존재",
        "출장 일정과 일치"
    ],
    "REJECTED": [
        "업무 무관성 확인",
        "증빙 미제출/불일치",
        "정책 명백히 위반",
        "재범 (3회 이상)"
    ]
}
```

### 4.4 SLA (Service Level Agreement)

| 심각도 | 응답 시간 | 해결 시간 | 초과 시 |
|--------|-----------|-----------|---------|
| CRITICAL | 4시간 | 12시간 | CFO 에스컬레이션 |
| HIGH | 12시간 | 24시간 | Finance 팀장 에스컬레이션 |
| MEDIUM | 24시간 | 72시간 | 알림 발송 |
| LOW | 72시간 | 1주일 | - |

---

## Phase 5: Publish & Post (정산 및 후처리)

### 5.1 분개 처리

```python
def post_to_accounting(transaction: Transaction):
    """거래를 회계 시스템에 분개"""

    # 1. 계정 코드 결정
    account_code = determine_account_code(transaction)

    # 2. 코스트센터 배분
    cost_center = get_cost_center(transaction.employee_id)

    # 3. 분개 생성
    journal_entry = {
        "debit": {
            "account": account_code,
            "amount": transaction.amount,
            "cost_center": cost_center
        },
        "credit": {
            "account": "2020",  # 카드 미지급금
            "amount": transaction.amount
        },
        "memo": f"법인카드 - {transaction.merchant.name}",
        "tax_tags": transaction.tax_tags,
        "vat_deductible": is_vat_deductible(transaction)
    }

    accounting_system.post(journal_entry)
```

**계정 코드 매핑:**
| 용도 | 계정 코드 | 계정명 |
|------|-----------|--------|
| 식사 (내부) | 6030 | 복리후생비 |
| 식사 (외부) | 6050 | 접대비 |
| 교통 | 6040 | 여비교통비 |
| 숙박 | 6040 | 여비교통비 |
| 업무무관 | 9999 | 업무무관비용 (손금불산입) |

### 5.2 세법 처리

```python
def handle_tax_treatment(transaction: Transaction):
    """세법 태그에 따른 회계 처리"""

    for tag in transaction.tax_tags:
        if tag["tag"] == "NON_DEDUCTIBLE_EXPENSE":
            # 손금불산입 → 세무조정 테이블 추가
            tax_adjustment_table.add({
                "transaction_id": transaction.id,
                "adjustment_type": "손금불산입",
                "amount": transaction.amount,
                "law_reference": tag["url"]
            })

        elif tag["tag"] == "VAT_EXCLUSION":
            # 매입세액 불공제 → 부가세 신고서 제외
            transaction.vat_deductible = False
            transaction.save()

        elif tag["tag"] == "ENTERTAINMENT_LIMIT":
            # 접대비 한도 추적
            update_entertainment_limit_tracking(
                transaction.employee_id,
                transaction.amount
            )
```

### 5.3 지급 처리

**지급 시점:**
- Case 없음: 거래 후 D+7 (월 2회 정산)
- Case 해결됨: 해결 후 D+3
- Case 거부됨: 지급 보류

```python
def process_reimbursement(transaction: Transaction):
    """직원에게 지급 처리"""

    # Case 확인
    open_cases = Case.query.filter_by(
        transaction_id=transaction.id,
        status__in=["OPEN", "UNDER_REVIEW"]
    ).all()

    if open_cases:
        return {"status": "HOLD", "reason": "미해결 케이스 존재"}

    # 지급
    payment = {
        "employee_id": transaction.employee_id,
        "amount": transaction.amount,
        "bank_account": get_employee_bank_account(transaction.employee_id),
        "memo": f"법인카드 정산 - {transaction.transacted_at.date()}"
    }

    payroll_system.pay(payment)
    transaction.reimbursed = True
    transaction.save()
```

---

## Phase 6: Observe & Audit (관측 및 감사)

### 6.1 대시보드

**실시간 지표:**
- 오늘의 거래 건수 / 총액
- 차단된 거래 (블랙)
- 검토 중인 케이스 (그레이)
- 미제출 영수증 건수

**월간 리포트:**
- 위반 유형별 Top 10
- 회수액 / 방지액
- 재범자 목록
- 부서별 정책 준수율

### 6.2 감사 로그

**필수 기록 항목:**
```python
AUDIT_LOG_FIELDS = [
    "timestamp",
    "actor_id",           # 누가
    "action",             # 무엇을
    "target_entity",      # 어디에
    "before_state",       # 변경 전
    "after_state",        # 변경 후
    "ip_address",
    "user_agent",
    "reason"              # 이유
]
```

**보관 기간:** 5년 (세법 요구사항)

### 6.3 정기 감사

**주기:** 분기별

**감사 항목:**
1. 블랙리스트 MCC 차단율: 100% 유지
2. 고위험 케이스 해결율: ≥95%
3. 영수증 제출율: ≥90%
4. 세법 태깅 정확도: ≥95%
5. SLA 준수율: ≥90%

---

## Phase 7: Rollback & Appeal (롤백 및 이의신청)

### 7.1 오탐 롤백

**트리거:**
- 검토자가 "정상 거래"로 판정
- 직원 이의신청 승인

**롤백 절차:**
```python
def rollback_case(case: Case, reason: str, rolled_back_by: UUID):
    """케이스 롤백 (오탐 처리)"""

    # 1. Case 상태 변경
    case.status = "RESOLVED"
    case.resolution = "FALSE_POSITIVE"
    case.resolution_notes = reason
    case.resolved_by = rolled_back_by
    case.resolved_at = datetime.now()
    case.save()

    # 2. Transaction 리스크 스코어 재계산
    transaction = Transaction.get(case.transaction_id)
    transaction.risk_score = 0  # 또는 재계산
    transaction.save()

    # 3. 감사 로그 기록
    audit_log.record({
        "action": "CASE_ROLLBACK",
        "case_id": case.id,
        "reason": reason,
        "rolled_back_by": rolled_back_by
    })

    # 4. 직원에게 알림
    notify_employee(transaction.employee_id, "케이스가 해결되었습니다.")
```

### 7.2 이의신청 프로세스

**신청 조건:**
- Case 생성 후 7일 이내
- 1회만 가능

**처리 절차:**
1. **신청 접수**: 직원이 웹/앱에서 사유 작성
2. **2차 검토**: Finance 팀 또는 CFO가 재검토
3. **판정**: APPROVED (롤백) / REJECTED (유지)
4. **통보**: 결과 통보 (이메일 + 푸시)

---

## 워크플로우 상태 다이어그램

```
[거래 발생]
    ↓
[수집·정규화]
    ↓
[블랙 MCC?] ─YES→ [즉시 차단] → [Case 생성] → [종료]
    ↓ NO
[리스크 스코어 계산]
    ↓
[스코어 ≥ 50?] ─NO→ [자동 승인] → [정산] → [종료]
    ↓ YES
[Case 생성]
    ↓
[HITL 검토]
    ├─[APPROVED] → [정산] → [종료]
    ├─[REJECTED] → [지급 보류] → [종료]
    └─[이의신청] → [2차 검토] → [판정] → [종료]
```

---

## 워크플로우 성능 목표

| Phase | 목표 시간 | 현재 (예상) |
|-------|-----------|-------------|
| Ingest | <1초 | 0.5초 |
| Normalize | <2초 | 1초 |
| Policy Evaluate (블랙) | <0.5초 | 0.3초 |
| Policy Evaluate (그레이) | <3초 | 2초 |
| HITL Review | <24시간 | 18시간 (평균) |
| Publish | <5초 | 3초 |

---

**Last Updated:** 2025-10-20
**Version:** 1.0
