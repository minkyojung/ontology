#!/usr/bin/env python3
"""
Generate comprehensive test data for expense fraud detection system
"""

import os
from datetime import datetime, timedelta
import random
from neo4j import GraphDatabase
from dotenv import load_dotenv

load_dotenv()

# Neo4j connection
driver = GraphDatabase.driver(
    os.getenv("NEO4J_URI"),
    auth=(os.getenv("NEO4J_USER"), os.getenv("NEO4J_PASSWORD"))
)

# Korean names for employees
KOREAN_NAMES = [
    "김민준", "이서연", "박지훈", "최유나", "정도윤",
    "강서준", "조수빈", "윤예준", "임하은", "한지우",
    "신은우", "오서우", "배지호", "송지아", "노지후",
    "홍지안", "양시우", "서민서", "곽예린", "권현우",
    "황지윤", "문채원", "장건우", "전다은", "전예서",
    "성지훈", "고민준", "안서현", "조유진", "문지민",
    "류지안", "김태양", "이하린", "박연우", "최지환",
    "정수아", "강지원", "조아인", "윤우진", "임시은",
    "한채은", "신지호", "오예나", "배시온", "송하준",
    "노유빈", "홍은서", "양도현", "서예준", "곽채윤"
]

# Department list
DEPARTMENTS = [
    "개발팀", "마케팅팀", "영업팀", "인사팀", "재무팀",
    "기획팀", "디자인팀", "운영팀", "법무팀", "CS팀"
]

# Merchant names with MCC codes (using existing MCC codes in DB)
MERCHANTS = [
    # NORMAL (5411, 5812, 5542, 5732, 4111)
    {"name": "GS25 강남점", "mcc": "5411"},
    {"name": "CU 역삼점", "mcc": "5411"},
    {"name": "세븐일레븐 서초점", "mcc": "5411"},
    {"name": "이마트 양재점", "mcc": "5411"},
    {"name": "롯데마트 잠실점", "mcc": "5411"},

    {"name": "카페베네 신사점", "mcc": "5812"},
    {"name": "스타벅스 강남역점", "mcc": "5812"},
    {"name": "투썸플레이스 테헤란점", "mcc": "5812"},
    {"name": "빽다방 역삼점", "mcc": "5812"},
    {"name": "이디야커피 서초점", "mcc": "5812"},

    {"name": "오피스디포 강남점", "mcc": "5732"},
    {"name": "알파문구 역삼점", "mcc": "5732"},
    {"name": "모닝글로리 서초점", "mcc": "5732"},

    {"name": "현대주차장 강남센터", "mcc": "5542"},
    {"name": "삼성파킹 역삼지점", "mcc": "5542"},

    {"name": "한국철도공사 KTX", "mcc": "4111"},
    {"name": "대한항공", "mcc": "4111"},
    {"name": "아시아나항공", "mcc": "4111"},

    # GRAY (7273, 5813, 5921, 7523)
    {"name": "강남게임랜드", "mcc": "7273"},
    {"name": "역삼오락실", "mcc": "7273"},

    {"name": "청담 Bar & Lounge", "mcc": "5813"},
    {"name": "강남 술집", "mcc": "5813"},
    {"name": "역삼 나이트클럽", "mcc": "5813"},

    {"name": "소주한잔 강남점", "mcc": "5921"},
    {"name": "맥주창고 역삼점", "mcc": "5921"},

    {"name": "프리미엄 파킹 서비스", "mcc": "7523"},

    # BLACK (7995, 6051, 6010, 6011)
    {"name": "Online Casino XYZ", "mcc": "7995"},
    {"name": "Lucky Bet Casino", "mcc": "7995"},
    {"name": "Golden Palace Gambling", "mcc": "7995"},

    {"name": "Crypto ATM Seoul", "mcc": "6051"},
    {"name": "Bitcoin Exchange KR", "mcc": "6051"},

    {"name": "Cash Advance Service", "mcc": "6010"},
    {"name": "Quick Cash Seoul", "mcc": "6010"},

    {"name": "ATM Cash Withdrawal", "mcc": "6011"},
]

