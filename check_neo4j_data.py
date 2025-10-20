#!/usr/bin/env python3
"""Neo4j 데이터 확인 스크립트"""

from neo4j import GraphDatabase

# Neo4j 연결
driver = GraphDatabase.driver(
    "bolt://localhost:7687",
    auth=("neo4j", "ontology123")
)

def check_data():
    with driver.session() as session:
        # 전체 노드 개수
        result = session.run("MATCH (n) RETURN count(n) as total")
        total_nodes = result.single()["total"]
        print(f"✅ 전체 노드: {total_nodes}")

        if total_nodes == 0:
            print("❌ 데이터가 없습니다. 샘플 데이터를 생성하세요.")
            return False

        # Transaction 개수
        result = session.run("MATCH (t:Transaction) RETURN count(t) as total")
        transactions = result.single()["total"]
        print(f"📝 Transaction 노드: {transactions}")

        # Employee 개수
        result = session.run("MATCH (e:Employee) RETURN count(e) as total")
        employees = result.single()["total"]
        print(f"👤 Employee 노드: {employees}")

        # Merchant 개수
        result = session.run("MATCH (m:Merchant) RETURN count(m) as total")
        merchants = result.single()["total"]
        print(f"🏪 Merchant 노드: {merchants}")

        # 관계 개수
        result = session.run("MATCH ()-[r]->() RETURN count(r) as total")
        relationships = result.single()["total"]
        print(f"🔗 관계: {relationships}")

        # 샘플 Transaction 출력
        print("\n📊 샘플 Transaction (최대 3개):")
        result = session.run("""
            MATCH (e:Employee)-[:MADE]->(t:Transaction)-[:AT_MERCHANT]->(m:Merchant)
            RETURN e.name as employee, t.amount as amount, m.name as merchant, t.status as status
            LIMIT 3
        """)
        for record in result:
            print(f"  - {record['employee']}: ₩{record['amount']:,} at {record['merchant']} ({record['status']})")

        return True

if __name__ == "__main__":
    try:
        print("🔍 Neo4j 데이터 확인 중...\n")
        has_data = check_data()

        if not has_data:
            print("\n💡 다음 명령어로 샘플 데이터를 생성하세요:")
            print("   python fraud_detection.py")
        else:
            print("\n✅ 데이터가 존재합니다! 대시보드를 새로고침하세요.")
            print("   http://localhost:3001/dashboard")

    except Exception as e:
        print(f"❌ 에러 발생: {e}")
        print("\n💡 확인사항:")
        print("   1. Neo4j가 실행 중인지: docker ps | grep neo4j")
        print("   2. 비밀번호가 맞는지: .env.local 파일 확인")
    finally:
        driver.close()
