# 프로젝트 01: 법인카드 업무무관 지출 감지 시스템

## 1. 프로젝트 목표

법인카드 거래에서 **업무와 무관한 지출**을 자동으로 탐지하고 차단하는 온톨로지 기반 시스템 설계.

### 핵심 가치
- **사전 차단**: 도박, 현금성 등 블랙리스트 MCC는 실시간 차단
- **자동 케이스화**: 그레이존 거래는 리스크 스코어링 후 검토 큐 생성
- **세법 준수**: 한국 법인세법·부가세법에 따른 손금불산입·불공제 자동 태깅
- **감사 추적**: 모든 판정에 법적 근거와 정책 버전 기록

### 비기능 요구사항
- 실시간 차단: <1초 (승인 시점)
- 사후 케이스 생성: <5분
- 오탐률: 블랙 ≤0.5%, 그레이 ≤10%
- 세법 태깅 정확도: ≥95%

---

## 2. 온톨로지 개요

### 2.1 핵심 엔터티 (10개)

| 엔터티 | 설명 | 주요 속성 |
|--------|------|-----------|
| **Transaction** | 카드 거래 | 금액, 일시, 통화, 승인상태, 카드ID, 가맹점ID, 위치, 전표유형 |
| **Merchant** | 가맹점 | 상호, MCC, 주소/국가, 온·오프라인 여부, 신뢰도 |
| **MCC** | 가맹점 업종 코드 | 4자리 코드, 카테고리, 리스크그룹 (도박/현금성/유흥 등) |
| **Employee** | 사용자(직원) | 부서, 직급, 직무, 근무지 좌표, 근무시간, 출장 빈도, 한도/권한 |
| **Policy** | 정책 | 금지 MCC, 그레이리스트, 시간대/지역 룰, 증빙요건, RBAC |
| **Receipt** | 증빙(영수증) | OCR 결과, 공급자 사업자번호, 부가세 항목, 세금계산서 상태 |
| **Trip/Event** | 업무 맥락 | 출장/회의 일정, 참석자, 목적지 좌표, 캘린더 연동 |
| **Approval** | 승인 기록 | 사전/사후 승인 여부, 결재자, 코멘트, 타임스탬프 |
| **Case** | 위반 사건 | 위반 유형, 근거(법/정책/영수증), 조치(반려/회수/경고), 재발 여부 |
| **TaxRule** | 세법 룰 | 조문(법인세법/부가세법), 시행일, 손금불산입/불공제 항목, URL |

### 2.2 주요 관계

```
Transaction —belongs_to→ Merchant
Merchant —has→ MCC
Transaction —made_by→ Employee
Transaction —has→ Receipt
Transaction —evaluated_by→ Policy
Transaction —linked_to→ Trip/Event
Approval —grants→ Transaction
Case —cites→ TaxRule
Case —relates_to→ Transaction
```

### 2.3 RBAC (역할 기반 접근 제어)

| 역할 | 권한 |
|------|------|
| Employee | 거래 생성, 영수증 제출, 본인 내역 조회 |
| Manager | 팀원 거래 검토, 승인/반려 |
| Finance | 정책 관리, 전체 정산, 세법 태깅 검증 |
| Audit | 전체 감사 로그 열람 (읽기 전용) |

---

## 3. 정책 및 룰셋

### 3.1 블랙리스트 (강제 차단)

