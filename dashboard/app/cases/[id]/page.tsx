'use client';

import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';

interface DetectionReasoning {
  matched_rules: Array<{
    rule_type: string;
    rule_name: string;
    mcc_code?: string;
    mcc_description?: string;
    risk_level?: string;
    weight: number;
    source: string;
    detail: string;
  }>;
  risk_factors: {
    mcc_risk?: string;
    amount?: number;
    merchant_trust_score?: number;
  };
  final_score: {
    total_score: number;
    threshold: number;
    recommendation: string;
  };
  explanation: string;
}

interface CaseDetail {
  id: string;
  caseId: string;
  severity: string;
  status: string;
  description: string;
  assignedTo: string;
  detectionReasoning?: DetectionReasoning | null;
  createdAt: string;
  employee: {
    id: string;
    name: string;
    department: string;
    email: string;
  };
  transaction: {
    transactionId: string;
    amount: number;
    currency: string;
    transactionDate: string;
    description: string;
    riskScore: number;
    merchantName: string;
    merchantCity: string;
    merchantCountry: string;
  };
  mcc: {
    code: string;
    category: string;
    description: string;
    riskGroup: string;
  };
  taxRules: Array<{
    ruleId: string;
    name: string;
    legalReference: string;
    description: string;
  }>;
}

async function getCaseDetail(id: string): Promise<CaseDetail> {
  const res = await fetch(`http://localhost:3004/api/cases/${id}`, {
    cache: 'no-store'
  });

  if (!res.ok) {
    throw new Error('Failed to fetch case detail');
  }

  return res.json();
}

function getSeverityBadge(severity: string) {
  switch (severity.toUpperCase()) {
    case 'CRITICAL':
      return <Badge variant="destructive" className="text-lg px-3 py-1">CRITICAL</Badge>;
    case 'HIGH':
      return <Badge variant="default" className="bg-orange-600 text-lg px-3 py-1">HIGH</Badge>;
    case 'MEDIUM':
      return <Badge variant="default" className="bg-yellow-600 text-lg px-3 py-1">MEDIUM</Badge>;
    case 'LOW':
      return <Badge variant="outline" className="text-lg px-3 py-1">LOW</Badge>;
    default:
      return <Badge variant="secondary" className="text-lg px-3 py-1">{severity}</Badge>;
  }
}

