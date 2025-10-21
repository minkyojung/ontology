#!/usr/bin/env python3
"""
TaxRule (세법 룰) 데이터 생성
법인세법, 부가세법 조문을 Neo4j에 삽입
"""

from neo4j import GraphDatabase
import os
import json
from dotenv import load_dotenv
import uuid

load_dotenv()

NEO4J_URI = os.getenv('NEO4J_URI', 'bolt://localhost:7687')
NEO4J_USER = os.getenv('NEO4J_USER', 'neo4j')
NEO4J_PASSWORD = os.getenv('NEO4J_PASSWORD', 'password')

class TaxRuleLoader:
    def __init__(self, uri, user, password):
        self.driver = GraphDatabase.driver(uri, auth=(user, password))

    def close(self):
        self.driver.close()

    def load_tax_rules(self):
        """한국 세법 룰 생성"""

        tax_rules = [
            {
                'id': str(uuid.uuid4()),
                'law_name': '법인세법',
                'article_number': '제27조',
                'clause': None,
                'title': '업무무관 비용 손금불산입',
                'summary': '법인의 업무와 관련 없는 지출은 손금에 산입하지 아니한다.',
                'full_text': '내국법인이 각 사업연도에 지출한 비용 중 그 법인의 업무와 직접 관련이 없다고 인정되는 비용은 손금에 산입하지 아니한다.',
                'category': 'NON_DEDUCTIBLE_EXPENSE',
                'effective_from': '2010-01-01',
                'effective_until': None,
                'law_url': 'https://www.law.go.kr/lsLawLinkInfo.do?chrClsCd=010202&lsJoLnkSeq=900178234',
                'related_mcc_codes': ['7995', '6051', '7273', '5813'],
                'auto_tag_conditions': {
                    'mcc_in': ['7995', '6051', '7273', '5813'],
                    'amount_gt': 0
                }
            },
            {
                'id': str(uuid.uuid4()),
                'law_name': '부가가치세법',
                'article_number': '제39조',
                'clause': None,
                'title': '공제하지 아니하는 매입세액',
                'summary': '업무와 관련이 없거나 접대비로 사용된 재화 또는 용역의 매입세액은 공제하지 아니한다.',
                'full_text': '사업자가 자기의 사업과 직접 관련이 없는 지출 또는 접대비 지출에 관련된 매입세액은 매출세액에서 공제하지 아니한다.',
                'category': 'VAT_EXCLUSION',
                'effective_from': '2010-01-01',
                'effective_until': None,
                'law_url': 'https://www.law.go.kr/LSW//lsLawLinkInfo.do?chrClsCd=010202&lsId=001571&lsJoLnkSeq=900316725&print=print',
                'related_mcc_codes': ['7995', '6051', '7273', '5813'],
                'auto_tag_conditions': {
                    'mcc_in': ['7995', '6051', '7273', '5813'],
                    'amount_gt': 0
                }
            },
            {
                'id': str(uuid.uuid4()),
                'law_name': '법인세법 시행령',
                'article_number': '제41조',
                'clause': None,
                'title': '접대비의 범위 및 한도',
                'summary': '접대비는 업무와 관련된 자에게 접대, 교제, 기부, 의례 등의 목적으로 지출하는 금액을 말하며, 일정 한도 내에서만 손금 산입이 가능하다.',
                'full_text': '접대비란 접대, 교제, 사례 또는 그 밖에 이와 유사한 목적으로 지출하는 금액으로서 기밀비 및 사업상 필요하여 지출한 금액을 말한다.',
                'category': 'ENTERTAINMENT_LIMIT',
                'effective_from': '2010-01-01',
                'effective_until': None,
                'law_url': 'https://www.law.go.kr/lsEfInfoP.do?lsiSeq=19659',
                'related_mcc_codes': ['5812', '5813'],
                'auto_tag_conditions': {
                    'mcc_in': ['5812', '5813'],
                    'amount_gt': 30000  # 3만원 이상 접대비로 간주
                }
            },
        ]

        with self.driver.session() as session:
            for rule in tax_rules:
                query = """
                CREATE (tr:TaxRule {
                    id: $id,
                    law_name: $law_name,
                    article_number: $article_number,
                    clause: $clause,
                    title: $title,
                    summary: $summary,
                    full_text: $full_text,
                    category: $category,
                    effective_from: date($effective_from),
                    effective_until: $effective_until,
                    law_url: $law_url,
                    related_mcc_codes: $related_mcc_codes,
                    auto_tag_conditions: $auto_tag_conditions,
                    created_at: datetime(),
                    updated_at: datetime()
                })
                """

                params = {
                    **rule,
                    'auto_tag_conditions': json.dumps(rule['auto_tag_conditions'])
                }

                session.run(query, params)
                print(f"✅ Created TaxRule: {rule['law_name']} {rule['article_number']} - {rule['title']}")

    def create_taxrule_mcc_relationships(self):
        """TaxRule과 MCC 간의 관계 생성"""

        with self.driver.session() as session:
            query = """
            MATCH (tr:TaxRule)
            UNWIND tr.related_mcc_codes as mcc_code
            MATCH (mcc:MCC {code: mcc_code})
            MERGE (tr)-[:APPLIES_TO]->(mcc)
            """

            result = session.run(query)
            print(f"✅ Created TaxRule-MCC relationships")

    def verify_data(self):
        """데이터 검증"""
        with self.driver.session() as session:
            # TaxRule 개수
            result = session.run("MATCH (tr:TaxRule) RETURN count(tr) as count")
            count = result.single()['count']
            print(f"\n📊 TaxRule 개수: {count}")

            # 관계 개수
            result = session.run("""
                MATCH (tr:TaxRule)-[:APPLIES_TO]->(mcc:MCC)
                RETURN count(*) as count
            """)
            rel_count = result.single()['count']
            print(f"📊 TaxRule-MCC 관계 개수: {rel_count}")

            # 각 TaxRule 상세
            result = session.run("""
                MATCH (tr:TaxRule)
                OPTIONAL MATCH (tr)-[:APPLIES_TO]->(mcc:MCC)
                RETURN tr.law_name as law, tr.article_number as article,
                       tr.title as title, count(mcc) as mcc_count
                ORDER BY law, article
            """)

            print(f"\n📋 TaxRule 상세:")
            for record in result:
                print(f"  {record['law']} {record['article']}: {record['title']}")
                print(f"    → 연관 MCC: {record['mcc_count']}개")

def main():
    print("=" * 60)
    print("TaxRule 데이터 생성 시작")
    print("=" * 60)

    loader = TaxRuleLoader(NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD)

    try:
        print("\n🔧 Step 1: TaxRule 생성")
        print("-" * 60)
        loader.load_tax_rules()

        print("\n🔧 Step 2: TaxRule-MCC 관계 생성")
        print("-" * 60)
        loader.create_taxrule_mcc_relationships()

        print("\n🔍 Step 3: 데이터 검증")
        print("-" * 60)
        loader.verify_data()

        print("\n" + "=" * 60)
        print("✅ TaxRule 데이터 생성 완료!")
        print("=" * 60)

    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        loader.close()

if __name__ == "__main__":
    main()
