'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  AlertTriangle,
  CreditCard,
  User,
  Store,
  ChevronDown,
  Scale,
  Network,
  FileSearch,
} from 'lucide-react';
import { CaseNetwork } from './CaseNetwork';

interface Transaction {
  id?: string;
  transactionId: string;
  amount: number;
  currency?: string;
  transactionDate: string;
  transactedAt?: string;
  merchantName: string;
  merchant?: {
    name?: string;
    city?: string;
    country?: string;
  };
  mcc?: {
    code?: string;
    description?: string;
  };
  similarity?: {
    score: number;
    hoursDiff?: number;
    amountDiffPct?: number;
  };
  [key: string]: unknown;
}

interface CaseDetail {
  caseId: string;
  caseType?: string;
  severity: string;
  status: string;
  description: string;
  createdAt: string;
  assignedTo: string;
  detectionReasoning?: {
    reason: string;
    total_amount?: number;
    total_transactions?: number;
    [key: string]: unknown;
  };
  employee: {
    name: string;
    department: string;
    [key: string]: unknown;
  };
  transaction: Transaction;
  merchant?: {
    name?: string;
    city?: string;
    country?: string;
    [key: string]: unknown;
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
    lawName?: string;
    article?: string;
    description?: string;
    consequence?: string;
    url?: string;
  }>;
  [key: string]: unknown;
}

interface CaseDetailClientProps {
  caseDetail: CaseDetail;
  relatedTransactions: Transaction[];
  riskScore: number;
}