# Trip/Event names
TRIP_EVENTS = [
    "2024 Q1 워크샵", "2024 Q2 워크샵", "2024 Q3 워크샵", "2024 Q4 워크샵",
    "고객사 미팅 (삼성전자)", "고객사 미팅 (LG전자)", "고객사 미팅 (현대자동차)",
    "해외 출장 (일본)", "해외 출장 (미국)", "해외 출장 (중국)",
    "컨퍼런스 참가 (AWS Summit)", "컨퍼런스 참가 (Google I/O)",
    "제품 발표회 준비", "연말 시상식", "팀 빌딩 이벤트",
    "교육 세미나", "채용 박람회", "파트너사 미팅",
    "신제품 론칭 이벤트", "사내 해커톤 대회"
]

# Policy names
POLICIES = [
    {"name": "법인카드 사용 규정", "version": "v2.1", "effective": "2024-01-01"},
    {"name": "출장비 지급 규정", "version": "v1.5", "effective": "2024-01-01"},
    {"name": "접대비 사용 지침", "version": "v3.0", "effective": "2024-03-01"},
    {"name": "교육비 지원 정책", "version": "v1.2", "effective": "2024-01-01"},
    {"name": "복리후생비 운영 규정", "version": "v2.0", "effective": "2024-01-01"},
]


def generate_employees(session, count=50):
    """Generate employee nodes"""
    print(f"\n🔄 Generating {count} employees...")

    employees = []
    for i in range(count):
        emp_id = f"EMP{1001 + i}"
        name = KOREAN_NAMES[i]
        dept = random.choice(DEPARTMENTS)
        hire_date = (datetime.now() - timedelta(days=random.randint(365, 3650))).strftime("%Y-%m-%d")

        query = """
        CREATE (e:Employee {
            employeeId: $employeeId,
            name: $name,
            email: $email,
            department: $department,
            position: $position,
            hireDate: date($hireDate),
            status: 'ACTIVE',
            riskScore: 0.0
        })
        RETURN e.employeeId as employeeId, e.name as name
        """

        result = session.run(query,
            employeeId=emp_id,
            name=name,
            email=f"{emp_id.lower()}@company.com",
            department=dept,
            position=random.choice(["사원", "대리", "과장", "차장", "부장"]),
            hireDate=hire_date
        )

        record = result.single()
        employees.append({"id": record["employeeId"], "name": record["name"]})

    print(f"✅ Created {len(employees)} employees")
    return employees


def generate_merchants(session):
    """Generate merchant nodes and link to MCC"""
    print(f"\n🔄 Generating {len(MERCHANTS)} merchants...")

    merchants = []
    for merchant in MERCHANTS:
        query = """
        MATCH (m:MCC {code: $mcc})
        CREATE (merchant:Merchant {
            merchantId: randomUUID(),
            name: $name,
            country: 'KR',
            city: 'Seoul',
            registeredAt: datetime()
        })
        CREATE (merchant)-[:HAS_MCC]->(m)
        RETURN merchant.merchantId as merchantId, merchant.name as name, m.code as mcc, m.risk_group as riskGroup
        """

        result = session.run(query, name=merchant["name"], mcc=merchant["mcc"])
        record = result.single()

        if record:
            merchants.append({
                "id": record["merchantId"],
                "name": record["name"],
                "mcc": record["mcc"],
                "riskLevel": record["riskGroup"]
            })

    print(f"✅ Created {len(merchants)} merchants")
    return merchants


