#!/usr/bin/env python3
"""
Fraud Detection 로직 구현
1. Merchant에 MCC 할당
2. 리스크 스코어 계산
3. 블랙리스트 거래 탐지 및 Case 생성
"""

from neo4j import GraphDatabase
import os
from dotenv import load_dotenv
import uuid
from datetime import datetime
import random

load_dotenv()

NEO4J_URI = os.getenv('NEO4J_URI', 'bolt://localhost:7687')
NEO4J_USER = os.getenv('NEO4J_USER', 'neo4j')
NEO4J_PASSWORD = os.getenv('NEO4J_PASSWORD', 'password')

class FraudDetector:
    def __init__(self, uri, user, password):
        self.driver = GraphDatabase.driver(uri, auth=(user, password))

    def close(self):
        self.driver.close()

    def assign_mcc_to_merchants(self):
        """Merchant에 MCC 할당 및 관계 생성"""

        # 가맹점 이름에 따라 MCC 할당 (더미 데이터용)
        mcc_mapping = {
            '스타벅스': '5812',  # 식당
            '편의점': '5411',    # 식료품점
            '주유소': '5542',    # 주유소
            '전자제품': '5732',  # 전자제품
            '도박장': '7995',    # 도박 (BLACK)
            '환전소': '6051',    # 준현금 (BLACK)
            'ATM': '6011',       # ATM (BLACK)
            '술집': '5813',      # 주점 (GRAY)
        }

        with self.driver.session() as session:
            # 먼저 기존 Merchant 확인
            result = session.run("MATCH (m:Merchant) RETURN m.name as name")
            merchants = [r['name'] for r in result]

            if not merchants:
                print("⚠️  Merchant 노드가 없습니다. 테스트 데이터를 생성합니다.")
                self._create_test_merchants(session)

            # 각 Merchant에 MCC 할당
            for merchant_name, mcc_code in mcc_mapping.items():
                query = """
                MATCH (m:Merchant)
                WHERE m.name CONTAINS $merchant_name
                WITH m LIMIT 1
                MATCH (mcc:MCC {code: $mcc_code})
                SET m.mcc_code = $mcc_code
                MERGE (m)-[:HAS_MCC]->(mcc)
                RETURN m.name as name, mcc.code as mcc_code
                """

                result = session.run(query, {
                    'merchant_name': merchant_name,
                    'mcc_code': mcc_code
                })

                record = result.single()
                if record:
                    print(f"✅ {record['name']} → MCC {record['mcc_code']}")

            # 나머지 Merchant에는 랜덤 NORMAL MCC 할당
            query = """
            MATCH (m:Merchant)
            WHERE NOT (m)-[:HAS_MCC]->()
            WITH m
            MATCH (mcc:MCC {risk_group: 'NORMAL'})
            WITH m, mcc ORDER BY rand() LIMIT 1
            SET m.mcc_code = mcc.code
            MERGE (m)-[:HAS_MCC]->(mcc)
            RETURN count(m) as count
            """

            result = session.run(query)
            count = result.single()['count']
            if count > 0:
                print(f"✅ 나머지 {count}개 Merchant에 NORMAL MCC 할당")

    def _create_test_merchants(self, session):
        """테스트용 Merchant 생성"""
        test_merchants = [
            {'name': '스타벅스 강남점', 'country': 'KR'},
            {'name': 'GS25 편의점', 'country': 'KR'},
            {'name': 'SK주유소 서초', 'country': 'KR'},
            {'name': '애플 전자제품 스토어', 'country': 'KR'},
            {'name': '강남 도박장', 'country': 'KR'},
            {'name': '명동 환전소', 'country': 'KR'},
            {'name': 'KB ATM', 'country': 'KR'},
            {'name': '이태원 술집', 'country': 'KR'},
        ]

        for merchant in test_merchants:
            query = """
            CREATE (m:Merchant {
                id: randomUUID(),
                name: $name,
                country: $country,
                is_online: false,
                trust_score: 50,
                is_whitelisted: false,
                created_at: datetime(),
                updated_at: datetime()
            })
            """
            session.run(query, merchant)

        print(f"✅ {len(test_merchants)}개 테스트 Merchant 생성")

    def calculate_risk_scores(self):
        """거래의 리스크 스코어 계산"""

        with self.driver.session() as session:
            query = """
            MATCH (t:Transaction)-[:BELONGS_TO]->(m:Merchant)-[:HAS_MCC]->(mcc:MCC)
            SET t.risk_score = CASE
                WHEN mcc.risk_group = 'BLACK' THEN 100
                WHEN mcc.risk_group = 'GRAY' THEN 70
                ELSE mcc.risk_level
            END
            RETURN count(t) as count
            """

            result = session.run(query)
            count = result.single()['count']
            print(f"✅ {count}개 거래의 리스크 스코어 계산 완료")

    def detect_blacklist_violations(self):
        """블랙리스트 위반 탐지 및 Case 생성"""

        with self.driver.session() as session:
            query = """
            MATCH (t:Transaction)-[:BELONGS_TO]->(m:Merchant)-[:HAS_MCC]->(mcc:MCC)
            WHERE mcc.risk_group = 'BLACK'
            AND NOT EXISTS {
                MATCH (c:Case)-[:RELATES_TO]->(t)
            }
            MATCH (t)-[:MADE_BY]->(e:Employee)
            MATCH (tr:TaxRule)-[:APPLIES_TO]->(mcc)
            WITH t, m, mcc, e, tr LIMIT 1
            CREATE (c:Case {
                id: randomUUID(),
                case_type: 'BLACKLIST_MCC',
                severity: 'CRITICAL',
                status: 'OPEN',
                detected_at: datetime(),
                amount_recovered: 0,
                is_repeat_offense: false,
                detection_reasoning: '{
                    "matched_rules": [
                        {
                            "rule_type": "MCC_BLACKLIST",
                            "rule_name": "MCC 블랙리스트 위반",
                            "mcc_code": "' + mcc.code + '",
                            "mcc_description": "' + mcc.description + '",
                            "risk_level": "' + mcc.risk_group + '",
                            "weight": 100,
                            "source": "rules/blacklist.md",
                            "detail": "블랙리스트 MCC 코드로 분류된 가맹점에서 거래 발생"
                        }
                    ],
                    "risk_factors": {
                        "mcc_risk": "BLACK",
                        "amount": ' + toString(t.amount) + ',
                        "merchant_trust_score": ' + toString(m.trust_score) + '
                    },
                    "final_score": {
                        "total_score": 100,
                        "threshold": 70,
                        "recommendation": "FLAGGED"
                    },
                    "explanation": "이 거래는 블랙리스트로 지정된 MCC 코드를 사용하는 가맹점에서 발생했습니다. 블랙리스트 MCC는 법인카드 사용이 금지된 업종입니다."
                }',
                created_at: datetime(),
                updated_at: datetime()
            })
            CREATE (c)-[:RELATES_TO]->(t)
            CREATE (c)-[:CITES]->(tr)
            RETURN c.id as case_id, t.amount as amount,
                   e.name as employee, m.name as merchant,
                   mcc.code as mcc_code
            """

            result = session.run(query)
            records = list(result)

            if records:
                for record in records:
                    print(f"🚨 CASE 생성: {record['employee']} - "
                          f"{record['merchant']} (MCC {record['mcc_code']}) "
                          f"- ₩{record['amount']:,}")
            else:
                print("ℹ️  블랙리스트 위반 없음 또는 이미 처리됨")

    def generate_fraud_report(self):
        """Fraud Detection 리포트 생성"""

        with self.driver.session() as session:
            # 전체 거래 수
            result = session.run("MATCH (t:Transaction) RETURN count(t) as count")
            total_transactions = result.single()['count']

            # 리스크별 거래 수
            result = session.run("""
                MATCH (t:Transaction)
                RETURN
                    count(CASE WHEN t.risk_score = 100 THEN 1 END) as critical,
                    count(CASE WHEN t.risk_score >= 70 AND t.risk_score < 100 THEN 1 END) as high,
                    count(CASE WHEN t.risk_score >= 50 AND t.risk_score < 70 THEN 1 END) as medium,
                    count(CASE WHEN t.risk_score < 50 THEN 1 END) as low
            """)

            stats = result.single()

            # Case 수
            result = session.run("MATCH (c:Case) RETURN count(c) as count")
            case_count = result.single()['count']

            print("\n" + "=" * 60)
            print("📊 Fraud Detection 리포트")
            print("=" * 60)
            print(f"전체 거래: {total_transactions}건")
            print(f"\n리스크 분포:")
            print(f"  🔴 CRITICAL (100점): {stats['critical']}건")
            print(f"  🟠 HIGH (70-99점): {stats['high']}건")
            print(f"  🟡 MEDIUM (50-69점): {stats['medium']}건")
            print(f"  🟢 LOW (<50점): {stats['low']}건")
            print(f"\n생성된 Case: {case_count}건")
            print("=" * 60)

def main():
    print("=" * 60)
    print("Fraud Detection 실행")
    print("=" * 60)

    detector = FraudDetector(NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD)

    try:
        print("\n🔧 Step 1: Merchant에 MCC 할당")
        print("-" * 60)
        detector.assign_mcc_to_merchants()

        print("\n🔧 Step 2: 리스크 스코어 계산")
        print("-" * 60)
        detector.calculate_risk_scores()

        print("\n🔧 Step 3: 블랙리스트 위반 탐지")
        print("-" * 60)
        detector.detect_blacklist_violations()

        print("\n🔍 Step 4: 리포트 생성")
        detector.generate_fraud_report()

        print("\n" + "=" * 60)
        print("✅ Fraud Detection 완료!")
        print("=" * 60)

    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        detector.close()

if __name__ == "__main__":
    main()