export function CaseDetailClient({
  caseDetail,
  relatedTransactions,
  riskScore,
}: CaseDetailClientProps) {
  return (
    <Tabs defaultValue="overview" className="container px-4 py-4 max-w-6xl mx-auto">
      <TabsList className="mb-4">
        <TabsTrigger value="overview" className="gap-1.5">
          <FileSearch className="h-3.5 w-3.5" />
          Overview
        </TabsTrigger>
        <TabsTrigger value="network" className="gap-1.5">
          <Network className="h-3.5 w-3.5" />
          Network
        </TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="space-y-4">
        {/* Hero Alert Card - Detection Summary */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-md border bg-muted/50">
                    <AlertTriangle className="h-4 w-4" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold">
                      {caseDetail.caseType?.replace(/_/g, ' ') || 'Fraud Detected'}
                    </h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {new Date(caseDetail.createdAt).toLocaleDateString('ko-KR')} • {caseDetail.assignedTo}
                    </p>
                  </div>
                </div>

                {caseDetail.detectionReasoning && (
                  <div className="bg-muted/30 p-3 rounded-md border">
                    <p className="text-sm leading-relaxed text-foreground/90">{caseDetail.detectionReasoning.reason}</p>
                    {caseDetail.detectionReasoning.total_amount && (
                      <div className="mt-2 pt-2 border-t">
                        <span className="text-xs text-muted-foreground">Suspicious Amount: </span>
                        <span className="text-base font-semibold">
                          ₩{caseDetail.detectionReasoning.total_amount.toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Risk Score */}
              <div className="flex flex-col items-center justify-center p-4 rounded-md border bg-muted/30 min-w-[120px]">
                <div className="text-xs text-muted-foreground mb-1">Risk Score</div>
                <div className="text-4xl font-bold">
                  {riskScore}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">/ 100</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Key Information Grid */}
        <div className="grid grid-cols-3 gap-3">
          {caseDetail.transaction && (
            <Card>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-start gap-2">
                  <div className="p-1.5 rounded-md border bg-muted/50">
                    <CreditCard className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-muted-foreground mb-0.5">Transaction</div>
                    <div className="text-lg font-semibold truncate">
                      {caseDetail.transaction.currency}{' '}
                      {typeof caseDetail.transaction.amount === 'number'
                        ? caseDetail.transaction.amount.toLocaleString()
                        : caseDetail.transaction.amount}
                    </div>
                    {caseDetail.transaction.transactedAt && (
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {new Date(caseDetail.transaction.transactedAt).toLocaleDateString('ko-KR')}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {caseDetail.employee && (
            <Card>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-start gap-2">
                  <div className="p-1.5 rounded-md border bg-muted/50">
                    <User className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-muted-foreground mb-0.5">Employee</div>
                    <div className="text-base font-semibold truncate">{caseDetail.employee.name}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{caseDetail.employee.department}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {caseDetail.merchant && (
            <Card>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-start gap-2">
                  <div className="p-1.5 rounded-md border bg-muted/50">
                    <Store className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-muted-foreground mb-0.5">Merchant</div>
                    <div className="text-base font-semibold truncate">{caseDetail.merchant.name}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {caseDetail.merchant.city}, {caseDetail.merchant.country}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Tax Law Violations */}
        {caseDetail.taxRules && caseDetail.taxRules.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1 rounded border bg-muted/50">
                  <Scale className="h-3.5 w-3.5" />
                </div>
                <CardTitle className="text-base font-semibold">Tax Law Violations</CardTitle>
                <Badge variant="outline" className="text-xs">{caseDetail.taxRules.length}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {caseDetail.taxRules.map((rule, idx) => (
                <Collapsible key={idx}>
                  <div className="rounded-md border bg-muted/30 p-3">
                    <CollapsibleTrigger className="w-full">
                      <div className="flex items-center justify-between">
                        <div className="text-left">
                          <div className="text-sm font-medium">{rule.name}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {rule.lawName} {rule.article}
                          </div>
                        </div>
                        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-3 space-y-2">
                      {rule.description && (
                        <p className="text-xs text-foreground/80">{rule.description}</p>
                      )}
                      {rule.consequence && (
                        <div className="bg-background border p-2 rounded">
                          <div className="text-xs font-medium text-muted-foreground mb-0.5">Consequence</div>
                          <div className="text-xs">{rule.consequence}</div>
                        </div>
                      )}
                      {rule.url && (
                        <a
                          href={rule.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs hover:underline inline-flex items-center gap-1"
                        >
                          View legal source →
                        </a>
                      )}
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Related Transactions - Suspicious Pattern */}
        {relatedTransactions.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1 rounded border bg-muted/50">
                    <AlertTriangle className="h-3.5 w-3.5" />
                  </div>
                  <CardTitle className="text-base font-semibold">Suspicious Pattern</CardTitle>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {relatedTransactions.length} Related
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Similar transactions within 24h
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {relatedTransactions.map((tx, idx) => (
                  <div key={idx} className="rounded-md border bg-muted/30 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1">
                          <CreditCard className="h-3 w-3 text-muted-foreground" />
                          <span className="font-mono text-xs text-muted-foreground">{tx.id}</span>
                        </div>
                        <div className="text-base font-semibold">
                          {tx.currency} {tx.amount.toLocaleString()}
                        </div>
                        {tx.merchant && (
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {tx.merchant.name}
                            {tx.merchant.city && ` • ${tx.merchant.city}`}
                          </div>
                        )}
                        {tx.mcc && (
                          <div className="text-xs text-muted-foreground mt-0.5">
                            MCC {tx.mcc.code}: {tx.mcc.description}
                          </div>
                        )}
                        {tx.transactedAt && (
                          <div className="text-xs text-muted-foreground mt-1">
                            {new Date(tx.transactedAt).toLocaleString('ko-KR')}
                          </div>
                        )}
                      </div>
                      {tx.similarity && (
                        <div className="flex flex-col gap-1 items-end">
                          <Badge
                            variant={tx.similarity.score >= 90 ? "destructive" : "outline"}
                            className="text-xs whitespace-nowrap"
                          >
                            {tx.similarity.score}% Match
                          </Badge>
                          <div className="text-xs text-muted-foreground text-right">
                            {tx.similarity.hoursDiff !== undefined && `${Math.abs(tx.similarity.hoursDiff)}h apart`}
                            {tx.similarity.hoursDiff !== undefined && tx.similarity.amountDiffPct !== undefined && <br/>}
                            {tx.similarity.amountDiffPct !== undefined && `${tx.similarity.amountDiffPct.toFixed(1)}% diff`}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3 pt-3 border-t flex gap-2">
                <Button variant="outline" size="sm" className="flex-1">
                  Review All
                </Button>
                <Button variant="outline" size="sm" className="flex-1">
                  Investigate
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </TabsContent>

      <TabsContent value="network">
        <CaseNetwork caseId={caseDetail.caseId} />
      </TabsContent>
    </Tabs>
  );
}