def generate_trips(session, count=20):
    """Generate trip/event nodes"""
    print(f"\n🔄 Generating {count} trips/events...")

    trips = []
    for i in range(count):
        trip_name = TRIP_EVENTS[i]
        start_date = datetime.now() - timedelta(days=random.randint(1, 180))
        end_date = start_date + timedelta(days=random.randint(1, 7))

        query = """
        CREATE (t:Trip {
            tripId: $tripId,
            name: $name,
            purpose: $purpose,
            startDate: date($startDate),
            endDate: date($endDate),
            budget: $budget,
            status: $status
        })
        RETURN t.tripId as tripId
        """

        result = session.run(query,
            tripId=f"TRIP{2001 + i}",
            name=trip_name,
            purpose=random.choice(["업무출장", "고객미팅", "교육", "컨퍼런스", "팀빌딩"]),
            startDate=start_date.strftime("%Y-%m-%d"),
            endDate=end_date.strftime("%Y-%m-%d"),
            budget=random.randint(500000, 5000000),
            status=random.choice(["APPROVED", "COMPLETED", "IN_PROGRESS"])
        )

        record = result.single()
        trips.append(record["tripId"])

    print(f"✅ Created {len(trips)} trips/events")
    return trips


def generate_policies(session):
    """Generate policy nodes"""
    print(f"\n🔄 Generating {len(POLICIES)} policies...")

    for policy in POLICIES:
        query = """
        CREATE (p:Policy {
            policyId: randomUUID(),
            name: $name,
            version: $version,
            effectiveDate: date($effectiveDate),
            description: $description,
            status: 'ACTIVE'
        })
        """

        session.run(query,
            name=policy["name"],
            version=policy["version"],
            effectiveDate=policy["effective"],
            description=f"{policy['name']} 상세 규정"
        )

    print(f"✅ Created {len(POLICIES)} policies")


def generate_transactions(session, employees, merchants, trips, count=500):
    """Generate transaction nodes with various fraud scenarios"""
    print(f"\n🔄 Generating {count} transactions...")

    transactions = []
    fraud_scenarios = {
        "CRITICAL": 0,  # Blacklist violations
        "HIGH": 0,      # Gray + high amount or suspicious patterns
        "MEDIUM": 0,    # Gray + normal amount
        "LOW": 0        # Normal transactions
    }

    base_date = datetime.now() - timedelta(days=90)

    for i in range(count):
        employee = random.choice(employees)
        merchant = random.choice(merchants)

        # Determine transaction scenario based on MCC risk level
        risk_level = merchant["riskLevel"]

        if risk_level == "BLACK":
            # Critical fraud: blacklist MCC
            amount = random.randint(50000, 500000)
            risk_score = random.uniform(0.8, 1.0)
            fraud_scenarios["CRITICAL"] += 1

        elif risk_level == "GRAY":
            # High/Medium risk based on amount
            amount = random.randint(30000, 1000000)
            if amount > 500000:
                risk_score = random.uniform(0.6, 0.8)
                fraud_scenarios["HIGH"] += 1
            else:
                risk_score = random.uniform(0.4, 0.6)
                fraud_scenarios["MEDIUM"] += 1

        else:  # NORMAL
            # Low risk
            amount = random.randint(5000, 200000)
            risk_score = random.uniform(0.0, 0.3)
            fraud_scenarios["LOW"] += 1

        # Random transaction date within last 90 days
        trans_date = base_date + timedelta(days=random.randint(0, 89))

        query = """
        MATCH (e:Employee {employeeId: $employeeId})
        MATCH (m:Merchant {merchantId: $merchantId})
        CREATE (t:Transaction {
            transactionId: $transactionId,
            amount: $amount,
            currency: 'KRW',
            transactionDate: datetime($transactionDate),
            description: $description,
            status: $status,
            riskScore: $riskScore
        })
        CREATE (e)-[:MADE_TRANSACTION]->(t)
        CREATE (t)-[:AT_MERCHANT]->(m)
        """

        params = {
            "transactionId": f"TX{10001 + i}",
            "employeeId": employee["id"],
            "merchantId": merchant["id"],
            "amount": amount,
            "transactionDate": trans_date.isoformat(),
            "description": f"{merchant['name']}에서 결제",
            "status": random.choice(["COMPLETED", "PENDING"]),
            "riskScore": risk_score
        }

        # Optionally link to trip
        if random.random() < 0.3 and trips:  # 30% chance
            trip_id = random.choice(trips)
            query += """
            WITH t
            MATCH (trip:Trip {tripId: $tripId})
            CREATE (t)-[:FOR_TRIP]->(trip)
            """
            params["tripId"] = trip_id

        query += " RETURN t.transactionId as transactionId"

        result = session.run(query, **params)
        record = result.single()

        transactions.append({
            "id": record["transactionId"],
            "employeeId": employee["id"],
            "merchantId": merchant["id"],
            "amount": amount,
            "riskScore": risk_score,
            "riskLevel": risk_level
        })

    print(f"✅ Created {len(transactions)} transactions")
    print(f"   📊 Risk Distribution:")
    print(f"      🔴 CRITICAL: {fraud_scenarios['CRITICAL']}")
    print(f"      🟠 HIGH: {fraud_scenarios['HIGH']}")
    print(f"      🟡 MEDIUM: {fraud_scenarios['MEDIUM']}")
    print(f"      🟢 LOW: {fraud_scenarios['LOW']}")

    return transactions, fraud_scenarios


