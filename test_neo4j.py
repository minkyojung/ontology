"""
Neo4j 연결 테스트
"""
from neo4j import GraphDatabase

# Neo4j 연결 정보
URI = "neo4j://localhost:7687"
AUTH = ("neo4j", "ontology123")

def test_connection():
    """Neo4j 연결 테스트"""
    driver = GraphDatabase.driver(URI, auth=AUTH)

    try:
        # 연결 확인
        driver.verify_connectivity()
        print("✅ Neo4j 연결 성공!")

        # 간단한 쿼리 실행
        with driver.session() as session:
            result = session.run("RETURN 'Hello Neo4j!' AS message")
            record = result.single()
            print(f"✅ 쿼리 실행 성공: {record['message']}")

    except Exception as e:
        print(f"❌ 연결 실패: {e}")
    finally:
        driver.close()

if __name__ == "__main__":
    test_connection()
