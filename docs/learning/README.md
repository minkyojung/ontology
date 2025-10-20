# 온톨로지 학습 가이드

> **역방향 학습 접근**: 실제 프로젝트를 분석하면서 개념을 이해하는 실무 중심 학습 경로

---

## 📚 학습 개요

이 학습 가이드는 현재 진행 중인 **법인카드 사기 탐지 온톨로지 프로젝트**를 분석하면서 온톨로지, 지식그래프, 추론 엔진의 핵심 개념을 이해하도록 설계되었습니다.

### 왜 "역방향 학습"인가?

**전통적 학습 (이론 → 실습):**
```
OWL/RDF 표준 공부 → 예제 따라하기 → 프로젝트 적용 (?)
```
문제: 실제 프로젝트와 괴리, 동기부여 낮음

**역방향 학습 (프로젝트 → 개념):**
```
실제 프로젝트 분석 → "왜 이렇게 설계했지?" → 개념 이해 → 즉시 적용
```
장점: 맥락 이해, 높은 동기부여, 실무 직결

---

## 🎯 학습 목표

이 가이드를 완료하면:

1. ✅ **온톨로지 설계 원칙** 이해 (엔터티, 관계, 속성)
2. ✅ **그래프 사고방식** 습득 (관계형 DB vs 그래프 DB)
3. ✅ **규칙과 추론** 원리 파악 (선언적 규칙, 스코어링, 추론 엔진)
4. ✅ **실무 적용 능력** (Neo4j, Cypher, Python으로 구현 가능)
5. ✅ **대기업 입사 준비** (Palantir, 컨설팅, 금융권 역량)

---

## 📖 학습 경로

### Phase 1: 온톨로지 기초 (~45분)

**문서:** `01-ontology-fundamentals.md`

**핵심 질문:**
- 온톨로지가 일반 데이터 모델링과 다른 점은?
- 엔터티는 어떻게 설계하는가?
- 속성의 제약조건이 비즈니스 규칙과 어떻게 연결되는가?

**실제 분석 대상:**
- Transaction, Merchant, MCC, Employee 등 10개 엔터티
- 각 엔터티의 속성, 제약조건, 비즈니스 규칙

**학습 성과:**
- "왜 MCC를 Merchant에서 분리했는가?" 같은 설계 결정 이해
- 필수/선택 속성의 기준 파악
- 엔터티의 라이프사이클 표현 방법

**실습 과제:**
- Employee 엔터티 분석
- TaxRule 엔터티의 버전 관리 이해

---

### Phase 2: 관계와 그래프 (~50분)

**문서:** `02-relationships-and-graphs.md`

**핵심 질문:**
- 관계형 사고와 그래프 사고의 차이는?
- N:1, 1:N, N:N 카디널리티의 실제 의미는?
- 그래프 순회(Traversal)로 어떤 문제를 해결할 수 있는가?

**실제 분석 대상:**
- Transaction → Merchant → MCC 체인 관계
- Transaction ↔ Trip N:N 관계
- Case → Case 재귀 관계

**학습 성과:**
- Cypher 쿼리 기초 문법 습득
- CASCADE vs RESTRICT 삭제 정책의 비즈니스 의미
- 경로(Path) 쿼리의 직관성 이해

**실습 과제:**
- "의심스러운 거래" 탐지 쿼리 작성 (SQL vs Cypher 비교)
- 재범자 패턴 분석 쿼리
- 출장 없는 원거리 거래 찾기

---

### Phase 3: 규칙과 추론 (~55분)

**문서:** `03-rules-and-reasoning.md`

**핵심 질문:**
- 절차적 코드와 선언적 규칙의 차이는?
- 리스크 스코어 0-100점은 어떻게 계산되는가?
- 추론(Reasoning)으로 어떻게 새로운 지식을 만드는가?

**실제 분석 대상:**
- Blacklist 규칙 (MCC 7995 도박 차단)
- 리스크 스코어링 알고리즘 (MCC + 시간 + 위치 + 증빙)
- 맥락 조정 (출장 연결 시 점수 감소)