function getStatusBadge(status: string) {
  switch (status.toUpperCase()) {
    case 'OPEN':
      return <Badge variant="default" className="bg-blue-600">OPEN</Badge>;
    case 'IN_PROGRESS':
      return <Badge variant="default" className="bg-purple-600">IN PROGRESS</Badge>;
    case 'RESOLVED':
      return <Badge variant="default" className="bg-green-600">RESOLVED</Badge>;
    case 'CLOSED':
      return <Badge variant="secondary">CLOSED</Badge>;
    case 'REJECTED':
      return <Badge variant="outline" className="text-red-600">REJECTED</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

export default function CaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [caseDetail, setCaseDetail] = useState<CaseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Load case detail
  useState(() => {
    getCaseDetail(id)
      .then(data => {
        setCaseDetail(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  });

  const handleAction = async (action: 'approve' | 'reject' | 'hold') => {
    setActionLoading(true);

    try {
      const res = await fetch(`http://localhost:3004/api/cases/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action,
          comment: `Case ${action}d via dashboard`
        })
      });

      if (!res.ok) {
        throw new Error('Failed to update case');
      }

      // Refresh the page
      router.refresh();
      window.location.reload();
    } catch (error) {
      console.error('Error updating case:', error);
      alert('Failed to update case');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  if (!caseDetail) {
    return (
      <div className="p-8">
        <div className="text-center text-red-600">Case not found</div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              Case {caseDetail.caseId}
              {getSeverityBadge(caseDetail.severity)}
            </h1>
            <p className="text-muted-foreground mt-2">
              Created: {new Date(caseDetail.createdAt).toLocaleString('ko-KR')}
            </p>
          </div>
          <div className="flex gap-2">
            {getStatusBadge(caseDetail.status)}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      {caseDetail.status === 'OPEN' && (
        <Card className="mb-6 bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Case Actions
            </CardTitle>
            <CardDescription>Review and take action on this case</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              <Button
                onClick={() => handleAction('approve')}
                disabled={actionLoading}
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                Approve
              </Button>
              <Button
                onClick={() => handleAction('reject')}
                disabled={actionLoading}
                variant="destructive"
              >
                <XCircle className="mr-2 h-4 w-4" />
                Reject
              </Button>
              <Button
                onClick={() => handleAction('hold')}
                disabled={actionLoading}
                variant="outline"
              >
                <Clock className="mr-2 h-4 w-4" />
                Hold for Review
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Case Description */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Case Description</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm">{caseDetail.description}</p>
          <div className="mt-4 flex gap-4">
            <div>
              <span className="text-sm text-muted-foreground">Assigned To:</span>
              <span className="ml-2 font-medium">{caseDetail.assignedTo}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detection Reasoning */}
      {caseDetail.detectionReasoning && (
        <Card className="mb-6 border-yellow-200 bg-yellow-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-600" />
              탐지 근거 (Detection Reasoning)
            </CardTitle>
            <CardDescription>
              이 케이스가 탐지된 이유와 근거를 확인하세요
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Explanation */}
            <div className="bg-white rounded-lg p-4 border border-yellow-300">
              <p className="text-sm font-medium text-yellow-900">
                {caseDetail.detectionReasoning.explanation}
              </p>
            </div>

            {/* Matched Rules */}
            <div>
              <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                🔴 Matched Rules ({caseDetail.detectionReasoning.matched_rules.length})
              </h4>
              <div className="space-y-3">
                {caseDetail.detectionReasoning.matched_rules.map((rule, idx) => (
                  <div key={idx} className="bg-white rounded-lg p-4 border border-gray-200">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h5 className="font-semibold text-gray-900">{rule.rule_name}</h5>
                        <p className="text-xs text-gray-500 mt-1">Type: {rule.rule_type}</p>
                      </div>
                      <Badge variant="destructive">
                        Weight: {rule.weight}
                      </Badge>
                    </div>
                    <Separator className="my-2" />
                    <p className="text-sm text-gray-700 mb-2">{rule.detail}</p>
                    {rule.mcc_code && (
                      <div className="mt-2 space-y-1">
                        <div className="text-xs">
                          <span className="text-gray-500">MCC Code:</span>
                          <span className="ml-2 font-mono font-semibold">{rule.mcc_code}</span>
                        </div>
                        <div className="text-xs">
                          <span className="text-gray-500">Description:</span>
                          <span className="ml-2">{rule.mcc_description}</span>
                        </div>
                        <div className="text-xs">
                          <span className="text-gray-500">Risk Level:</span>
                          <Badge variant="destructive" className="ml-2">
                            {rule.risk_level}
                          </Badge>
                        </div>
                      </div>
                    )}
                    <div className="mt-3 text-xs text-gray-500">
                      <span>Source:</span>
                      <code className="ml-2 bg-gray-100 px-2 py-1 rounded">{rule.source}</code>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Risk Factors */}
            <div>
              <h4 className="text-sm font-semibold mb-3">📊 Risk Factors</h4>
              <div className="bg-white rounded-lg p-4 border border-gray-200 grid grid-cols-3 gap-4">
                {caseDetail.detectionReasoning.risk_factors.mcc_risk && (
                  <div>
                    <div className="text-xs text-gray-500">MCC Risk</div>
                    <div className="font-semibold text-red-600">
                      {caseDetail.detectionReasoning.risk_factors.mcc_risk}
                    </div>
                  </div>
                )}
                {caseDetail.detectionReasoning.risk_factors.amount && (
                  <div>
                    <div className="text-xs text-gray-500">Amount</div>
                    <div className="font-semibold">
                      ₩{caseDetail.detectionReasoning.risk_factors.amount.toLocaleString()}
                    </div>
                  </div>
                )}
                {caseDetail.detectionReasoning.risk_factors.merchant_trust_score !== undefined && (
                  <div>
                    <div className="text-xs text-gray-500">Merchant Trust Score</div>
                    <div className="font-semibold">
                      {caseDetail.detectionReasoning.risk_factors.merchant_trust_score}/100
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Final Score */}
            <div>
              <h4 className="text-sm font-semibold mb-3">🎯 Final Score</h4>
              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <div className="text-2xl font-bold text-red-600">
                      {caseDetail.detectionReasoning.final_score.total_score}
                    </div>
                    <div className="text-xs text-gray-500">
                      Threshold: {caseDetail.detectionReasoning.final_score.threshold}
                    </div>
                  </div>
                  <Badge
                    variant={
                      caseDetail.detectionReasoning.final_score.recommendation === 'FLAGGED'
                        ? 'destructive'
                        : 'secondary'
                    }
                    className="text-lg px-4 py-2"
                  >
                    {caseDetail.detectionReasoning.final_score.recommendation}
                  </Badge>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3 mt-3">
                  <div
                    className="bg-red-600 h-3 rounded-full transition-all"
                    style={{
                      width: `${Math.min(
                        (caseDetail.detectionReasoning.final_score.total_score / 100) * 100,
                        100
                      )}%`,
                    }}
                  />
                </div>
              </div>
            </div>

            {/* System Note */}
            <div className="bg-white rounded-lg p-3 border border-gray-200 text-xs text-gray-600">
              <strong>Note:</strong> 이 탐지는 AI가 아닌 <strong>룰 기반 시스템</strong>에 의해 생성되었습니다.
              모든 룰은 한국 세법(법인세법 제27조 등) 및 내부 정책(MCC 블랙리스트/그레이리스트)을 기반으로 합니다.
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2 mb-6">
        {/* Employee Info */}
        <Card>
          <CardHeader>
            <CardTitle>Employee Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div>
                <span className="text-sm text-muted-foreground">Name:</span>
                <span className="ml-2 font-medium">{caseDetail.employee.name}</span>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Employee ID:</span>
                <span className="ml-2 font-mono text-sm">{caseDetail.employee.id}</span>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Department:</span>
                <span className="ml-2">{caseDetail.employee.department}</span>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Email:</span>
                <span className="ml-2">{caseDetail.employee.email}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Transaction Info */}
        <Card>
          <CardHeader>
            <CardTitle>Transaction Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div>
                <span className="text-sm text-muted-foreground">Transaction ID:</span>
                <span className="ml-2 font-mono text-sm">{caseDetail.transaction.transactionId}</span>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Amount:</span>
                <span className="ml-2 font-bold text-lg">
                  {caseDetail.transaction.currency} {caseDetail.transaction.amount.toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Date:</span>
                <span className="ml-2">{caseDetail.transaction.transactionDate}</span>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Risk Score:</span>
                <span className="ml-2 font-medium text-red-600">
                  {(caseDetail.transaction.riskScore * 100).toFixed(1)}%
                </span>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Description:</span>
                <span className="ml-2">{caseDetail.transaction.description}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2 mb-6">
        {/* Merchant & MCC Info */}
        <Card>
          <CardHeader>
            <CardTitle>Merchant & MCC Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <span className="text-sm text-muted-foreground">Merchant:</span>
                <span className="ml-2 font-medium">{caseDetail.transaction.merchantName}</span>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Location:</span>
                <span className="ml-2">
                  {caseDetail.transaction.merchantCity}, {caseDetail.transaction.merchantCountry}
                </span>
              </div>

              <Separator />

              <div>
                <span className="text-sm text-muted-foreground">MCC Code:</span>
                <span className="ml-2 font-mono">{caseDetail.mcc.code}</span>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Category:</span>
                <span className="ml-2">{caseDetail.mcc.category}</span>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Description:</span>
                <span className="ml-2 text-sm">{caseDetail.mcc.description}</span>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Risk Group:</span>
                <Badge
                  variant="outline"
                  className={
                    caseDetail.mcc.riskGroup === 'BLACK'
                      ? 'bg-red-50 text-red-700 border-red-300 ml-2'
                      : caseDetail.mcc.riskGroup === 'GRAY'
                      ? 'bg-yellow-50 text-yellow-700 border-yellow-300 ml-2'
                      : 'bg-green-50 text-green-700 border-green-300 ml-2'
                  }
                >
                  {caseDetail.mcc.riskGroup}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tax Rules */}
        <Card>
          <CardHeader>
            <CardTitle>Applicable Tax Rules</CardTitle>
            <CardDescription>Legal regulations violated by this transaction</CardDescription>
          </CardHeader>
          <CardContent>
            {caseDetail.taxRules.length === 0 ? (
              <p className="text-sm text-muted-foreground">No tax rules applicable</p>
            ) : (
              <div className="space-y-4">
                {caseDetail.taxRules.map((rule) => (
                  <div key={rule.ruleId} className="border rounded-lg p-3 bg-red-50 border-red-200">
                    <div className="font-medium text-sm mb-1">{rule.name}</div>
                    {rule.description && (
                      <div className="text-xs text-muted-foreground mb-2">{rule.description}</div>
                    )}
                    {rule.legalReference && (
                      <div className="text-xs">
                        <span className="font-medium">Legal Reference:</span>
                        <span className="ml-1 text-muted-foreground">{rule.legalReference}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
