#!/usr/bin/env python3
"""
Calculate evaluation metrics for fraud detection system
Generates metrics for dashboard visualization
"""

import os
import json
from datetime import datetime
from neo4j import GraphDatabase
from dotenv import load_dotenv

load_dotenv()

driver = GraphDatabase.driver(
    os.getenv("NEO4J_URI"),
    auth=(os.getenv("NEO4J_USER"), os.getenv("NEO4J_PASSWORD"))
)


def calculate_risk_distribution(session):
    """Calculate distribution of transactions by risk level"""
    print("\n📊 Calculating Risk Distribution...")

    query = """
    MATCH (t:Transaction)
    WITH
        sum(CASE WHEN t.riskScore >= 0.8 THEN 1 ELSE 0 END) as critical,
        sum(CASE WHEN t.riskScore >= 0.6 AND t.riskScore < 0.8 THEN 1 ELSE 0 END) as high,
        sum(CASE WHEN t.riskScore >= 0.3 AND t.riskScore < 0.6 THEN 1 ELSE 0 END) as medium,
        sum(CASE WHEN t.riskScore < 0.3 THEN 1 ELSE 0 END) as low,
        count(t) as total
    RETURN critical, high, medium, low, total
    """

    result = session.run(query)
    record = result.single()

    distribution = {
        "critical": record["critical"],
        "high": record["high"],
        "medium": record["medium"],
        "low": record["low"],
        "total": record["total"]
    }

    print(f"   🔴 CRITICAL: {distribution['critical']}")
    print(f"   🟠 HIGH:     {distribution['high']}")
    print(f"   🟡 MEDIUM:   {distribution['medium']}")
    print(f"   🟢 LOW:      {distribution['low']}")

    return distribution


def calculate_mcc_impact(session):
    """Calculate fraud detection by MCC risk group"""
    print("\n📊 Calculating MCC Impact...")

    query = """
    MATCH (t:Transaction)-[:AT_MERCHANT]->(m:Merchant)-[:HAS_MCC]->(mcc:MCC)
    WITH mcc.risk_group as riskGroup,
         count(t) as totalTx,
         sum(CASE WHEN t.riskScore >= 0.7 THEN 1 ELSE 0 END) as flaggedTx,
         sum(t.amount) as totalAmount
    RETURN riskGroup, totalTx, flaggedTx, totalAmount
    ORDER BY riskGroup
    """

    result = session.run(query)
    mcc_stats = []

    for record in result:
        risk_group = record["riskGroup"]
        total_tx = record["totalTx"]
        flagged_tx = record["flaggedTx"]
        total_amount = record["totalAmount"]

        detection_rate = (flagged_tx / total_tx * 100) if total_tx > 0 else 0

        stat = {
            "riskGroup": risk_group,
            "totalTransactions": total_tx,
            "flaggedTransactions": flagged_tx,
            "detectionRate": round(detection_rate, 2),
            "totalAmount": total_amount
        }

        mcc_stats.append(stat)
        print(f"   {risk_group:8s}: {flagged_tx}/{total_tx} ({detection_rate:.1f}%)")

    return mcc_stats