**학습 성과:**
- JSON으로 규칙을 데이터화하는 방법
- 패턴 기반 규칙 (상태 기반 탐지)
- Forward/Backward Chaining 추론 방식
- 규칙 버전 관리의 중요성

**실습 과제:**
- 새로운 블랙리스트 규칙 추가 (MCC 5933 전당포)
- 분할 결제 패턴 탐지 로직 설계
- 고위험군 직원 자동 태깅 추론 규칙

---

## ⏱️ 전체 학습 시간

| Phase | 문서 | 읽기 | 실습 | 합계 |
|-------|------|------|------|------|
| 1 | 온톨로지 기초 | 30분 | 15분 | 45분 |
| 2 | 관계와 그래프 | 35분 | 15분 | 50분 |
| 3 | 규칙과 추론 | 40분 | 15분 | 55분 |
| **총계** | | **105분** | **45분** | **150분 (2.5시간)** |

---

## 🚀 추천 학습 방법

### 1일차 (1시간)
```
Phase 1: 온톨로지 기초
- 01-ontology-fundamentals.md 정독
- 실습 과제 1, 2 수행
```

### 2일차 (1시간)
```
Phase 2: 관계와 그래프
- 02-relationships-and-graphs.md 정독
- Cypher 쿼리 작성 연습
```

### 3일차 (1시간)
```
Phase 3: 규칙과 추론
- 03-rules-and-reasoning.md 정독
- 스코어링 예시 손으로 계산해보기
```

### 4일차~ (실전 구현)
```
현재 프로젝트를 실제로 구현:
- Neo4j 설치 및 데이터 로드
- Python으로 스코어링 엔진 작성
- LangChain으로 Graph RAG 실험
```

---

## 🛠️ 실습 환경 준비 (선택)

학습 후 구현까지 하고 싶다면:

### Neo4j 설치

```bash
# Docker로 Neo4j 실행
docker run \
  -p 7474:7474 -p 7687:7687 \
  -e NEO4J_AUTH=neo4j/password \
  neo4j:latest
```

브라우저에서 http://localhost:7474 접속

### Python 환경

```bash
# 가상환경 생성
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 패키지 설치
pip install neo4j rdflib owlready2 langchain openai
```

---

## 💼 실전 프로젝트 아이디어

학습 완료 후 포트폴리오로 만들 수 있는 프로젝트:

### 프로젝트 1: 법인카드 사기 탐지 시스템 (현재 프로젝트 구현)

**기술 스택:**
- Neo4j (그래프 DB)
- Python (스코어링 엔진)
- FastAPI (REST API)
- Streamlit (대시보드)

**구현 범위:**
1. Neo4j에 10개 엔터티 생성
2. Cypher로 관계 정의
3. Python으로 `calculate_risk_score()` 구현
4. Streamlit으로 거래 입력 → 리스크 점수 표시

**예상 소요 시간:** 2주

### 프로젝트 2: Graph RAG 기업 문서 검색

**기술 스택:**
- Neo4j
- LangChain
- OpenAI API
- Pinecone (벡터 DB)

**구현 범위:**
1. 회사 규정 PDF → LLM으로 엔터티 추출
2. Neo4j에 지식그래프 구축
3. 벡터 검색 + 그래프 순회 결합
4. 자연어 질문 → 정확한 답변

**예상 소요 시간:** 3주

### 프로젝트 3: 미니 Palantir Foundry

**기술 스택:**
- TypeScript (Ontology SDK)
- Neo4j
- Docker + Kubernetes

**구현 범위:**
1. REST API로 온톨로지 CRUD
2. 데이터 파이프라인 + 추론 엔진
3. Git 스타일 브랜치 관리

**예상 소요 시간:** 4주 (고급)

---

## 📚 추가 학습 리소스

### 현재 프로젝트 파일

```
projects/01-expense-fraud-detection/
├── ontology/
│   ├── entities.md           # Phase 1에서 분석
│   └── relationships.md      # Phase 2에서 분석
├── rules/
│   ├── blacklist.json        # Phase 3에서 분석
│   ├── scoring.md            # Phase 3에서 분석
│   └── ...
└── GUIDE.md                  # 전체 프로젝트 개요
```

