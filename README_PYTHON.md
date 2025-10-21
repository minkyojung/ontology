# Python + Neo4j 실습 완료!

> Neo4j와 Python을 연동하여 법인카드 사기 탐지 시스템 구현 완료

---

## ✅ 완료한 작업

### 1. 환경 구축
- ✅ Python 가상환경 생성 (`venv/`)
- ✅ neo4j 드라이버 설치 (v6.0.2)
- ✅ 연결 테스트 성공

### 2. 사기 탐지 시스템 구현
**파일:** `fraud_detection.py`

**기능:**
- 도박 MCC 거래 탐지
- 고위험 거래 찾기 (임계값 기반)
- 직원별 위험도 통계
- 심야 거래 탐지
- 종합 의심 거래 분석

**실행:**
```bash
source venv/bin/activate
python fraud_detection.py
```

### 3. 리스크 스코어링 엔진
**파일:** `risk_scoring.py`

**구현 내용:**
- `docs/learning/03-rules-and-reasoning.md`의 알고리즘 구현
- MCC 기반 점수 (BLACK=100, HIGH_RISK=40, ...)
- 시간대 패턴 (심야 +20, 주말 +15)
- 금액 패턴 (고액 +15)
- 자동 점수 재계산

**실행:**
```bash
source venv/bin/activate
python risk_scoring.py
```

**결과:**
- tx-001: 0점 (정상)
- tx-002: 90점 (HIGH_RISK + 심야 + 주말 + 고액)
- tx-003: 100점 (BLACK MCC)

---

## 📁 프로젝트 구조

```
.
├── venv/                       # Python 가상환경
├── test_neo4j.py              # 연결 테스트
├── fraud_detection.py         # 사기 탐지 시스템
├── risk_scoring.py            # 스코어링 엔진
├── docs/learning/             # 학습 문서
│   ├── README.md              # 전체 학습 경로
│   ├── 01-ontology-fundamentals.md
│   ├── 02-relationships-and-graphs.md
│   ├── 03-rules-and-reasoning.md
│   └── neo4j-setup-guide.md  # Neo4j 설치 가이드
└── projects/01-expense-fraud-detection/
    ├── ontology/              # 엔터티, 관계 정의
    ├── rules/                 # 블랙리스트, 스코어링
    └── GUIDE.md              # 프로젝트 개요
```

---

## 🎯 핵심 코드 예시

### 1. Neo4j 연결

```python
from neo4j import GraphDatabase

driver = GraphDatabase.driver(
    "neo4j://localhost:7687",
    auth=("neo4j", "ontology123")
)

# 연결 확인
driver.verify_connectivity()
```

### 2. 쿼리 실행

```python
with driver.session() as session:
    query = """
    MATCH (t:Transaction)-[:MADE_BY]->(e:Employee)
    WHERE t.risk_score >= 70
    RETURN e.name, t.amount, t.risk_score
    """
    result = session.run(query)

    for record in result:
        print(record['e.name'], record['t.amount'])
```

### 3. 파라미터 사용

```python
query = """
MATCH (t:Transaction)-[:MADE_BY]->(e:Employee)
WHERE t.risk_score >= $threshold
RETURN e.name, t.risk_score
"""

result = session.run(query, threshold=70)
```

### 4. 데이터 업데이트

```python
query = """
MATCH (t:Transaction {id: $tx_id})
SET t.risk_score = $score
RETURN t.risk_score
"""

session.run(query, tx_id="tx-001", score=50)
```

---

## 🔍 실전 분석 결과

### 박영희 (개발팀) - 고위험 직원

**통계:**
- 거래건수: 2건
- 총 지출: 350만원
- **평균 위험점수: 95.0점** ⚠️
- 최고 위험점수: 100점

**거래 내역:**
1. **tx-002**: 강남 룸살롱 (300만원, 토요일 23:45)
   - MCC: HIGH_RISK (+40)
   - 심야 (+20)
   - 주말 (+15)
   - 고액 (+15)
   - **총점: 90점**

2. **tx-003**: Online Casino XYZ (50만원, 새벽 02:15)
   - MCC: BLACK (+100)
   - **총점: 100점 (차단)**

**결론:** 재범 가능성 높음, 즉시 조치 필요!

---

## 🚀 다음 단계

### A. 더 많은 엔터티 추가
```python
# Receipt (증빙) 생성
query = """
MATCH (t:Transaction {id: 'tx-001'})
CREATE (r:Receipt {
  id: 'receipt-001',
  file_url: 's3://receipts/001.pdf',
  ocr_status: 'SUCCESS'
})
CREATE (r)-[:FOR_TRANSACTION]->(t)
"""
```

### B. 고급 패턴 탐지
- 분할 결제 탐지 (30분 내 동일 가맹점 3건 이상)
- 재범자 자동 태깅
- 위치 불일치 패턴

### C. 대시보드 구축
- Streamlit으로 실시간 대시보드
- 그래프 시각화 (Plotly, D3.js)

### D. Graph RAG 연동
- LangChain + Neo4j
- 자연어 질문 → Cypher 쿼리 자동 생성

---

## 📚 참고 자료

### Neo4j Python 드라이버
- [공식 문서](https://neo4j.com/docs/python-manual/current/)
- [API 레퍼런스](https://neo4j.com/docs/api/python-driver/current/)

### 프로젝트 문서
- `docs/learning/README.md` - 전체 학습 경로
- `docs/learning/02-relationships-and-graphs.md` - Cypher 쿼리 가이드
- `docs/learning/03-rules-and-reasoning.md` - 스코어링 알고리즘

### 실제 사례
- Neo4j 사기 탐지: https://neo4j.com/use-cases/fraud-detection/
- 금융권 그래프 DB 활용

---

## 💡 배운 핵심 개념

| 개념 | 설명 | 코드 예시 |
|------|------|----------|
| **Driver** | Neo4j 연결 관리 | `GraphDatabase.driver()` |
| **Session** | 쿼리 실행 단위 | `driver.session()` |
| **Transaction** | 트랜잭션 관리 | `session.run()` |
| **파라미터** | SQL Injection 방지 | `$threshold` |
| **Record** | 쿼리 결과 행 | `record['name']` |
| **ORM 없이** | 직접 Cypher 작성 | 명확하고 강력함 |

---

## 🎉 축하합니다!

**지금까지 달성한 것:**
1. ✅ Neo4j 설치 및 데이터 로드
2. ✅ Cypher 쿼리 기초 마스터
3. ✅ Python 연동 완료
4. ✅ 실전 사기 탐지 시스템 구현
5. ✅ 자동 리스크 스코어링 엔진 구현

**다음 목표:**
- 더 많은 엔터티/관계 추가
- 실시간 대시보드 구축
- Graph RAG 실험
- 포트폴리오 완성!

---

**Last Updated:** 2025-10-20
**Version:** 1.0
