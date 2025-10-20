"""
리스크 스코어링 엔진
projects/01-expense-fraud-detection/rules/scoring.md 기반 구현
"""
from neo4j import GraphDatabase
from datetime import datetime
from typing import Dict, Any


class RiskScoringEngine:
    """리스크 스코어 계산 엔진"""

    def __init__(self, uri: str, user: str, password: str):
        self.driver = GraphDatabase.driver(uri, auth=(user, password))

    def close(self):
        self.driver.close()

    def calculate_risk_score(self, transaction_id: str) -> int:
        """거래의 리스크 점수 계산

        scoring.md의 알고리즘 구현:
        Final Score = MCC Risk + Time Pattern + Location Pattern + Amount Pattern

        Args:
            transaction_id: 거래 ID

        Returns:
            리스크 점수 (0-100)
        """
        # 거래 정보 조회
        tx_data = self._get_transaction_data(transaction_id)
        if not tx_data:
            return 0

        score = 0

        # 1. MCC 기본 점수
        score += self._get_mcc_risk_score(tx_data)

        # 2. 시간대 패턴
        score += self._get_time_pattern_score(tx_data)

        # 3. 금액 패턴 (간단 버전)
        score += self._get_amount_pattern_score(tx_data)

        # 4. 범위 제한 (0-100)
        score = max(0, min(100, score))

        return score

    def _get_transaction_data(self, transaction_id: str) -> Dict[str, Any]:
        """거래 전체 정보 조회"""
        query = """
        MATCH (t:Transaction {id: $tx_id})-[:MADE_BY]->(e:Employee)
        MATCH (t)-[:BELONGS_TO]->(m:Merchant)-[:HAS_MCC]->(mcc:MCC)
        RETURN t, e, m, mcc
        """

        with self.driver.session() as session:
            result = session.run(query, tx_id=transaction_id)
            record = result.single()

            if not record:
                return {}

            return {
                'transaction': dict(record['t']),
                'employee': dict(record['e']),
                'merchant': dict(record['m']),
                'mcc': dict(record['mcc'])
            }

    def _get_mcc_risk_score(self, tx_data: Dict[str, Any]) -> int:
        """MCC 기반 리스크 점수

        scoring.md Line 28-58:
        - BLACK: 100 (즉시 차단)
        - HIGH_RISK: 40
        - MEDIUM_RISK: 25
        - NORMAL: 0
        """
        mcc = tx_data['mcc']
        risk_group = mcc.get('risk_group', 'NORMAL')

        risk_mapping = {
            'BLACK': 100,
            'HIGH_RISK': 40,
            'MEDIUM_RISK': 25,
            'LOW_RISK': 10,
            'NORMAL': 0,
            'TRUSTED': -10
        }

        return risk_mapping.get(risk_group, 0)

    def _get_time_pattern_score(self, tx_data: Dict[str, Any]) -> int:
        """시간대 패턴 점수

        scoring.md Line 63-98:
        - 심야 (22:00-06:00): +20
        - 주말 (토/일): +15
        - 공휴일: +15
        - 근무시간 외 (18:00-22:00, 06:00-09:00): +10
        """
        transaction = tx_data['transaction']
        transacted_at = transaction.get('transacted_at')

        if not transacted_at:
            return 0

        score = 0
        hour = transacted_at.hour
        day_of_week = transacted_at.weekday()  # 0=Monday, 6=Sunday

        # 심야 (22:00 ~ 06:00)
        if hour >= 22 or hour < 6:
            score += 20

        # 주말 (토요일=5, 일요일=6)
        if day_of_week in [5, 6]:
            score += 15

        # 근무시간 외 (심야가 아닌 경우만)
        if score < 20:  # 심야와 중복 방지
            if 18 <= hour < 22 or 6 <= hour < 9:
                score += 10

        return score

    def _get_amount_pattern_score(self, tx_data: Dict[str, Any]) -> int:
        """금액 패턴 점수

        scoring.md Line 136-169:
        - 고액 (일일 한도 80% 이상): +15
        - 평소 대비 급증 (30일 평균 3배 이상): +20
        """
        transaction = tx_data['transaction']
        employee = tx_data['employee']

        amount = transaction.get('amount', 0)
        daily_limit = employee.get('spending_limit_daily', 1000000)

        score = 0

        # 고액 (일일 한도의 80% 이상)
        if amount >= daily_limit * 0.8:
            score += 15

        # 참고: 평소 대비 급증은 과거 데이터 필요 (생략)

        return score

    def update_risk_score(self, transaction_id: str) -> int:
        """거래의 리스크 점수 계산 및 DB 업데이트"""
        score = self.calculate_risk_score(transaction_id)

        query = """
        MATCH (t:Transaction {id: $tx_id})
        SET t.risk_score = $score
        RETURN t.risk_score AS updated_score
        """

        with self.driver.session() as session:
            result = session.run(query, tx_id=transaction_id, score=score)
            record = result.single()
            return record['updated_score']

    def recalculate_all_scores(self):
        """모든 거래의 리스크 점수 재계산"""
        query = """
        MATCH (t:Transaction)
        RETURN t.id AS transaction_id
        """

        with self.driver.session() as session:
            result = session.run(query)
            transaction_ids = [record['transaction_id'] for record in result]

        print(f"총 {len(transaction_ids)}개 거래의 점수를 재계산합니다...")

        for tx_id in transaction_ids:
            old_score = self._get_old_score(tx_id)
            new_score = self.update_risk_score(tx_id)
            print(f"  {tx_id}: {old_score} → {new_score}")

    def _get_old_score(self, transaction_id: str) -> int:
        """기존 점수 조회"""
        query = """
        MATCH (t:Transaction {id: $tx_id})
        RETURN t.risk_score AS score
        """

        with self.driver.session() as session:
            result = session.run(query, tx_id=transaction_id)
            record = result.single()
            return record['score'] if record else 0


def main():
    """테스트 실행"""
    engine = RiskScoringEngine(
        uri="neo4j://localhost:7687",
        user="neo4j",
        password="ontology123"
    )

    try:
        print("=" * 80)
        print("리스크 스코어링 엔진 - 점수 재계산")
        print("=" * 80)
        print()

        # 모든 거래 점수 재계산
        engine.recalculate_all_scores()

        print()
        print("=" * 80)
        print("✅ 재계산 완료!")
        print("=" * 80)

        # fraud_detection.py 다시 실행해서 확인
        print()
        print("💡 확인: python fraud_detection.py 실행해서 변경된 점수 확인")

    finally:
        engine.close()


if __name__ == "__main__":
    main()
