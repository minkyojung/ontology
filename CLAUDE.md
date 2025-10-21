# Claude Code 작업 가이드

## 프로젝트 개요

이 리포지토리는 **온톨로지(Ontology) 기반 시스템 설계** 학습 및 구현을 위한 모노레포입니다.
각 프로젝트는 독립적인 케이스 스터디로, 실무 도메인의 온톨로지 모델링과 구현을 담고 있습니다.

## 디렉토리 구조

```
/
├── CLAUDE.md                    # 본 파일: Claude 작업 규칙
├── projects/                    # 모노레포 프로젝트 디렉토리
│   ├── 01-expense-fraud-detection/
│   │   ├── GUIDE.md            # 프로젝트별 상세 가이드
│   │   ├── ontology/           # 온톨로지 정의 (엔터티, 관계)
│   │   ├── rules/              # 정책 및 룰셋
│   │   ├── workflows/          # 워크플로우 정의
│   │   ├── evals/              # 평가 메트릭 및 테스트
│   │   └── docs/               # 추가 문서 (선택적)
│   └── 02-[next-project]/
└── shared/                      # 공통 유틸리티 (향후)
```

## 브랜치 네이밍 규칙

새 작업 시작 시 항상 브랜치를 먼저 생성하고 이름을 지정합니다:

```bash
git checkout -b <category>/<concise-description>
```

**카테고리:**
- `feature/` - 새로운 기능 추가
- `ontology/` - 온톨로지 설계 및 수정
- `rules/` - 정책/룰셋 추가/수정
- `eval/` - 평가 메트릭 추가/수정
- `docs/` - 문서 작업
- `fix/` - 버그 수정
- `refactor/` - 리팩토링

**예시:**
- `ontology/expense-entities`
- `rules/mcc-blacklist`
- `eval/detection-metrics`

## 작업 프로세스

### 1. 새 프로젝트 시작

```bash
# 1. 브랜치 생성 및 전환
git checkout -b ontology/<project-name>

# 2. 프로젝트 디렉토리 생성
mkdir -p projects/<nn-project-name>/{ontology,rules,workflows,evals}

# 3. GUIDE.md 작성
# projects/<nn-project-name>/GUIDE.md 생성
```

### 2. 온톨로지 설계

**Input:**
- 비즈니스 요구사항 문서
- 도메인 전문가 인터뷰 내용
- 기존 시스템 분석 자료

**Output:**
- `ontology/entities.md` - 핵심 엔터티 정의 (≤10개 권장)
- `ontology/relationships.md` - 엔터티 간 관계
- `ontology/attributes.md` - 각 엔터티의 속성
- `ontology/schema.json` - 기계 판독 가능한 스키마 (선택적)

**작성 원칙:**
- 엔터티는 비즈니스 핵심 개념만 포함
- 관계는 명확하고 단방향 표현 선호
- 속성은 검증 가능하고 측정 가능한 것만

### 3. 룰셋 및 정책 정의

**Input:**
- 법적 근거 (법령, 규정)
- 비즈니스 정책 문서
- 리스크 관리 기준

**Output:**
- `rules/blacklist.md` - 절대 금지 항목 (근거 포함)
- `rules/graylist.md` - 조건부 검토 항목
- `rules/scoring.md` - 리스크 스코어링 로직
- `rules/tax-compliance.md` - 세법/규정 연동 (해당 시)

**작성 원칙:**
- 모든 룰은 **근거 문서 링크** 필수
- 시행일/버전 명시 (법령의 경우)
- 예외 케이스와 화이트리스트 명확히 정의

### 4. 워크플로우 설계

**Output:**
- `workflows/flow.md` - 엔드투엔드 프로세스
- `workflows/decision-tree.md` - 의사결정 트리 (다이어그램)
- `workflows/sop.md` - 운영 표준 절차

### 5. 평가 및 관측성

**Output:**
- `evals/metrics.md` - 핵심 메트릭 정의
- `evals/golden-set.md` - 골든 데이터셋 구성 방법
- `evals/thresholds.md` - 임계값 및 목표치

## 커밋 메시지 규칙

```
<type>(<scope>): <subject>

<body>
```

**타입:**
- `feat` - 새 기능
- `ontology` - 온톨로지 변경
- `rules` - 룰셋 추가/수정
- `eval` - 평가 메트릭 추가/수정
- `docs` - 문서 작업
- `fix` - 버그 수정
- `refactor` - 리팩토링

**예시:**
```
ontology(expense): add Transaction and Merchant entities

- Define 10 core entities for fraud detection
- Add relationships between Transaction, Merchant, and MCC
- Link to Korean tax law (Article 27)
```

## 문서 작성 기준

### 언어
- 프로젝트 가이드: **한국어** (비즈니스 도메인)
- 코드/스키마: **영어** (국제 표준)
- 주석: 맥락에 따라 선택

### 구조
- 모든 GUIDE.md는 다음 섹션 포함:
  1. 프로젝트 목표
  2. 온톨로지 개요
  3. 정책/룰셋
  4. 워크플로우
  5. 평가 기준
  6. 구현 계획 (2주 플랜)
  7. 레퍼런스

### 법적/기술 근거
- 법령/규정: 조문 번호 + URL 링크
- 기술 표준: 공식 문서 링크 (Visa, Mastercard 등)
- 모든 외부 소스는 검증 가능해야 함

## 업데이트 규칙

### CLAUDE.md 업데이트 시점
- 새로운 프로젝트 카테고리 추가 시
- 공통 패턴/규칙 발견 시
- 디렉토리 구조 변경 시
- 작업 프로세스 개선 시

### 프로젝트 GUIDE.md 업데이트
- 온톨로지 변경 시 즉시 반영
- 룰셋 추가/수정 시
- 평가 결과 기반 개선 시

## 코드 리뷰 체크리스트

- [ ] 온톨로지: 엔터티는 10개 이하인가?
- [ ] 룰셋: 모든 룰에 근거 문서가 링크되었는가?
- [ ] 워크플로우: 예외 케이스 처리가 명확한가?
- [ ] 평가: 메트릭이 측정 가능하고 목표치가 있는가?
- [ ] 문서: 타인이 읽고 이해할 수 있는가?
- [ ] 커밋: 메시지가 명확하고 컨벤션을 따르는가?

## 참고 사항

- 온톨로지는 **단순함**이 핵심: 복잡하면 유지보수 불가
- 모든 정책은 **버전 관리**: 법령/규정 변경 추적 필수
- **문서 우선**: 코드 작성 전 GUIDE.md 완성
- **점진적 개선**: v0는 최소 기능, 평가 후 반복

---

**Last Updated:** 2025-10-20
**Version:** 1.0