| MCC | 유형 | 근거 |
|-----|------|------|
| **7995** | 도박·베팅 (경마/카지노/복권/온라인베팅) | [Visa MCC 문헌](https://usa.visa.com/dam/VCOM/download/merchants/visa-merchant-data-standards-manual.pdf) |
| **6051** | Quasi-cash (외화·가상자산·선불충전) | [Mastercard QRB](https://www.mastercard.us/content/dam/public/mastercardcom/na/global-site/documents/quick-reference-booklet-merchant.pdf) |
| **6010** | Manual Cash Disbursement | [Mastercard TPR](https://www.mastercard.us/content/dam/public/mastercardcom/na/global-site/documents/transaction-processing-rules.pdf) |
| **6011** | ATM 현금인출 | 동일 |

**처리 방식:**
- 승인 시점에 **즉시 차단** 또는 보류 → 최고관리자 승인 큐 이동
- 사후 발견 시 자동 `Case` 생성 + 회수 절차

### 3.2 그레이리스트 (심층 검토)

| 패턴 | 조건 | 스코어 가중치 |
|------|------|---------------|
| **유흥성 MCC** | 7273 (Dating/Escort), 5813 (주점) 등 | +30 |
| **심야/주말** | 근무시간 외 (22:00~06:00, 주말·공휴일) | +20 |
| **위치 불일치** | 직원 GPS/근무지와 50km↑ 괴리, 출장 없음 | +25 |
| **분할 결제** | 30분 내 동일 가맹점 3건↑ (한도 회피 의심) | +35 |
| **영수증 미제출** | 10만원↑ 거래에 영수증 없음 (3일 초과) | +40 |
| **영수증 불일치** | OCR 결과와 거래 금액/가맹점 상이 | +30 |

**임계치:**
- 스코어 ≥50: 자동 `Case` 생성 → HITL 검토
- 스코어 70↑: 즉시 보류 + 긴급 승인 요청

### 3.3 세법 연동 (대한민국)

| 법령 | 조항 | 내용 | 시스템 처리 |
|------|------|------|-------------|
| 법인세법 | [제27조](https://www.law.go.kr/lsLawLinkInfo.do?chrClsCd=010202&lsJoLnkSeq=900178234) | 업무무관 비용 손금불산입 | `Case` 생성 시 조문 링크 자동 첨부 |
| 부가세법 | [제39조](https://www.law.go.kr/LSW//lsLawLinkInfo.do?chrClsCd=010202&lsId=001571&lsJoLnkSeq=900316725&print=print) | 접대비·업무무관 매입세액 불공제 | `Transaction`에 "불공제" 태그 + 회계 모듈 전달 |
| 법인세법 시행령 | 접대비 범위/한도 | 접대비 개념·한도 | 별도 라벨링 + 한도 잔여 표시 |
| 국세청 Q&A | [업무무관 사례](https://call.nts.go.kr/call/qna/selectQnaInfo.do;jsessionid=KhNdr8UqBUj5Ca5u1dGWr86OURzJkKUuKmvDHAxI.nts_call11?ctgId=CTG12027&mi=1647) | 집행 기준 | 교육 규칙 + 케이스 설명문 자동 생성 |

**태깅 로직:**
1. MCC 블랙/그레이 → 자동으로 "업무무관 의심" 태그
2. 접대비 MCC (5812 음식점 등) → "접대비 한도 확인 필요"
3. 면세 품목 구매 → "부가세 불공제"
4. 모든 태그는 `TaxRule.id` + 조문 링크 저장

---

## 4. 워크플로우

### 4.1 엔드투엔드 프로세스

```
1. Ingest (데이터 수집)
   ├─ 카드사 승인/매입 Webhook (실시간)
   ├─ 영수증/전표 OCR
   ├─ 캘린더 API (출장/회의 일정)
   └─ HR 시스템 (조직도/근무지)

2. Normalize (정규화)
   ├─ 통화/시간대 표준화 (KST, KRW 기준)
   ├─ 좌표 정규화 (WGS84)
   ├─ MCC → 리스크그룹 매핑
   └─ 사업자등록 조회 (국세청 API)

3. Policy Evaluate (정책 평가)
   ├─ 블랙 MCC → 즉시 차단 또는 보류
   ├─ 그레이 MCC → 리스크 스코어 계산
   │   └─ 스코어 ≥50 → Case 생성
   └─ 세법 룰 매칭 → TaxRule 태그 부착

4. HITL Review (사람 검토)
   ├─ 자동 증빙 요청 (참석자/계약/회의록)
   ├─ 사전 승인 이력 매칭
   └─ 감점/가점 규칙 (출장 직무 화이트리스트 등)

5. Publish & Post (확정 및 후처리)
   ├─ 분개 처리 (계정 코드: 여비교통비/접대비 등)
   ├─ 코스트센터 배분
   └─ 부가세 공제 가능/불가 태그 회계 모듈 전달

6. Observe & Audit (관측 및 감사)
   ├─ 대시보드 (월별 위반 유형 Top10, 환수액)
   ├─ 그레이→확정 전환율 추적
   └─ 감사 로그 자동 기록 (모든 Case)

7. Rollback & Appeal (롤백 및 이의신청)
   ├─ 오탐 발견 시 관리자 롤백 (사유 필수)
   └─ 이의신청 → 2차 검토 플로우
```

### 4.2 의사결정 트리

```
거래 발생
  ├─ MCC 블랙? YES → [차단] → 관리자 승인 큐
  │              NO ↓
  ├─ 그레이 패턴 검출?
  │   ├─ 스코어 계산
  │   ├─ ≥70? YES → [보류] → 긴급 승인
  │   ├─ ≥50? YES → Case 생성 → HITL 검토
  │   └─ <50? → [통과] → 정상 정산
  └─ 세법 태그 부착 → 회계 모듈
```

---

## 5. 평가 기준 (Evals & Observability)

### 5.1 핵심 메트릭

| 지표 | 정의 | 목표 |
|------|------|------|
| **Precision** (정밀도) | 탐지한 것 중 실제 위반 비율 | ≥90% |
| **Recall** (재현율) | 실제 위반 중 탐지한 비율 | ≥85% |
| **False Positive Rate** | 정상을 위반으로 오판한 비율 | 블랙 ≤0.5%, 그레이 ≤10% |
| **p95 Latency** | 95백분위 처리 시간 | 실시간 <1s, 사후 <300s |
| **Cost per Transaction** | 거래당 분석 비용 (OCR, API 등) | ≤₩100 |
| **Recovery Amount** | 월 회수액/방지액 | 추적 및 누적 |
| **Tax Accuracy** | 세법 태깅의 회계팀 검증 일치율 | ≥95% |
| **Repeat Offender Rate** | 3개월 내 재위반 비율 | ≤5% |

### 5.2 골든 데이터셋

**구성:**
- 과거 6~12개월 법인카드 로그 중 **감사 적발/회수 사례 100~300건**
- 라벨링: `FRAUD` (확정 위반) / `LEGITIMATE` (정상) / `GRAY` (애매)
- 각 케이스에 위반 유형, 근거 법령, 회수 금액 기록

**사용처:**
- Precision/Recall 계산
- 룰 튜닝 (임계치 조정)
- 신규 룰 추가 시 회귀 테스트

### 5.3 임계치

| 지표 | 경고 (Yellow) | 위험 (Red) |
|------|---------------|------------|
| False Positive (블랙) | 0.3% | 0.5% |
| False Positive (그레이) | 7% | 10% |
| p95 Latency (실시간) | 0.8s | 1s |
| p95 Latency (사후) | 240s | 300s |
| Tax Accuracy | 93% | 95% |

---

## 6. 구현 계획 (2주)

### Week 1: 설계 및 데이터 준비

**Day 1-2: 온톨로지 확정**
- [ ] 10개 엔터티 스키마 작성 (`ontology/entities.md`)
- [ ] 관계 정의 (`ontology/relationships.md`)
- [ ] 속성 명세 (`ontology/attributes.md`)

**Day 3-4: 정책 테이블**
- [ ] 블랙 MCC 리스트 (7995, 6051, 6010, 6011) + 근거 링크
- [ ] 그레이 MCC 리스트 + 스코어링 가중치
- [ ] 세법 룰 스냅샷 (법인세법 §27, 부가세법 §39) → `rules/`

**Day 5: 골든셋 구성**
- [ ] 과거 감사 사례 100건 수집
- [ ] 라벨링 (FRAUD/LEGITIMATE/GRAY)
- [ ] `evals/golden-set.json` 작성

### Week 2: v0 구현 및 평가

**Day 6-7: 규칙 엔진 (블랙/그레이)**
- [ ] MCC 블랙 즉시 차단 로직
- [ ] 그레이 스코어링 (시간/위치/금액/영수증)
- [ ] 임계치 기반 Case 생성

**Day 8: 세법 태깅**
- [ ] `Transaction` → `TaxRule` 매핑
- [ ] "손금불산입", "불공제" 자동 라벨링
- [ ] 조문 링크 자동 부착

**Day 9: Evals 대시보드**
- [ ] Precision/Recall 계산
- [ ] p95 Latency 측정
- [ ] 오탐률, 회수액 추정치

**Day 10: 문서화 및 SOP**
- [ ] 사전승인·사후증빙·이의신청 절차 문서
- [ ] 감사 로그 필수 필드 정의
- [ ] 운영 매뉴얼 (`workflows/sop.md`)

---

## 7. 구현 팁 (강한 의견)

### 7.1 MCC가 코어 키
- 네트워크 공식 문헌을 **근거 링크**로 반드시 남길 것
- 특히 7995(도박), 6051(Quasi-cash)는 법적 방어력 확보를 위해 필수

### 7.2 세법은 "조문-시행일-스냅샷"
- 모든 `TaxRule`에 **조문 번호 + URL + 시행일** 기록
- 보고서·케이스에 자동 표기 → 감사에 강함

### 7.3 그레이는 "맥락 결합"
- 단일 신호보다 **복합 패턴** (심야 + 위치 불일치 + 영수증 없음)이 정확도 ↑
- 가중치는 골든셋 기반으로 튜닝

### 7.4 오탐 줄이는 장치
- 빈번 출장 직무(영업/해외사업) **화이트리스트**
- 특정 벤더(예: 회사 지정 호텔) 화이트리스트
- 출장 일정 캘린더 자동 매칭

### 7.5 부가세 처리
- 접대비·업무무관·면세 → **매입세액 불공제 자동 태그**
- 회계 모듈에 넘겨 정산 시 자동 제외

---

## 8. 레퍼런스

### 법령
- [법인세법 제27조 (업무무관 비용 손금불산입)](https://www.law.go.kr/lsLawLinkInfo.do?chrClsCd=010202&lsJoLnkSeq=900178234)
- [부가가치세법 제39조 (공제하지 아니하는 매입세액)](https://www.law.go.kr/LSW//lsLawLinkInfo.do?chrClsCd=010202&lsId=001571&lsJoLnkSeq=900316725&print=print)
- [법인세법 시행령 (접대비 범위/한도)](https://www.law.go.kr/lsEfInfoP.do?lsiSeq=19659)
- [국세청 Q&A - 업무무관 비용](https://call.nts.go.kr/call/qna/selectQnaInfo.do;jsessionid=KhNdr8UqBUj5Ca5u1dGWr86OURzJkKUuKmvDHAxI.nts_call11?ctgId=CTG12027&mi=1647)

### 카드 네트워크 표준
- [Visa Merchant Data Standards Manual](https://usa.visa.com/dam/VCOM/download/merchants/visa-merchant-data-standards-manual.pdf)
- [Mastercard Quick Reference Booklet](https://www.mastercard.us/content/dam/public/mastercardcom/na/global-site/documents/quick-reference-booklet-merchant.pdf)
- [Mastercard Transaction Processing Rules](https://www.mastercard.us/content/dam/public/mastercardcom/na/global-site/documents/transaction-processing-rules.pdf)

### 추가 자료
- [High-Risk MCCs](https://blog.basistheory.com/high-risk-mccs)

---

**프로젝트 시작일:** 2025-10-20
**버전:** 1.0
**담당:** Ontology Learning Project