def generate_receipts(session, transactions, coverage=0.7):
    """Generate receipt nodes for some transactions"""
    print(f"\n🔄 Generating receipts (coverage: {coverage*100}%)...")

    receipts_count = 0
    for trans in transactions:
        if random.random() < coverage:
            query = """
            MATCH (t:Transaction {transactionId: $transactionId})
            CREATE (r:Receipt {
                receiptId: randomUUID(),
                imageUrl: $imageUrl,
                uploadedAt: datetime(),
                verified: $verified
            })
            CREATE (t)-[:HAS_RECEIPT]->(r)
            """

            session.run(query,
                transactionId=trans["id"],
                imageUrl=f"s3://receipts/{trans['id']}.jpg",
                verified=random.choice([True, False])
            )
            receipts_count += 1

    print(f"✅ Created {receipts_count} receipts")
    print(f"   ⚠️  Missing receipts: {len(transactions) - receipts_count}")


def generate_approvals(session, transactions, approval_rate=0.6):
    """Generate approval nodes for some transactions"""
    print(f"\n🔄 Generating approvals (rate: {approval_rate*100}%)...")

    approvals_count = 0
    for trans in transactions:
        if random.random() < approval_rate:
            query = """
            MATCH (t:Transaction {transactionId: $transactionId})
            CREATE (a:Approval {
                approvalId: randomUUID(),
                approvedBy: $approvedBy,
                approvedAt: datetime(),
                status: $status,
                comments: $comments
            })
            CREATE (t)-[:HAS_APPROVAL]->(a)
            """

            session.run(query,
                transactionId=trans["id"],
                approvedBy=random.choice(["MGR001", "MGR002", "MGR003"]),
                status=random.choice(["APPROVED", "PENDING", "REJECTED"]),
                comments=random.choice([
                    "승인",
                    "확인 완료",
                    "정상 업무 비용으로 확인됨",
                    "추가 검토 필요",
                    ""
                ])
            )
            approvals_count += 1

    print(f"✅ Created {approvals_count} approvals")


