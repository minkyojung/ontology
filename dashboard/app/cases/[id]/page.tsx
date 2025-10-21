import { getDriver } from '@/lib/neo4j/driver';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import Link from 'next/link';
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  MoreHorizontal,
} from 'lucide-react';
import { CaseDetailClient } from './components/CaseDetailClient';
import { getSeverityBadge, getStatusBadge } from '@/lib/utils/badge-helpers';

interface PageProps {
  params: Promise<{ id: string }>;
}

async function getCaseDetail(caseId: string) {
  const driver = getDriver();
  const session = driver.session();

  try {
    // Get case with all related entities
    const result = await session.run(
      `
      MATCH (c:Case {case_id: $caseId})
      OPTIONAL MATCH (c)-[:INVOLVES_TRANSACTION]->(t:Transaction)
      OPTIONAL MATCH (e:Employee)-[:MADE_TRANSACTION]->(t)
      OPTIONAL MATCH (t)-[:AT_MERCHANT]->(m:Merchant)
      OPTIONAL MATCH (m)-[:HAS_MCC]->(mcc:MCC)
      OPTIONAL MATCH (c)-[:CITES_RULE]->(rule:TaxRule)
      RETURN c, t, e, m, mcc, collect(DISTINCT rule) as taxRules
      LIMIT 1
      `,
      { caseId }
    );

    if (result.records.length === 0) {
      return null;
    }

    const record = result.records[0];
    const caseNode = record.get('c');
    const txnNode = record.get('t');
    const empNode = record.get('e');
    const merchNode = record.get('m');
    const mccNode = record.get('mcc');
    const taxRulesNodes = record.get('taxRules');

    const props = caseNode.properties;

    // Parse detection_reasoning if it exists
    let reasoning = null;
    if (props.detection_reasoning) {
      try {
        reasoning = JSON.parse(props.detection_reasoning);
      } catch (e) {
        console.error('Failed to parse detection_reasoning');
      }
    }

    return {
      caseId: props.case_id,
      caseType: props.case_type,
      severity: props.severity,
      status: props.status,
      description: props.description,
      assignedTo: props.assigned_to,
      createdAt: props.created_at?.toString(),
      detectionReasoning: reasoning,
      employee: empNode ? {
        id: empNode.properties.id,
        name: empNode.properties.name,
        email: empNode.properties.email,
        department: empNode.properties.department,
        jobTitle: empNode.properties.job_title,
      } : null,
      transaction: txnNode ? {
        id: txnNode.properties.id,
        amount: typeof txnNode.properties.amount === 'object' && txnNode.properties.amount !== null && 'toNumber' in txnNode.properties.amount
          ? txnNode.properties.amount.toNumber()
          : Number(txnNode.properties.amount),
        currency: txnNode.properties.currency || 'KRW',
        transactedAt: txnNode.properties.transacted_at?.toString(),
        category: txnNode.properties.category,
      } : null,
      merchant: merchNode ? {
        name: merchNode.properties.name,
        address: merchNode.properties.address,
        city: merchNode.properties.city,
        country: merchNode.properties.country || 'Korea',
      } : null,
      mcc: mccNode ? {
        code: mccNode.properties.code,
        description: mccNode.properties.description,
        riskGroup: mccNode.properties.risk_group,
      } : null,
      taxRules: taxRulesNodes.filter((r: any) => r).map((r: any) => ({
        ruleId: r.properties.ruleId,
        name: r.properties.name,
        lawName: r.properties.lawName,
        article: r.properties.article,
        description: r.properties.description,
        consequence: r.properties.consequence,
        url: r.properties.url,
      })),
    };
  } finally {
    await session.close();
  }
}