def calculate_precision_recall(session):
    """
    Calculate precision and recall metrics
    Note: Without labeled ground truth, we use heuristics:
    - BLACK MCC transactions = True Positives (assumed fraud)
    - HIGH risk score on NORMAL MCC = Potential False Positives
    """
    print("\n📊 Calculating Precision/Recall (Estimated)...")

    # Get BLACK MCC flagged transactions (True Positives - assumed fraud)
    query_tp = """
    MATCH (t:Transaction)-[:AT_MERCHANT]->(m:Merchant)-[:HAS_MCC]->(mcc:MCC)
    WHERE mcc.risk_group = 'BLACK' AND t.riskScore >= 0.7
    RETURN count(t) as tp
    """
    tp = session.run(query_tp).single()["tp"]

    # Get BLACK MCC not flagged (False Negatives - missed fraud)
    query_fn = """
    MATCH (t:Transaction)-[:AT_MERCHANT]->(m:Merchant)-[:HAS_MCC]->(mcc:MCC)
    WHERE mcc.risk_group = 'BLACK' AND t.riskScore < 0.7
    RETURN count(t) as fn
    """
    fn = session.run(query_fn).single()["fn"]

    # Get NORMAL MCC flagged (Potential False Positives - over-flagging)
    query_fp = """
    MATCH (t:Transaction)-[:AT_MERCHANT]->(m:Merchant)-[:HAS_MCC]->(mcc:MCC)
    WHERE mcc.risk_group = 'NORMAL' AND t.riskScore >= 0.7
    RETURN count(t) as fp
    """
    fp = session.run(query_fp).single()["fp"]

    # Get NORMAL MCC not flagged (True Negatives)
    query_tn = """
    MATCH (t:Transaction)-[:AT_MERCHANT]->(m:Merchant)-[:HAS_MCC]->(mcc:MCC)
    WHERE mcc.risk_group = 'NORMAL' AND t.riskScore < 0.7
    RETURN count(t) as tn
    """
    tn = session.run(query_tn).single()["tn"]

    # Calculate metrics
    precision = (tp / (tp + fp)) if (tp + fp) > 0 else 0
    recall = (tp / (tp + fn)) if (tp + fn) > 0 else 0
    f1_score = (2 * precision * recall / (precision + recall)) if (precision + recall) > 0 else 0
    accuracy = ((tp + tn) / (tp + tn + fp + fn)) if (tp + tn + fp + fn) > 0 else 0

    metrics = {
        "truePositives": tp,
        "falsePositives": fp,
        "trueNegatives": tn,
        "falseNegatives": fn,
        "precision": round(precision, 4),
        "recall": round(recall, 4),
        "f1Score": round(f1_score, 4),
        "accuracy": round(accuracy, 4)
    }

    print(f"   ✅ True Positives:  {tp}")
    print(f"   ❌ False Positives: {fp}")
    print(f"   ✅ True Negatives:  {tn}")
    print(f"   ❌ False Negatives: {fn}")
    print(f"   📊 Precision:       {precision:.2%}")
    print(f"   📊 Recall:          {recall:.2%}")
    print(f"   📊 F1 Score:        {f1_score:.2%}")
    print(f"   📊 Accuracy:        {accuracy:.2%}")

    return metrics


def calculate_recovery_potential(session):
    """Calculate potential recovery amount from flagged transactions"""
    print("\n💰 Calculating Recovery Potential...")

    query = """
    MATCH (t:Transaction)
    WITH
        sum(CASE WHEN t.riskScore >= 0.8 THEN t.amount ELSE 0 END) as criticalAmount,
        sum(CASE WHEN t.riskScore >= 0.6 AND t.riskScore < 0.8 THEN t.amount ELSE 0 END) as highAmount,
        sum(CASE WHEN t.riskScore >= 0.3 AND t.riskScore < 0.6 THEN t.amount ELSE 0 END) as mediumAmount,
        count(CASE WHEN t.riskScore >= 0.7 THEN 1 ELSE null END) as flaggedCount,
        sum(t.amount) as totalAmount
    RETURN criticalAmount, highAmount, mediumAmount, flaggedCount, totalAmount
    """

    result = session.run(query)
    record = result.single()

    recovery = {
        "criticalAmount": record["criticalAmount"],
        "highAmount": record["highAmount"],
        "mediumAmount": record["mediumAmount"],
        "totalFlagged": record["flaggedCount"],
        "totalAmount": record["totalAmount"],
        "potentialRecovery": record["criticalAmount"] + record["highAmount"]
    }

    print(f"   🔴 CRITICAL Amount: ₩{recovery['criticalAmount']:,}")
    print(f"   🟠 HIGH Amount:     ₩{recovery['highAmount']:,}")
    print(f"   🟡 MEDIUM Amount:   ₩{recovery['mediumAmount']:,}")
    print(f"   💰 Potential Recovery: ₩{recovery['potentialRecovery']:,}")
    print(f"   📊 Recovery Rate: {(recovery['potentialRecovery']/recovery['totalAmount']*100):.2f}%")

    return recovery