def detect_and_create_cases(session, transactions):
    """Detect fraudulent transactions and create cases"""
    print(f"\n🔄 Detecting fraud and creating cases...")

    cases_count = 0

    for trans in transactions:
        # Create cases for high-risk transactions
        if trans["riskScore"] >= 0.7:
            # Get MCC and TaxRule info
            query = """
            MATCH (t:Transaction {transactionId: $transactionId})
            MATCH (t)-[:AT_MERCHANT]->(m:Merchant)-[:HAS_MCC]->(mcc:MCC)
            OPTIONAL MATCH (mcc)<-[:APPLIES_TO_MCC]-(rule:TaxRule)

            CREATE (c:Case {
                caseId: randomUUID(),
                severity: $severity,
                status: 'OPEN',
                createdAt: datetime(),
                description: $description,
                assignedTo: 'FRAUD_TEAM'
            })

            CREATE (c)-[:RELATED_TO_TRANSACTION]->(t)

            WITH c, rule
            WHERE rule IS NOT NULL
            CREATE (c)-[:CITES_RULE]->(rule)

            RETURN c.caseId as caseId
            """

            severity = "CRITICAL" if trans["riskLevel"] == "BLACK" else "HIGH"
            description = f"High-risk transaction detected (Score: {trans['riskScore']:.2f})"

            if trans["riskLevel"] == "BLACK":
                description += " - Blacklist MCC violation"

            result = session.run(query,
                transactionId=trans["id"],
                severity=severity,
                description=description
            )

            if result.single():
                cases_count += 1

    print(f"✅ Created {cases_count} fraud cases")
    return cases_count


def update_employee_risk_scores(session):
    """Update employee risk scores based on their transactions"""
    print(f"\n🔄 Updating employee risk scores...")

    query = """
    MATCH (e:Employee)-[:MADE_TRANSACTION]->(t:Transaction)
    WITH e, AVG(t.riskScore) as avgRisk, COUNT(t) as txCount
    SET e.riskScore = avgRisk
    RETURN COUNT(e) as updated
    """

    result = session.run(query)
    record = result.single()
    print(f"✅ Updated {record['updated']} employee risk scores")


def print_summary(session, fraud_scenarios, cases_count):
    """Print data summary"""
    print(f"\n{'='*60}")
    print(f"📊 TEST DATA GENERATION SUMMARY")
    print(f"{'='*60}")

    # Count nodes
    counts = {}
    for label in ["Employee", "Merchant", "Transaction", "Receipt", "Trip", "Policy", "Approval", "Case", "MCC", "TaxRule"]:
        result = session.run(f"MATCH (n:{label}) RETURN COUNT(n) as count")
        counts[label] = result.single()["count"]

    print(f"\n📦 Node Counts:")
    for label, count in counts.items():
        print(f"   {label:15s}: {count:4d}")

    print(f"\n🎯 Transaction Risk Distribution:")
    total_tx = sum(fraud_scenarios.values())
    for level, count in fraud_scenarios.items():
        pct = (count / total_tx * 100) if total_tx > 0 else 0
        print(f"   {level:10s}: {count:4d} ({pct:5.1f}%)")

    print(f"\n🚨 Fraud Detection:")
    print(f"   Cases Created: {cases_count}")

    print(f"\n{'='*60}\n")


def main():
    print("🚀 Starting comprehensive test data generation...")
    print(f"   Target: 50 employees, 500 transactions, ~100 merchants")

    with driver.session() as session:
        # Clear existing data (optional)
        print("\n⚠️  Clearing existing data (keeping MCC and TaxRule)...")
        session.run("MATCH (n) WHERE NOT n:MCC AND NOT n:TaxRule DETACH DELETE n")
        print("✅ Cleared existing data")

        # Generate data
        employees = generate_employees(session, count=50)
        merchants = generate_merchants(session)
        trips = generate_trips(session, count=20)
        generate_policies(session)

        transactions, fraud_scenarios = generate_transactions(
            session, employees, merchants, trips, count=500
        )

        generate_receipts(session, transactions, coverage=0.7)
        generate_approvals(session, transactions, approval_rate=0.6)

        cases_count = detect_and_create_cases(session, transactions)

        update_employee_risk_scores(session)

        print_summary(session, fraud_scenarios, cases_count)

    driver.close()
    print("✅ Test data generation completed!")


if __name__ == "__main__":
    main()