async function getRelatedTransactions(caseId: string, employeeId: string, transactionId: string, amount: number, timestamp: string) {
  const driver = getDriver();
  const session = driver.session();

  try {
    // Ontology-based pattern detection query
    const result = await session.run(
      `
      MATCH (e:Employee {id: $employeeId})-[:MADE_TRANSACTION]->(related:Transaction)
      WHERE related.id <> $transactionId
        AND related.transacted_at IS NOT NULL
        AND $timestamp IS NOT NULL
      WITH related,
           duration.between(
             datetime(related.transacted_at),
             datetime($timestamp)
           ).hours as hoursDiff,
           abs(related.amount - $amount) as amountDiff,
           abs(related.amount - $amount) / toFloat($amount) * 100 as amountDiffPct
      WHERE abs(hoursDiff) <= 24
        AND (amountDiff <= 10000 OR amountDiffPct <= 15)
      OPTIONAL MATCH (related)-[:AT_MERCHANT]->(m:Merchant)
      OPTIONAL MATCH (m)-[:HAS_MCC]->(mcc:MCC)
      RETURN related, m, mcc, hoursDiff, amountDiffPct
      ORDER BY abs(hoursDiff), amountDiffPct
      LIMIT 10
      `,
      { employeeId, transactionId, amount, timestamp }
    );

    return result.records.map(record => {
      const relatedNode = record.get('related');
      const merchantNode = record.get('m');
      const mccNode = record.get('mcc');
      const hoursDiff = record.get('hoursDiff');
      const amountDiffPct = record.get('amountDiffPct');

      // Convert Neo4j Integer/BigInt to JavaScript number
      const hoursDiffNum = typeof hoursDiff === 'object' && hoursDiff !== null && 'toNumber' in hoursDiff
        ? hoursDiff.toNumber()
        : Number(hoursDiff);
      const amountDiffPctNum = typeof amountDiffPct === 'object' && amountDiffPct !== null && 'toNumber' in amountDiffPct
        ? amountDiffPct.toNumber()
        : Number(amountDiffPct);

      return {
        id: relatedNode.properties.id,
        amount: typeof relatedNode.properties.amount === 'object' && relatedNode.properties.amount !== null && 'toNumber' in relatedNode.properties.amount
          ? relatedNode.properties.amount.toNumber()
          : Number(relatedNode.properties.amount),
        currency: relatedNode.properties.currency || 'KRW',
        transactedAt: relatedNode.properties.transacted_at?.toString(),
        category: relatedNode.properties.category,
        merchant: merchantNode ? {
          name: merchantNode.properties.name,
          city: merchantNode.properties.city,
        } : null,
        mcc: mccNode ? {
          code: mccNode.properties.code,
          description: mccNode.properties.description,
        } : null,
        similarity: {
          hoursDiff: Math.round(hoursDiffNum),
          amountDiffPct: Math.round(amountDiffPctNum),
          score: Math.max(0, 100 - Math.abs(hoursDiffNum) - amountDiffPctNum)
        }
      };
    });
  } finally {
    await session.close();
  }
}

function getRiskScore(severity: string): number {
  switch (severity?.toUpperCase()) {
    case 'CRITICAL':
      return 95;
    case 'HIGH':
      return 75;
    case 'MEDIUM':
      return 50;
    case 'LOW':
      return 25;
    default:
      return 0;
  }
}

function getRiskColor(score: number): string {
  if (score >= 80) return 'text-red-600';
  if (score >= 60) return 'text-orange-600';
  if (score >= 40) return 'text-yellow-600';
  return 'text-green-600';
}

export default async function CaseDetailPage({ params }: PageProps) {
  const { id } = await params;
  const caseDetail = await getCaseDetail(id);

  if (!caseDetail) {
    return (
      <div className="p-8">
        <div className="text-center text-red-600 text-xl mb-4">Case not found</div>
        <div className="text-center">
          <Link href="/cases" className="text-blue-600 hover:underline">
            ← Back to Cases
          </Link>
        </div>
      </div>
    );
  }

  // Fetch related transactions for pattern detection (ontology-based)
  const relatedTransactions = caseDetail.employee && caseDetail.transaction
    ? await getRelatedTransactions(
        id,
        caseDetail.employee.id,
        caseDetail.transaction.id,
        caseDetail.transaction.amount,
        caseDetail.transaction.transactedAt || ''
      )
    : [];

  const riskScore = getRiskScore(caseDetail.severity);

  return (
    <div className="min-h-screen bg-background">
      {/* Header Bar - Action First */}
      <div className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-12 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Link
              href="/cases"
              className="inline-flex items-center gap-1.5 text-sm font-medium hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back
            </Link>
            <Separator orientation="vertical" className="h-4" />
            <div className="flex items-center gap-2">
              <h1 className="text-base font-semibold">{caseDetail.caseId}</h1>
              {getSeverityBadge(caseDetail.severity)}
              {getStatusBadge(caseDetail.status)}
            </div>
          </div>

          {/* Action Buttons - Primary CTAs */}
          <div className="flex items-center gap-2">
            <Button size="sm" variant="default">
              <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
              Approve
            </Button>
            <Button size="sm" variant="outline">
              <XCircle className="h-3.5 w-3.5 mr-1.5" />
              Reject
            </Button>
            <Button size="sm" variant="ghost">
              <MoreHorizontal className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content - Dynamic import to avoid bundling issues */}
      <CaseDetailClient
        caseDetail={caseDetail}
        relatedTransactions={relatedTransactions}
        riskScore={riskScore}
      />
    </div>
  );
}
