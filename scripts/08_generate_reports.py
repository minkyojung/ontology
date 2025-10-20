#!/usr/bin/env python3
"""
보고서 생성 스크립트

월별/분기별 사기 탐지 리포트, 룰 효과성 분석, 성과 추적 및 최적화 제안을 생성합니다.
"""

from neo4j import GraphDatabase
from datetime import datetime, timedelta
from collections import defaultdict
import json
import os
from dotenv import load_dotenv

load_dotenv()

driver = GraphDatabase.driver(
    os.getenv("NEO4J_URI"),
    auth=(os.getenv("NEO4J_USER"), os.getenv("NEO4J_PASSWORD"))
)


def generate_monthly_report(year: int, month: int):
    """월별 사기 탐지 리포트 생성"""
    with driver.session() as session:
        # 해당 월의 시작일과 종료일
        start_date = datetime(year, month, 1)
        if month == 12:
            end_date = datetime(year + 1, 1, 1)
        else:
            end_date = datetime(year, month + 1, 1)

        # 총 거래 수
        total_txns = session.run("""
            MATCH (t:Transaction)
            WHERE datetime(t.timestamp) >= datetime($start)
              AND datetime(t.timestamp) < datetime($end)
            RETURN count(t) as total
        """, start=start_date.isoformat(), end=end_date.isoformat()).single()

        # 생성된 케이스 수
        total_cases = session.run("""
            MATCH (c:FraudCase)
            WHERE datetime(c.created_at) >= datetime($start)
              AND datetime(c.created_at) < datetime($end)
            RETURN count(c) as total
        """, start=start_date.isoformat(), end=end_date.isoformat()).single()

        # 케이스 상태별 분포
        case_status = session.run("""
            MATCH (c:FraudCase)
            WHERE datetime(c.created_at) >= datetime($start)
              AND datetime(c.created_at) < datetime($end)
            RETURN c.status as status, count(*) as count
        """, start=start_date.isoformat(), end=end_date.isoformat()).data()

        # MCC별 탐지 건수
        mcc_detections = session.run("""
            MATCH (c:FraudCase)-[:INVOLVES]->(t:Transaction)-[:AT_MERCHANT]->(m:Merchant)-[:HAS_MCC]->(mcc:MCC)
            WHERE datetime(c.created_at) >= datetime($start)
              AND datetime(c.created_at) < datetime($end)
            RETURN mcc.code as mcc_code, mcc.description as mcc_desc, mcc.risk_level as risk_level,
                   count(DISTINCT c) as case_count,
                   sum(t.amount) as total_amount
            ORDER BY case_count DESC
            LIMIT 20
        """, start=start_date.isoformat(), end=end_date.isoformat()).data()

        # 복구 가능 금액
        recovery_potential = session.run("""
            MATCH (c:FraudCase)-[:INVOLVES]->(t:Transaction)
            WHERE datetime(c.created_at) >= datetime($start)
              AND datetime(c.created_at) < datetime($end)
              AND c.status IN ['FLAGGED', 'UNDER_REVIEW']
            RETURN sum(t.amount) as total
        """, start=start_date.isoformat(), end=end_date.isoformat()).single()

        # 직원별 탐지 건수 (Top 10)
        employee_cases = session.run("""
            MATCH (c:FraudCase)-[:INVOLVES]->(t:Transaction)-[:SUBMITTED_BY]->(e:Employee)
            WHERE datetime(c.created_at) >= datetime($start)
              AND datetime(c.created_at) < datetime($end)
            RETURN e.employee_id as employee_id, e.name as name, e.department as department,
                   count(DISTINCT c) as case_count,
                   sum(t.amount) as total_amount
            ORDER BY case_count DESC
            LIMIT 10
        """, start=start_date.isoformat(), end=end_date.isoformat()).data()

        report = {
            "period": f"{year}-{month:02d}",
            "type": "monthly",
            "generated_at": datetime.now().isoformat(),
            "summary": {
                "total_transactions": total_txns["total"] if total_txns else 0,
                "total_cases": total_cases["total"] if total_cases else 0,
                "detection_rate": round((total_cases["total"] / total_txns["total"] * 100) if total_txns and total_txns["total"] > 0 else 0, 2),
                "recovery_potential": recovery_potential["total"] if recovery_potential else 0
            },
            "case_status_breakdown": case_status,
            "top_mcc_detections": mcc_detections,
            "top_employees": employee_cases
        }

        return report


