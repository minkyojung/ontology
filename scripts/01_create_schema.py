#!/usr/bin/env python3
"""
Neo4j 스키마 생성 스크립트
온톨로지 정의(entities.md)를 기반으로 제약조건과 인덱스 생성
"""

from neo4j import GraphDatabase
import os
from dotenv import load_dotenv

# .env 파일 로드
load_dotenv()

NEO4J_URI = os.getenv('NEO4J_URI', 'bolt://localhost:7687')
NEO4J_USER = os.getenv('NEO4J_USER', 'neo4j')
NEO4J_PASSWORD = os.getenv('NEO4J_PASSWORD', 'password')

class SchemaCreator:
    def __init__(self, uri, user, password):
        self.driver = GraphDatabase.driver(uri, auth=(user, password))

    def close(self):
        self.driver.close()

    def create_constraints(self):
        """엔터티별 제약조건 생성"""

        constraints = [
            # Transaction: id는 고유
            "CREATE CONSTRAINT transaction_id_unique IF NOT EXISTS FOR (t:Transaction) REQUIRE t.id IS UNIQUE",

            # Merchant: id는 고유
            "CREATE CONSTRAINT merchant_id_unique IF NOT EXISTS FOR (m:Merchant) REQUIRE m.id IS UNIQUE",

            # MCC: code는 고유 (Primary Key)
            "CREATE CONSTRAINT mcc_code_unique IF NOT EXISTS FOR (mcc:MCC) REQUIRE mcc.code IS UNIQUE",

            # Employee: id는 고유
            "CREATE CONSTRAINT employee_id_unique IF NOT EXISTS FOR (e:Employee) REQUIRE e.id IS UNIQUE",

            # Employee: employee_number는 고유
            "CREATE CONSTRAINT employee_number_unique IF NOT EXISTS FOR (e:Employee) REQUIRE e.employee_number IS UNIQUE",

            # Employee: email은 고유
            "CREATE CONSTRAINT employee_email_unique IF NOT EXISTS FOR (e:Employee) REQUIRE e.email IS UNIQUE",

            # Policy: id는 고유
            "CREATE CONSTRAINT policy_id_unique IF NOT EXISTS FOR (p:Policy) REQUIRE p.id IS UNIQUE",

            # Receipt: id는 고유
            "CREATE CONSTRAINT receipt_id_unique IF NOT EXISTS FOR (r:Receipt) REQUIRE r.id IS UNIQUE",

            # TripEvent: id는 고유
            "CREATE CONSTRAINT trip_id_unique IF NOT EXISTS FOR (t:TripEvent) REQUIRE t.id IS UNIQUE",

            # Approval: id는 고유
            "CREATE CONSTRAINT approval_id_unique IF NOT EXISTS FOR (a:Approval) REQUIRE a.id IS UNIQUE",

            # Case: id는 고유
            "CREATE CONSTRAINT case_id_unique IF NOT EXISTS FOR (c:Case) REQUIRE c.id IS UNIQUE",

            # TaxRule: id는 고유
            "CREATE CONSTRAINT taxrule_id_unique IF NOT EXISTS FOR (tr:TaxRule) REQUIRE tr.id IS UNIQUE",
        ]

        with self.driver.session() as session:
            for constraint in constraints:
                try:
                    session.run(constraint)
                    print(f"✅ Created: {constraint.split('FOR')[1].split('REQUIRE')[0].strip()}")
                except Exception as e:
                    print(f"⚠️  Already exists or error: {str(e)[:100]}")

    def create_indexes(self):
        """성능을 위한 인덱스 생성"""

        indexes = [
            # Transaction: 날짜 기반 검색
            "CREATE INDEX transaction_date IF NOT EXISTS FOR (t:Transaction) ON (t.transacted_at)",

            # Transaction: 금액 범위 검색
            "CREATE INDEX transaction_amount IF NOT EXISTS FOR (t:Transaction) ON (t.amount)",

            # Transaction: 리스크 스코어 검색
            "CREATE INDEX transaction_risk IF NOT EXISTS FOR (t:Transaction) ON (t.risk_score)",

            # Transaction: 상태 검색
            "CREATE INDEX transaction_status IF NOT EXISTS FOR (t:Transaction) ON (t.status)",

            # Merchant: 이름 검색
            "CREATE INDEX merchant_name IF NOT EXISTS FOR (m:Merchant) ON (m.name)",

            # Merchant: 국가 검색
            "CREATE INDEX merchant_country IF NOT EXISTS FOR (m:Merchant) ON (m.country)",

            # MCC: 리스크 그룹 검색
            "CREATE INDEX mcc_risk_group IF NOT EXISTS FOR (mcc:MCC) ON (mcc.risk_group)",

            # Employee: 이름 검색
            "CREATE INDEX employee_name IF NOT EXISTS FOR (e:Employee) ON (e.name)",

            # Employee: 부서 검색
            "CREATE INDEX employee_department IF NOT EXISTS FOR (e:Employee) ON (e.department)",

            # Case: 상태 검색
            "CREATE INDEX case_status IF NOT EXISTS FOR (c:Case) ON (c.status)",

            # Case: 심각도 검색
            "CREATE INDEX case_severity IF NOT EXISTS FOR (c:Case) ON (c.severity)",

            # TaxRule: 법령 이름 검색
            "CREATE INDEX taxrule_law IF NOT EXISTS FOR (tr:TaxRule) ON (tr.law_name)",
        ]

        with self.driver.session() as session:
            for index in indexes:
                try:
                    session.run(index)
                    print(f"✅ Created: {index.split('FOR')[1].split('ON')[0].strip()}")
                except Exception as e:
                    print(f"⚠️  Already exists or error: {str(e)[:100]}")

    def verify_schema(self):
        """스키마 검증"""
        with self.driver.session() as session:
            # 제약조건 확인
            result = session.run("SHOW CONSTRAINTS")
            constraints = list(result)
            print(f"\n📋 Total Constraints: {len(constraints)}")

            # 인덱스 확인
            result = session.run("SHOW INDEXES")
            indexes = list(result)
            print(f"📋 Total Indexes: {len(indexes)}")

def main():
    print("=" * 60)
    print("Neo4j 스키마 생성 시작")
    print("=" * 60)

    creator = SchemaCreator(NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD)

    try:
        print("\n🔧 Step 1: 제약조건 생성")
        print("-" * 60)
        creator.create_constraints()

        print("\n🔧 Step 2: 인덱스 생성")
        print("-" * 60)
        creator.create_indexes()

        print("\n🔍 Step 3: 스키마 검증")
        print("-" * 60)
        creator.verify_schema()

        print("\n" + "=" * 60)
        print("✅ 스키마 생성 완료!")
        print("=" * 60)

    except Exception as e:
        print(f"\n❌ Error: {e}")
    finally:
        creator.close()

if __name__ == "__main__":
    main()
