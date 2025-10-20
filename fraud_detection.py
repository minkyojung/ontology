"""
법인카드 사기 탐지 시스템 - Neo4j Python 구현
"""
from neo4j import GraphDatabase
from typing import List, Dict, Any
from datetime import datetime

class FraudDetectionSystem:
    """사기 탐지 시스템"""

    def __init__(self, uri: str, user: str, password: str):
        self.driver = GraphDatabase.driver(uri, auth=(user, password))

    def close(self):
        """연결 종료"""
        self.driver.close()

    def get_gambling_transactions(self) -> List[Dict[str, Any]]:
        """도박 MCC로 거래한 모든 거래 찾기"""
        query = """
        MATCH (t:Transaction)-[:BELONGS_TO]->(m:Merchant)-[:HAS_MCC]->(mcc:MCC)
        WHERE mcc.is_gambling = true
        RETURN t.id AS transaction_id,
               t.amount AS amount,
               t.transacted_at AS transacted_at,
               m.name AS merchant_name,
               mcc.category AS mcc_category,
               t.status AS status,
               t.risk_score AS risk_score
        """

        with self.driver.session() as session:
            result = session.run(query)
            return [dict(record) for record in result]

    def get_high_risk_transactions(self, threshold: int = 70) -> List[Dict[str, Any]]:
        """리스크 점수가 임계값 이상인 거래 + 직원 정보"""
        query = """
        MATCH (t:Transaction)-[:MADE_BY]->(e:Employee)
        WHERE t.risk_score >= $threshold
        RETURN t.id AS transaction_id,
               t.amount AS amount,
               t.transacted_at AS transacted_at,
               e.name AS employee_name,
               e.department AS department,
               t.risk_score AS risk_score
        ORDER BY t.risk_score DESC
        """

        with self.driver.session() as session:
            result = session.run(query, threshold=threshold)
            return [dict(record) for record in result]

    def get_employee_statistics(self) -> List[Dict[str, Any]]:
        """직원별 거래 통계 및 위험도 분석"""
        query = """
        MATCH (e:Employee)<-[:MADE_BY]-(t:Transaction)
        RETURN e.name AS employee_name,
               e.department AS department,
               COUNT(t) AS transaction_count,
               SUM(t.amount) AS total_spending,
               AVG(t.risk_score) AS avg_risk_score,
               MAX(t.risk_score) AS max_risk_score
        ORDER BY avg_risk_score DESC
        """

        with self.driver.session() as session:
            result = session.run(query)
            return [dict(record) for record in result]

    def get_night_transactions(self) -> List[Dict[str, Any]]:
        """심야 거래 찾기 (22:00 ~ 06:00)"""
        query = """
        MATCH (t:Transaction)-[:MADE_BY]->(e:Employee)
        WHERE t.transacted_at.hour >= 22 OR t.transacted_at.hour < 6
        RETURN t.id AS transaction_id,
               t.amount AS amount,
               t.transacted_at AS transacted_at,
               e.name AS employee_name,
               t.risk_score AS risk_score
        ORDER BY t.transacted_at
        """

        with self.driver.session() as session:
            result = session.run(query)
            return [dict(record) for record in result]

    def get_suspicious_transactions(self) -> List[Dict[str, Any]]:
        """의심스러운 거래 종합 분석

        조건:
        - 리스크 점수 70 이상
        - HIGH_RISK 또는 BLACK MCC
        - 가맹점 신뢰도 50 미만
        """
        query = """
        MATCH (t:Transaction)-[:MADE_BY]->(e:Employee)
        MATCH (t)-[:BELONGS_TO]->(m:Merchant)-[:HAS_MCC]->(mcc:MCC)
        WHERE t.risk_score >= 70
          AND mcc.risk_group IN ['HIGH_RISK', 'BLACK']
          AND m.trust_score < 50
        RETURN t.id AS transaction_id,
               e.name AS employee_name,
               e.department AS department,
               m.name AS merchant_name,
               mcc.category AS mcc_category,
               t.amount AS amount,
               t.transacted_at AS transacted_at,
               t.risk_score AS risk_score,
               t.status AS status
        ORDER BY t.risk_score DESC
        """

        with self.driver.session() as session:
            result = session.run(query)
            return [dict(record) for record in result]


def main():
    """메인 함수 - 테스트 실행"""

    # 시스템 초기화
    system = FraudDetectionSystem(
        uri="neo4j://localhost:7687",
        user="neo4j",
        password="ontology123"
    )

    try:
        print("=" * 80)
        print("법인카드 사기 탐지 시스템")
        print("=" * 80)

        # 1. 도박 거래
        print("\n📌 1. 도박 MCC 거래")
        print("-" * 80)
        gambling = system.get_gambling_transactions()
        for tx in gambling:
            print(f"거래ID: {tx['transaction_id']}")
            print(f"  금액: {tx['amount']:,}원")
            print(f"  가맹점: {tx['merchant_name']}")
            print(f"  상태: {tx['status']}")
            print(f"  위험점수: {tx['risk_score']}")
            print()

        # 2. 고위험 거래
        print("\n📌 2. 고위험 거래 (70점 이상)")
        print("-" * 80)
        high_risk = system.get_high_risk_transactions(threshold=70)
        for tx in high_risk:
            print(f"거래ID: {tx['transaction_id']}")
            print(f"  직원: {tx['employee_name']} ({tx['department']})")
            print(f"  금액: {tx['amount']:,}원")
            print(f"  위험점수: {tx['risk_score']}")
            print()

        # 3. 직원 통계
        print("\n📌 3. 직원별 위험도 통계")
        print("-" * 80)
        stats = system.get_employee_statistics()
        for stat in stats:
            print(f"직원: {stat['employee_name']} ({stat['department']})")
            print(f"  거래건수: {stat['transaction_count']}")
            print(f"  총 지출: {stat['total_spending']:,}원")
            print(f"  평균 위험점수: {stat['avg_risk_score']:.1f}")
            print(f"  최고 위험점수: {stat['max_risk_score']}")
            print()

        # 4. 심야 거래
        print("\n📌 4. 심야 거래 (22:00-06:00)")
        print("-" * 80)
        night = system.get_night_transactions()
        for tx in night:
            time = tx['transacted_at']
            print(f"거래ID: {tx['transaction_id']}")
            print(f"  시각: {time.hour:02d}:{time.minute:02d}")
            print(f"  직원: {tx['employee_name']}")
            print(f"  금액: {tx['amount']:,}원")
            print()

        # 5. 의심스러운 거래 (종합)
        print("\n📌 5. 의심스러운 거래 (종합 분석)")
        print("-" * 80)
        suspicious = system.get_suspicious_transactions()
        for tx in suspicious:
            print(f"⚠️  거래ID: {tx['transaction_id']}")
            print(f"  직원: {tx['employee_name']} ({tx['department']})")
            print(f"  가맹점: {tx['merchant_name']}")
            print(f"  업종: {tx['mcc_category']}")
            print(f"  금액: {tx['amount']:,}원")
            print(f"  위험점수: {tx['risk_score']}")
            print(f"  상태: {tx['status']}")
            print()

        print("=" * 80)
        print("✅ 분석 완료!")
        print("=" * 80)

    finally:
        system.close()


if __name__ == "__main__":
    main()