def generate_quarterly_report(year: int, quarter: int):
    """분기별 사기 탐지 리포트 생성"""
    # 분기 시작/종료월 계산
    start_month = (quarter - 1) * 3 + 1
    end_month = start_month + 3

    start_date = datetime(year, start_month, 1)
    if end_month > 12:
        end_date = datetime(year + 1, end_month - 12, 1)
    else:
        end_date = datetime(year, end_month, 1)

    with driver.session() as session:
        # 총 거래 수
        total_txns = session.run("""
            MATCH (t:Transaction)
            WHERE datetime(t.timestamp) >= datetime($start)
              AND datetime(t.timestamp) < datetime($end)
            RETURN count(t) as total
        """, start=start_date.isoformat(), end=end_date.isoformat()).single()

        # 생성된 케이스 수
        total_cases = session.run("""
            MATCH (c:FraudCase)
            WHERE datetime(c.created_at) >= datetime($start)
              AND datetime(c.created_at) < datetime($end)
            RETURN count(c) as total
        """, start=start_date.isoformat(), end=end_date.isoformat()).single()

        # 월별 트렌드
        monthly_trend = session.run("""
            MATCH (c:FraudCase)
            WHERE datetime(c.created_at) >= datetime($start)
              AND datetime(c.created_at) < datetime($end)
            WITH c,
                 datetime(c.created_at).year as year,
                 datetime(c.created_at).month as month
            RETURN year, month, count(*) as case_count
            ORDER BY year, month
        """, start=start_date.isoformat(), end=end_date.isoformat()).data()

        # 복구 가능 금액
        recovery_potential = session.run("""
            MATCH (c:FraudCase)-[:INVOLVES]->(t:Transaction)
            WHERE datetime(c.created_at) >= datetime($start)
              AND datetime(c.created_at) < datetime($end)
              AND c.status IN ['FLAGGED', 'UNDER_REVIEW']
            RETURN sum(t.amount) as total
        """, start=start_date.isoformat(), end=end_date.isoformat()).single()

        # 실제 승인된 케이스의 금액
        approved_amount = session.run("""
            MATCH (c:FraudCase)-[:INVOLVES]->(t:Transaction)
            WHERE datetime(c.created_at) >= datetime($start)
              AND datetime(c.created_at) < datetime($end)
              AND c.status = 'APPROVED'
            RETURN sum(t.amount) as total
        """, start=start_date.isoformat(), end=end_date.isoformat()).single()

        report = {
            "period": f"{year}-Q{quarter}",
            "type": "quarterly",
            "generated_at": datetime.now().isoformat(),
            "summary": {
                "total_transactions": total_txns["total"] if total_txns else 0,
                "total_cases": total_cases["total"] if total_cases else 0,
                "detection_rate": round((total_cases["total"] / total_txns["total"] * 100) if total_txns and total_txns["total"] > 0 else 0, 2),
                "recovery_potential": recovery_potential["total"] if recovery_potential else 0,
                "approved_fraud_amount": approved_amount["total"] if approved_amount else 0
            },
            "monthly_trend": monthly_trend
        }

        return report