### 외부 리소스

**온톨로지 기초:**
- [Palantir Ontology 공식 문서](https://www.palantir.com/platforms/foundry/foundry-ontology/)
- [W3C OWL 2 개요](https://www.w3.org/TR/owl2-overview/)

**그래프 DB:**
- [Neo4j GraphAcademy](https://graphacademy.neo4j.com/) (무료 인증)
- [Cypher 쿼리 가이드](https://neo4j.com/developer/cypher/)

**Graph RAG:**
- [Microsoft GraphRAG](https://www.microsoft.com/en-us/research/blog/graphrag-unlocking-llm-discovery-on-narrative-private-data/)
- [Neo4j + LangChain 튜토리얼](https://neo4j.com/blog/developer/rag-tutorial/)

**실제 사례:**
- NASA 시스템 엔지니어링 온톨로지
- Schneider Electric Building Graph (IoT 2,500만 이벤트/일)
- Dow Jones 뉴스 엔터티 온톨로지

---

## ✅ 학습 완료 체크리스트

### Phase 1 완료 후:
- [ ] 온톨로지와 데이터 모델링의 차이를 설명할 수 있다
- [ ] 엔터티의 필수/선택 속성 기준을 이해했다
- [ ] 비즈니스 규칙을 선언적으로 표현할 수 있다
- [ ] 현재 프로젝트의 10개 엔터티 역할을 파악했다

### Phase 2 완료 후:
- [ ] N:1, N:N 카디널리티를 실제 예시로 설명할 수 있다
- [ ] Cypher로 간단한 쿼리를 작성할 수 있다
- [ ] CASCADE vs RESTRICT의 차이를 이해했다
- [ ] 그래프 순회로 "친구의 친구" 같은 문제를 풀 수 있다

### Phase 3 완료 후:
- [ ] 절차적 코드와 선언적 규칙의 장단점을 비교할 수 있다
- [ ] 리스크 스코어링 알고리즘을 손으로 계산할 수 있다
- [ ] Forward/Backward Chaining을 구분할 수 있다
- [ ] 규칙 버전 관리의 필요성을 설명할 수 있다

---

## 🎓 다음 단계: 대기업 입사 준비

### Palantir/온톨로지 전문 기업

**필수 역량:**
1. ✅ 온톨로지 설계 (이 가이드로 학습 완료)
2. TypeScript + Ontology SDK
3. Docker + Kubernetes

**추천 학습:**
- Palantir Developer 문서
- OSDK 튜토리얼

### 컨설팅/SI (삼성SDS, LG CNS)

**필수 역량:**
1. ✅ Neo4j + Graph RAG (이 가이드로 기초 완료)
2. Cloud (AWS/GCP) 경험
3. 비즈니스 도메인 이해

**추천 학습:**
- Neo4j GraphAcademy 인증
- AWS Lambda + Neo4j 통합

### 금융권 (카카오뱅크, 토스)

**필수 역량:**
1. ✅ 사기 탐지 그래프 (현재 프로젝트!)
2. 실시간 처리 (Kafka)
3. 규제 준수 자동화

**추천 학습:**
- 현재 프로젝트 실제 구현
- Kafka + Neo4j 파이프라인

---

## 📞 도움이 필요하면

학습 중 질문이나 막히는 부분이 있으면:

1. **현재 프로젝트 GUIDE.md** 참고
2. **각 학습 문서의 "실습" 섹션** 힌트 확인
3. **GitHub 이슈** 등록 (향후)

---

## 🔄 업데이트 내역

- **2025-10-20**: 초기 버전 생성
  - Phase 1-3 학습 문서 완성
  - 역방향 학습 접근 적용
  - 실무 프로젝트 기반 예시

---

**행운을 빕니다! 🚀**

온톨로지와 지식그래프는 2025년 가장 핫한 기술입니다.
이 가이드로 기초를 다지고, 실전 프로젝트로 포트폴리오를 만들어
Palantir, 컨설팅, 금융권 등 원하는 곳에 입사하세요!

**Last Updated:** 2025-10-20
**Version:** 1.0
