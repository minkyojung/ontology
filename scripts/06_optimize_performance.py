#!/usr/bin/env python3
"""
Performance optimization for Neo4j database
Add additional indexes and analyze query performance
"""

import os
from neo4j import GraphDatabase
from dotenv import load_dotenv

load_dotenv()

# Neo4j connection
driver = GraphDatabase.driver(
    os.getenv("NEO4J_URI"),
    auth=(os.getenv("NEO4J_USER"), os.getenv("NEO4J_PASSWORD"))
)


def create_performance_indexes(session):
    """Create additional indexes for frequently queried properties"""
    print("\n🔄 Creating performance indexes...")

    indexes = [
        # Transaction indexes
        ("CREATE INDEX transaction_date_idx IF NOT EXISTS FOR (t:Transaction) ON (t.transactionDate)", "Transaction.transactionDate"),
        ("CREATE INDEX transaction_risk_idx IF NOT EXISTS FOR (t:Transaction) ON (t.riskScore)", "Transaction.riskScore"),
        ("CREATE INDEX transaction_status_idx IF NOT EXISTS FOR (t:Transaction) ON (t.status)", "Transaction.status"),

        # Employee indexes
        ("CREATE INDEX employee_name_idx IF NOT EXISTS FOR (e:Employee) ON (e.name)", "Employee.name"),
        ("CREATE INDEX employee_dept_idx IF NOT EXISTS FOR (e:Employee) ON (e.department)", "Employee.department"),
        ("CREATE INDEX employee_risk_idx IF NOT EXISTS FOR (e:Employee) ON (e.riskScore)", "Employee.riskScore"),

        # Merchant indexes
        ("CREATE INDEX merchant_name_idx IF NOT EXISTS FOR (m:Merchant) ON (m.name)", "Merchant.name"),

        # MCC indexes
        ("CREATE INDEX mcc_risk_group_idx IF NOT EXISTS FOR (m:MCC) ON (m.risk_group)", "MCC.risk_group"),
        ("CREATE INDEX mcc_category_idx IF NOT EXISTS FOR (m:MCC) ON (m.category)", "MCC.category"),
    ]

    created_count = 0
    for query, index_name in indexes:
        try:
            session.run(query)
            created_count += 1
            print(f"   ✅ {index_name}")
        except Exception as e:
            print(f"   ⚠️  {index_name}: {str(e)}")

    print(f"\n✅ Created/verified {created_count} performance indexes")


def analyze_database_stats(session):
    """Analyze database statistics"""
    print("\n📊 Database Statistics:")

    # Count nodes by label
    labels = ["Employee", "Transaction", "Merchant", "MCC", "TaxRule", "Case", "Receipt", "Approval", "Trip", "Policy"]
    for label in labels:
        result = session.run(f"MATCH (n:{label}) RETURN count(n) as count")
        count = result.single()["count"]
        print(f"   {label:15s}: {count:6d}")

    # Count relationships
    print("\n📊 Relationship Statistics:")
    result = session.run("MATCH ()-[r]->() RETURN type(r) as relType, count(r) as count ORDER BY count DESC")
    for record in result:
        print(f"   {record['relType']:25s}: {record['count']:6d}")

    # High-risk transaction count
    print("\n⚠️  Risk Analysis:")
    result = session.run("""
        MATCH (t:Transaction)
        WITH
            sum(CASE WHEN t.riskScore >= 0.8 THEN 1 ELSE 0 END) as critical,
            sum(CASE WHEN t.riskScore >= 0.6 AND t.riskScore < 0.8 THEN 1 ELSE 0 END) as high,
            sum(CASE WHEN t.riskScore >= 0.3 AND t.riskScore < 0.6 THEN 1 ELSE 0 END) as medium,
            sum(CASE WHEN t.riskScore < 0.3 THEN 1 ELSE 0 END) as low,
            count(t) as total
        RETURN critical, high, medium, low, total
    """)
    record = result.single()
    total = record["total"]
    print(f"   🔴 CRITICAL (≥0.8): {record['critical']:4d} ({record['critical']/total*100:5.1f}%)")
    print(f"   🟠 HIGH (0.6-0.8):  {record['high']:4d} ({record['high']/total*100:5.1f}%)")
    print(f"   🟡 MEDIUM (0.3-0.6): {record['medium']:4d} ({record['medium']/total*100:5.1f}%)")
    print(f"   🟢 LOW (<0.3):      {record['low']:4d} ({record['low']/total*100:5.1f}%)")


def test_query_performance(session):
    """Test performance of common queries"""
    print("\n⏱️  Query Performance Tests:")

    queries = [
        ("Get Latest 50 Transactions", """
            MATCH (e:Employee)-[:MADE_TRANSACTION]->(t:Transaction)-[:AT_MERCHANT]->(m:Merchant)
            OPTIONAL MATCH (m)-[:HAS_MCC]->(mcc:MCC)
            WITH t, e, m, mcc
            ORDER BY t.transactionDate DESC
            LIMIT 50
            RETURN elementId(t) as id
        """),

        ("Get Employees with Transaction Count", """
            MATCH (e:Employee)
            OPTIONAL MATCH (e)-[:MADE_TRANSACTION]->(t:Transaction)
            WITH e, count(t) as totalTx
            RETURN elementId(e) as id, totalTx
        """),

        ("Get High-Risk Transactions", """
            MATCH (e:Employee)-[:MADE_TRANSACTION]->(t:Transaction)
            WHERE t.riskScore > 0.7
            MATCH (t)-[:AT_MERCHANT]->(m:Merchant)
            OPTIONAL MATCH (m)-[:HAS_MCC]->(mcc:MCC)
            RETURN elementId(t) as id
            LIMIT 50
        """),
    ]

    import time
    for query_name, query in queries:
        start = time.time()
        result = session.run(query)
        result.consume()  # Force execution
        elapsed = (time.time() - start) * 1000  # Convert to ms
        print(f"   {query_name:40s}: {elapsed:7.2f}ms")


def optimize_employee_risk_scores(session):
    """Recalculate and update employee risk scores for consistency"""
    print("\n🔄 Optimizing employee risk scores...")

    query = """
    MATCH (e:Employee)
    OPTIONAL MATCH (e)-[:MADE_TRANSACTION]->(t:Transaction)
    WITH e, AVG(t.riskScore) as avgRisk
    WHERE avgRisk IS NOT NULL
    SET e.riskScore = avgRisk
    RETURN count(e) as updated
    """

    result = session.run(query)
    record = result.single()
    print(f"✅ Updated {record['updated']} employee risk scores")


def main():
    print("🚀 Starting Neo4j Performance Optimization...")

    with driver.session() as session:
        create_performance_indexes(session)
        optimize_employee_risk_scores(session)
        analyze_database_stats(session)
        test_query_performance(session)

    driver.close()
    print("\n✅ Performance optimization completed!")


if __name__ == "__main__":
    main()