def analyze_rule_effectiveness():
    """룰 효과성 분석"""
    with driver.session() as session:
        # 각 룰이 생성한 케이스 수 (시뮬레이션을 위해 MCC 기반으로 분류)
        rule_performance = session.run("""
            MATCH (c:FraudCase)-[:INVOLVES]->(t:Transaction)-[:AT_MERCHANT]->(m:Merchant)-[:HAS_MCC]->(mcc:MCC)
            WITH mcc.risk_level as rule_type, count(DISTINCT c) as cases_generated
            RETURN rule_type, cases_generated
            ORDER BY cases_generated DESC
        """).data()

        # MCC 블랙리스트 룰 효과성
        blacklist_performance = session.run("""
            MATCH (c:FraudCase)-[:INVOLVES]->(t:Transaction)-[:AT_MERCHANT]->(m:Merchant)-[:HAS_MCC]->(mcc:MCC)
            WHERE mcc.risk_level = 'BLACK'
            WITH c, t
            RETURN
                count(DISTINCT c) as total_cases,
                count(DISTINCT CASE WHEN c.status = 'APPROVED' THEN c END) as true_positives,
                count(DISTINCT CASE WHEN c.status = 'REJECTED' THEN c END) as false_positives,
                sum(t.amount) as total_amount_flagged
        """).single()

        # 그레이리스트 룰 효과성
        graylist_performance = session.run("""
            MATCH (c:FraudCase)-[:INVOLVES]->(t:Transaction)-[:AT_MERCHANT]->(m:Merchant)-[:HAS_MCC]->(mcc:MCC)
            WHERE mcc.risk_level = 'GRAY'
            WITH c, t
            RETURN
                count(DISTINCT c) as total_cases,
                count(DISTINCT CASE WHEN c.status = 'APPROVED' THEN c END) as true_positives,
                count(DISTINCT CASE WHEN c.status = 'REJECTED' THEN c END) as false_positives,
                sum(t.amount) as total_amount_flagged
        """).single()

        # 룰별 정확도 계산
        def calculate_accuracy(perf):
            if not perf or perf["total_cases"] == 0:
                return 0
            tp = perf["true_positives"] or 0
            total = perf["total_cases"]
            return round(tp / total * 100, 2)

        blacklist_accuracy = calculate_accuracy(blacklist_performance)
        graylist_accuracy = calculate_accuracy(graylist_performance)

        # 룰 최적화 제안
        recommendations = []

        if blacklist_accuracy < 70:
            recommendations.append({
                "rule": "MCC Blacklist",
                "issue": f"낮은 정확도 ({blacklist_accuracy}%)",
                "suggestion": "블랙리스트 MCC 코드를 재검토하고, False Positive가 많은 MCC를 그레이리스트로 이동"
            })

        if graylist_accuracy > 80:
            recommendations.append({
                "rule": "MCC Graylist",
                "issue": f"높은 정확도 ({graylist_accuracy}%)",
                "suggestion": "그레이리스트의 고위험 MCC를 블랙리스트로 승격하여 자동 탐지율 향상"
            })

        # 비활성 룰 탐지 (케이스를 거의 생성하지 않는 룰)
        for rule in rule_performance:
            if rule["cases_generated"] < 5:
                recommendations.append({
                    "rule": f"Rule: {rule['rule_type']}",
                    "issue": f"낮은 탐지율 ({rule['cases_generated']}건)",
                    "suggestion": "룰 파라미터를 조정하거나 비활성화 고려"
                })

        return {
            "generated_at": datetime.now().isoformat(),
            "rule_performance": rule_performance,
            "blacklist_rule": {
                "total_cases": blacklist_performance["total_cases"] if blacklist_performance else 0,
                "true_positives": blacklist_performance["true_positives"] if blacklist_performance else 0,
                "false_positives": blacklist_performance["false_positives"] if blacklist_performance else 0,
                "accuracy": blacklist_accuracy,
                "total_amount_flagged": blacklist_performance["total_amount_flagged"] if blacklist_performance else 0
            },
            "graylist_rule": {
                "total_cases": graylist_performance["total_cases"] if graylist_performance else 0,
                "true_positives": graylist_performance["true_positives"] if graylist_performance else 0,
                "false_positives": graylist_performance["false_positives"] if graylist_performance else 0,
                "accuracy": graylist_accuracy,
                "total_amount_flagged": graylist_performance["total_amount_flagged"] if graylist_performance else 0
            },
            "recommendations": recommendations
        }


