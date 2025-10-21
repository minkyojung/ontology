#!/usr/bin/env python3
"""
MCC (Merchant Category Code) 데이터 생성
blacklist.json 및 추가 MCC 코드를 Neo4j에 삽입
"""

from neo4j import GraphDatabase
import os
import json
from dotenv import load_dotenv
from datetime import date

load_dotenv()

NEO4J_URI = os.getenv('NEO4J_URI', 'bolt://localhost:7687')
NEO4J_USER = os.getenv('NEO4J_USER', 'neo4j')
NEO4J_PASSWORD = os.getenv('NEO4J_PASSWORD', 'password')

class MCCDataLoader:
    def __init__(self, uri, user, password):
        self.driver = GraphDatabase.driver(uri, auth=(user, password))

    def close(self):
        self.driver.close()

    def load_blacklist_mccs(self):
        """blacklist.json에서 블랙 MCC 로드"""

        # Read blacklist.json
        with open('projects/01-expense-fraud-detection/rules/blacklist.json', 'r', encoding='utf-8') as f:
            blacklist_data = json.load(f)

        with self.driver.session() as session:
            for mcc in blacklist_data['blacklist_mccs']:
                query = """
                MERGE (m:MCC {code: $code})
                SET m.category = $category,
                    m.description = $description,
                    m.risk_group = 'BLACK',
                    m.risk_level = 100,
                    m.is_cash_equivalent = $is_cash_equivalent,
                    m.is_gambling = $is_gambling,
                    m.is_entertainment = false,
                    m.requires_justification = true,
                    m.network_source = $network_source,
                    m.network_doc_url = $network_doc_url,
                    m.effective_date = date($effective_date),
                    m.created_at = datetime(),
                    m.updated_at = datetime(),
                    m.legal_reference = $legal_reference
                """

                params = {
                    'code': mcc['code'],
                    'category': mcc['category'],
                    'description': mcc['description'],
                    'is_cash_equivalent': mcc['code'] in ['6051', '6010', '6011'],
                    'is_gambling': mcc['code'] == '7995',
                    'network_source': mcc['network_reference']['source'],
                    'network_doc_url': mcc['network_reference']['url'],
                    'effective_date': '2025-01-01',
                    'legal_reference': json.dumps(mcc['legal_reference'])
                }

                session.run(query, params)
                print(f"✅ Created BLACK MCC: {mcc['code']} - {mcc['category']}")

    def load_graylist_mccs(self):
        """그레이리스트 MCC 추가"""

        gray_mccs = [
            {
                'code': '7273',
                'category': 'Dating/Escort Services',
                'description': 'Dating and escort services',
                'risk_level': 80,
                'is_entertainment': True
            },
            {
                'code': '5813',
                'category': 'Drinking Places (Alcoholic Beverages)',
                'description': 'Bars, taverns, nightclubs, cocktail lounges',
                'risk_level': 70,
                'is_entertainment': True
            },
            {
                'code': '5921',
                'category': 'Package Stores - Beer, Wine, Liquor',
                'description': 'Liquor stores',
                'risk_level': 60,
                'is_entertainment': False
            },
        ]

        with self.driver.session() as session:
            for mcc in gray_mccs:
                query = """
                MERGE (m:MCC {code: $code})
                SET m.category = $category,
                    m.description = $description,
                    m.risk_group = 'GRAY',
                    m.risk_level = $risk_level,
                    m.is_cash_equivalent = false,
                    m.is_gambling = false,
                    m.is_entertainment = $is_entertainment,
                    m.requires_justification = true,
                    m.network_source = 'VISA',
                    m.network_doc_url = 'https://usa.visa.com/dam/VCOM/download/merchants/visa-merchant-data-standards-manual.pdf',
                    m.effective_date = date('2025-01-01'),
                    m.created_at = datetime(),
                    m.updated_at = datetime()
                """

                session.run(query, mcc)
                print(f"✅ Created GRAY MCC: {mcc['code']} - {mcc['category']}")

    def load_normal_mccs(self):
        """정상 MCC 추가 (비교용)"""

        normal_mccs = [
            {
                'code': '5812',
                'category': 'Eating Places and Restaurants',
                'description': 'Restaurants',
                'risk_level': 20
            },
            {
                'code': '5411',
                'category': 'Grocery Stores, Supermarkets',
                'description': 'Grocery and supermarket',
                'risk_level': 10
            },
            {
                'code': '5542',
                'category': 'Automated Fuel Dispensers',
                'description': 'Gas stations',
                'risk_level': 15
            },
            {
                'code': '4111',
                'category': 'Local and Suburban Commuter Passenger Transportation',
                'description': 'Public transportation (subway, bus)',
                'risk_level': 5
            },
            {
                'code': '7523',
                'category': 'Parking Lots and Garages',
                'description': 'Parking facilities',
                'risk_level': 10
            },
            {
                'code': '5732',
                'category': 'Electronics Stores',
                'description': 'Electronics and computer stores',
                'risk_level': 25
            },
        ]

        with self.driver.session() as session:
            for mcc in normal_mccs:
                query = """
                MERGE (m:MCC {code: $code})
                SET m.category = $category,
                    m.description = $description,
                    m.risk_group = 'NORMAL',
                    m.risk_level = $risk_level,
                    m.is_cash_equivalent = false,
                    m.is_gambling = false,
                    m.is_entertainment = false,
                    m.requires_justification = false,
                    m.network_source = 'VISA',
                    m.network_doc_url = 'https://usa.visa.com/dam/VCOM/download/merchants/visa-merchant-data-standards-manual.pdf',
                    m.effective_date = date('2025-01-01'),
                    m.created_at = datetime(),
                    m.updated_at = datetime()
                """

                session.run(query, mcc)
                print(f"✅ Created NORMAL MCC: {mcc['code']} - {mcc['category']}")

    def verify_data(self):
        """데이터 검증"""
        with self.driver.session() as session:
            result = session.run("""
                MATCH (m:MCC)
                RETURN m.risk_group as risk_group, count(m) as count
                ORDER BY risk_group
            """)

            print("\n📊 MCC 데이터 요약:")
            for record in result:
                print(f"  {record['risk_group']}: {record['count']}개")

def main():
    print("=" * 60)
    print("MCC 데이터 생성 시작")
    print("=" * 60)

    loader = MCCDataLoader(NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD)

    try:
        print("\n🔧 Step 1: 블랙리스트 MCC 생성")
        print("-" * 60)
        loader.load_blacklist_mccs()

        print("\n🔧 Step 2: 그레이리스트 MCC 생성")
        print("-" * 60)
        loader.load_graylist_mccs()

        print("\n🔧 Step 3: 일반 MCC 생성")
        print("-" * 60)
        loader.load_normal_mccs()

        print("\n🔍 Step 4: 데이터 검증")
        print("-" * 60)
        loader.verify_data()

        print("\n" + "=" * 60)
        print("✅ MCC 데이터 생성 완료!")
        print("=" * 60)

    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        loader.close()

if __name__ == "__main__":
    main()
