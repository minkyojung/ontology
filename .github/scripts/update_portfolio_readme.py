#!/usr/bin/env python3
"""
Portfolio README 자동 업데이트 스크립트

프로젝트 통계와 evals 메트릭을 기반으로 Portfolio README를 자동 생성합니다.
"""

import json
import os
from datetime import datetime
from jinja2 import Template

TEMPLATE = """# Expense Fraud Detection - Ontology-based System

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

- **총 커밋 수**: {{ stats.total_commits }}
- **변경된 파일 수**: {{ stats.files_changed | length }}
- **기여자**: {{ stats.contributors | join(', ') }}

### 작업 분류

| 타입 | 커밋 수 | 비율 |
|------|--------|------|
{% for type, count in stats.commits_by_type.items() %}
| `{{ type }}` | {{ count }} | {{ (count / stats.total_commits * 100) | round(1) }}% |
{% endfor %}

### 최근 커밋

{% for commit in stats.recent_commits[:5] %}
- `{{ commit.hash }}` {{ commit.message }} - {{ commit.author }} ({{ commit.date[:10] }})
{% endfor %}

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

{% if metrics and metrics.precision is defined %}
### 현재 달성 지표

- **탐지율**: Precision {{ "%.2f"|format(metrics.precision) }}, Recall {{ "%.2f"|format(metrics.recall) }}, F1 {{ "%.2f"|format(metrics.f1_score) }}
- **케이스 생성**: {{ metrics.total_cases }}개 자동 생성
- **처리 속도**: 평균 {{ "%.0f"|format(metrics.avg_query_time_ms) }}ms 이내 응답

### 비즈니스 임팩트 (시뮬레이션)

- **예상 복구 금액**: ₩{{ "{:,}".format(metrics.recovery_potential|int) }}
- **케이스 분포**:
  - Flagged: {{ metrics.flagged_cases }}개
  - Under Review: {{ metrics.under_review_cases }}개
  - Approved: {{ metrics.approved_cases }}개
  - Rejected: {{ metrics.rejected_cases }}개
{% else %}
_메트릭 데이터를 생성하려면 `python scripts/07_calculate_evals.py`를 실행하세요._
{% endif %}

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

{% if stats.recent_commits %}
### 최근 활동

{% for commit in stats.recent_commits[:10] %}
- **{{ commit.date[:10] }}** `{{ commit.hash }}` {{ commit.message }}
{% endfor %}
{% endif %}

---

**Last Auto-Updated**: {{ timestamp }}

_이 문서는 [GitHub Actions](.github/workflows/portfolio-auto-gen.yml)를 통해 자동으로 생성됩니다._
"""


def update_readme():
    """Portfolio README 업데이트"""
    # stats.json 읽기
    try:
        with open('portfolio/stats.json', 'r', encoding='utf-8') as f:
            stats = json.load(f)
    except FileNotFoundError:
        print("Warning: portfolio/stats.json not found, using empty stats")
        stats = {
            'total_commits': 0,
            'commits_by_type': {},
            'commits_by_scope': {},
            'files_changed': [],
            'contributors': [],
            'recent_commits': []
        }

    # metrics.json 읽기 (evals 결과)
    try:
        with open('evals/metrics.json', 'r', encoding='utf-8') as f:
            metrics = json.load(f)
    except FileNotFoundError:
        print("Warning: evals/metrics.json not found")
        metrics = None

    # 템플릿 렌더링
    template = Template(TEMPLATE)
    content = template.render(
        stats=stats,
        metrics=metrics,
        timestamp=datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    )

    # 디렉토리 생성
    os.makedirs('portfolio', exist_ok=True)

    # 파일 저장
    with open('portfolio/README.md', 'w', encoding='utf-8') as f:
        f.write(content)

    print("✅ Updated portfolio/README.md")


if __name__ == '__main__':
    update_readme()