def analyze_performance_trends():
    """성과 추적 - 시간별 트렌드 분석"""
    with driver.session() as session:
        # 최근 6개월 월별 탐지율
        six_months_ago = datetime.now() - timedelta(days=180)

        monthly_detection_rate = session.run("""
            MATCH (c:FraudCase)
            WHERE datetime(c.created_at) >= datetime($start)
            WITH datetime(c.created_at).year as year,
                 datetime(c.created_at).month as month,
                 count(*) as case_count
            MATCH (t:Transaction)
            WHERE datetime(t.timestamp) >= datetime($start)
            WITH year, month, case_count, count(t) as txn_count
            RETURN year, month, case_count, txn_count,
                   round(toFloat(case_count) / txn_count * 100, 2) as detection_rate
            ORDER BY year, month
        """, start=six_months_ago.isoformat()).data()

        # 평균 처리 시간 (케이스 생성 → 결정까지)
        avg_resolution_time = session.run("""
            MATCH (c:FraudCase)
            WHERE c.status IN ['APPROVED', 'REJECTED']
              AND c.updated_at IS NOT NULL
            WITH duration.between(datetime(c.created_at), datetime(c.updated_at)) as resolution_duration
            RETURN avg(resolution_duration.hours) as avg_hours
        """).single()

        # 직원별 재발률 (여러 번 적발된 직원)
        repeat_offenders = session.run("""
            MATCH (c:FraudCase)-[:INVOLVES]->(t:Transaction)-[:SUBMITTED_BY]->(e:Employee)
            WHERE c.status = 'APPROVED'
            WITH e, count(DISTINCT c) as case_count
            WHERE case_count >= 2
            RETURN e.employee_id as employee_id, e.name as name,
                   case_count as fraud_cases
            ORDER BY case_count DESC
            LIMIT 10
        """).data()

        return {
            "generated_at": datetime.now().isoformat(),
            "monthly_trends": monthly_detection_rate,
            "avg_resolution_hours": avg_resolution_time["avg_hours"] if avg_resolution_time else 0,
            "repeat_offenders": repeat_offenders
        }


def main():
    """메인 함수 - 모든 리포트 생성"""
    print("🔄 Starting report generation...")

    # 현재 날짜 기준
    now = datetime.now()
    current_year = now.year
    current_month = now.month
    current_quarter = (current_month - 1) // 3 + 1

    # 출력 디렉토리 생성
    os.makedirs("reports", exist_ok=True)

    # 1. 월별 리포트 생성 (이번 달)
    print(f"📅 Generating monthly report for {current_year}-{current_month:02d}...")
    monthly_report = generate_monthly_report(current_year, current_month)
    with open(f"reports/monthly_{current_year}_{current_month:02d}.json", "w") as f:
        json.dump(monthly_report, f, indent=2, ensure_ascii=False)

    # 2. 분기별 리포트 생성 (이번 분기)
    print(f"📊 Generating quarterly report for {current_year}-Q{current_quarter}...")
    quarterly_report = generate_quarterly_report(current_year, current_quarter)
    with open(f"reports/quarterly_{current_year}_Q{current_quarter}.json", "w") as f:
        json.dump(quarterly_report, f, indent=2, ensure_ascii=False)

    # 3. 룰 효과성 분석
    print("🎯 Analyzing rule effectiveness...")
    rule_analysis = analyze_rule_effectiveness()
    with open("reports/rule_effectiveness.json", "w") as f:
        json.dump(rule_analysis, f, indent=2, ensure_ascii=False)

    # 4. 성과 트렌드 분석
    print("📈 Analyzing performance trends...")
    performance_trends = analyze_performance_trends()
    with open("reports/performance_trends.json", "w") as f:
        json.dump(performance_trends, f, indent=2, ensure_ascii=False)

    # 5. 통합 리포트 (모든 데이터 결합)
    consolidated_report = {
        "generated_at": datetime.now().isoformat(),
        "monthly": monthly_report,
        "quarterly": quarterly_report,
        "rule_effectiveness": rule_analysis,
        "performance_trends": performance_trends
    }

    with open("reports/consolidated_report.json", "w") as f:
        json.dump(consolidated_report, f, indent=2, ensure_ascii=False)

    print("\n✅ Report generation completed!")
    print("\n📁 Generated files:")
    print(f"   - reports/monthly_{current_year}_{current_month:02d}.json")
    print(f"   - reports/quarterly_{current_year}_Q{current_quarter}.json")
    print(f"   - reports/rule_effectiveness.json")
    print(f"   - reports/performance_trends.json")
    print(f"   - reports/consolidated_report.json")

    # 요약 출력
    print("\n📊 Summary:")
    print(f"   Monthly Detection Rate: {monthly_report['summary']['detection_rate']}%")
    print(f"   Total Cases (This Month): {monthly_report['summary']['total_cases']}")
    print(f"   Recovery Potential: ₩{monthly_report['summary']['recovery_potential']:,.0f}")
    print(f"   Blacklist Accuracy: {rule_analysis['blacklist_rule']['accuracy']}%")
    print(f"   Graylist Accuracy: {rule_analysis['graylist_rule']['accuracy']}%")

    if rule_analysis['recommendations']:
        print(f"\n💡 {len(rule_analysis['recommendations'])} optimization recommendations generated")

    driver.close()


if __name__ == "__main__":
    main()