def calculate_case_stats(session):
    """Calculate case management statistics"""
    print("\n📋 Calculating Case Statistics...")

    query = """
    MATCH (c:Case)
    WITH
        count(c) as totalCases,
        sum(CASE WHEN c.status = 'OPEN' THEN 1 ELSE 0 END) as openCases,
        sum(CASE WHEN c.severity = 'CRITICAL' THEN 1 ELSE 0 END) as criticalCases,
        sum(CASE WHEN c.severity = 'HIGH' THEN 1 ELSE 0 END) as highCases
    RETURN totalCases, openCases, criticalCases, highCases
    """

    result = session.run(query)
    record = result.single()

    case_stats = {
        "totalCases": record["totalCases"],
        "openCases": record["openCases"],
        "criticalCases": record["criticalCases"],
        "highCases": record["highCases"]
    }

    print(f"   📊 Total Cases:    {case_stats['totalCases']}")
    print(f"   🔓 Open Cases:     {case_stats['openCases']}")
    print(f"   🔴 Critical Cases: {case_stats['criticalCases']}")
    print(f"   🟠 High Cases:     {case_stats['highCases']}")

    return case_stats


def calculate_employee_risk_stats(session):
    """Calculate employee risk statistics"""
    print("\n👥 Calculating Employee Risk Statistics...")

    query = """
    MATCH (e:Employee)
    WITH
        sum(CASE WHEN e.riskScore >= 0.7 THEN 1 ELSE 0 END) as highRiskEmployees,
        sum(CASE WHEN e.riskScore >= 0.3 AND e.riskScore < 0.7 THEN 1 ELSE 0 END) as mediumRiskEmployees,
        sum(CASE WHEN e.riskScore < 0.3 THEN 1 ELSE 0 END) as lowRiskEmployees,
        count(e) as totalEmployees
    RETURN highRiskEmployees, mediumRiskEmployees, lowRiskEmployees, totalEmployees
    """

    result = session.run(query)
    record = result.single()

    employee_stats = {
        "totalEmployees": record["totalEmployees"],
        "highRiskEmployees": record["highRiskEmployees"],
        "mediumRiskEmployees": record["mediumRiskEmployees"],
        "lowRiskEmployees": record["lowRiskEmployees"]
    }

    print(f"   👥 Total Employees:  {employee_stats['totalEmployees']}")
    print(f"   🔴 High Risk:        {employee_stats['highRiskEmployees']}")
    print(f"   🟡 Medium Risk:      {employee_stats['mediumRiskEmployees']}")
    print(f"   🟢 Low Risk:         {employee_stats['lowRiskEmployees']}")

    return employee_stats


def save_metrics_to_file(metrics, filename="evals/metrics.json"):
    """Save metrics to JSON file"""
    print(f"\n💾 Saving metrics to {filename}...")

    os.makedirs(os.path.dirname(filename), exist_ok=True)

    with open(filename, 'w', encoding='utf-8') as f:
        json.dump(metrics, f, indent=2, ensure_ascii=False)

    print(f"✅ Metrics saved!")


def main():
    print("🚀 Starting Evaluation Metrics Calculation...")
    print(f"   Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

    with driver.session() as session:
        metrics = {
            "timestamp": datetime.now().isoformat(),
            "riskDistribution": calculate_risk_distribution(session),
            "mccImpact": calculate_mcc_impact(session),
            "precisionRecall": calculate_precision_recall(session),
            "recoveryPotential": calculate_recovery_potential(session),
            "caseStats": calculate_case_stats(session),
            "employeeRiskStats": calculate_employee_risk_stats(session)
        }

        save_metrics_to_file(metrics)

        print("\n" + "="*60)
        print("📊 EVALUATION METRICS SUMMARY")
        print("="*60)
        print(f"✅ Precision:          {metrics['precisionRecall']['precision']:.2%}")
        print(f"✅ Recall:             {metrics['precisionRecall']['recall']:.2%}")
        print(f"✅ F1 Score:           {metrics['precisionRecall']['f1Score']:.2%}")
        print(f"💰 Potential Recovery: ₩{metrics['recoveryPotential']['potentialRecovery']:,}")
        print(f"📋 Open Cases:         {metrics['caseStats']['openCases']}")
        print("="*60)

    driver.close()
    print("\n✅ Evaluation completed!")


if __name__ == "__main__":
    main()
