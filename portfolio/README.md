# Expense Fraud Detection - Ontology-based System

> **프로젝트 기간**: 2025-10 ~ 현재
> **목표**: 법인카드 부정사용 탐지 시스템을 온톨로지 기반으로 설계 및 구현

## 🎯 프로젝트 개요

이 프로젝트는 **SK AX/Palantir Foundry 스타일의 온톨로지 기반 데이터 플랫폼**을 구축하여,
법인카드 거래 데이터에서 사기 패턴을 탐지하고 자동으로 케이스를 생성하는 시스템입니다.

### 핵심 기술 스택

- **그래프 데이터베이스**: Neo4j (Ontology 구현)
- **백엔드**: Python (Neo4j Driver, Data Pipeline)
- **프론트엔드**: Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui
- **ML/AI**: scikit-learn (Anomaly Detection), PyTorch Geometric (GNN, 예정)
- **인프라**: Docker, GitHub Actions

---

## 📊 프로젝트 통계 (자동 생성)

**최근 30일 활동:**

- **총 커밋 수**: 16
- **변경된 파일 수**: 91
- **기여자**: William

### 작업 분류

| 타입 | 커밋 수 | 비율 |
|------|--------|------|

| `feat` | 8 | 50.0% |

| `perf` | 1 | 6.2% |

| `fix` | 1 | 6.2% |

| `chore` | 1 | 6.2% |

| `data` | 1 | 6.2% |

| `docs` | 2 | 12.5% |

| `ontology` | 1 | 6.2% |


### 최근 커밋


- `746d862` feat(reports): add reporting and performance tracking system - William (2025-10-20)

- `82dea28` feat(cases): add case management UI with actions - William (2025-10-20)

- `e1e3320` feat(evals): add evaluation metrics dashboard - William (2025-10-20)

- `5653460` perf(neo4j): add performance optimization script - William (2025-10-20)

- `99e0c33` fix(dashboard): resolve Neo4j DateTime serialization error - William (2025-10-20)


---

## 🏗️ 시스템 아키텍처

### Ontology Design

핵심 엔터티 10개로 비즈니스 도메인 모델링:

1. **Transaction** - 법인카드 거래
2. **Merchant** - 가맹점
3. **MCC** (Merchant Category Code) - 업종 분류
4. **Employee** - 직원
5. **TaxRule** - 세법 규정
6. **FraudCase** - 사기 의심 케이스
7. **Alert** - 실시간 알림 (예정)
8. **AuditLog** - 감사 로그 (예정)
9. **Rule** - 탐지 룰 (예정)
10. **Report** - 리포트

### 데이터 파이프라인

```
Raw Data (CSV)
  → Neo4j Ingestion
  → Ontology Enrichment (MCC, TaxRule)
  → Rule Engine (Blacklist, Velocity Check)
  → Case Generation
  → Dashboard Visualization
```

---

## 🚀 주요 기능

### 1. 실시간 사기 탐지
- MCC 블랙리스트/그레이리스트 기반 필터링
- 속도 이상 탐지 (단기간 다량 거래)
- 패턴 기반 이상 거래 탐지

### 2. 케이스 관리 시스템
- 케이스 승인/거부/보류 워크플로우
- 관련 거래 및 엔터티 자동 연결
- 복구 가능 금액 계산

### 3. 평가 메트릭 대시보드
- Precision, Recall, F1 Score
- Confusion Matrix
- MCC별 탐지 성과
- Golden Set 기반 평가

### 4. 보고서 생성
- 월별/분기별 사기 탐지 리포트
- 룰 효과성 분석 및 최적화 제안
- 성과 추적 대시보드

---

## 📈 성과 및 임팩트


_메트릭 데이터를 생성하려면 `python scripts/07_calculate_evals.py`를 실행하세요._


---

## 🎓 학습 및 적용 기술

### Palantir Foundry 스타일 구현

1. **Ontology-as-Code**: Neo4j Cypher를 활용한 선언적 데이터 모델 정의
2. **Data Lineage**: 모든 데이터 변환 이력 추적 (예정)
3. **Alerting Workflow**: 이벤트 기반 자동 케이스 생성
4. **Explainability**: 각 탐지 결과의 근거 시각화

### 한국 도메인 특화

- 국세청 법인세법 제27조 (접대비 한도) 반영
- 한국 카드사 MCC 코드 표준 적용
- 홈택스 API 연동 (계획)

---

## 📂 프로젝트 구조

```
.
├── ontology/               # 온톨로지 정의
├── rules/                  # 정책 및 룰셋
├── scripts/                # 데이터 파이프라인
│   ├── 01_setup_neo4j.py
│   ├── 05_generate_test_data.py
│   ├── 07_calculate_evals.py
│   └── 08_generate_reports.py
├── dashboard/              # Next.js 대시보드
│   ├── app/
│   │   ├── dashboard/     # 메인 대시보드
│   │   ├── transactions/  # 거래 뷰
│   │   ├── cases/         # 케이스 관리
│   │   ├── evals/         # 평가 메트릭
│   │   ├── reports/       # 리포트
│   │   └── performance/   # 성과 추적
│   └── components/
├── evals/                  # 평가 메트릭
├── reports/                # 생성된 리포트
└── portfolio/              # 자동 생성 포트폴리오
    ├── README.md (이 파일)
    └── weekly/             # 주간 리포트
```

---

## 🔗 관련 링크

- [GitHub Repository](https://github.com/minkyojung/ontology)
- [프로젝트 가이드](../projects/01-expense-fraud-detection/GUIDE.md)
- [Changelog](./CHANGELOG.md)
- [주간 리포트](./weekly/)

---

## 📝 개발 로그


### 최근 활동


- **2025-10-20** `746d862` feat(reports): add reporting and performance tracking system

- **2025-10-20** `82dea28` feat(cases): add case management UI with actions

- **2025-10-20** `e1e3320` feat(evals): add evaluation metrics dashboard

- **2025-10-20** `5653460` perf(neo4j): add performance optimization script

- **2025-10-20** `99e0c33` fix(dashboard): resolve Neo4j DateTime serialization error

- **2025-10-20** `ae882e7` feat(dashboard): enhance transaction view with MCC and TaxRule info

- **2025-10-20** `6b46965` feat(test): add comprehensive test data generation script

- **2025-10-20** `88f0064` chore: add utility scripts and documentation

- **2025-10-20** `d612249` feat(dashboard): add Next.js dashboard with Neo4j integration

- **2025-10-20** `c933d27` feat(fraud): add fraud detection and risk scoring logic



---

**Last Auto-Updated**: 2025-10-20 15:52:29

_이 문서는 [GitHub Actions](.github/workflows/portfolio-auto-gen.yml)를 통해 자동으로 생성됩니다._