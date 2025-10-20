'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Download, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';

interface MonthlyReport {
  period: string;
  type: string;
  generated_at: string;
  summary: {
    total_transactions: number;
    total_cases: number;
    detection_rate: number;
    recovery_potential: number;
  };
  case_status_breakdown: Array<{ status: string; count: number }>;
  top_mcc_detections: Array<{
    mcc_code: string;
    mcc_desc: string;
    risk_level: string;
    case_count: number;
    total_amount: number;
  }>;
  top_employees: Array<{
    employee_id: string;
    name: string;
    department: string;
    case_count: number;
    total_amount: number;
  }>;
}

interface QuarterlyReport {
  period: string;
  type: string;
  generated_at: string;
  summary: {
    total_transactions: number;
    total_cases: number;
    detection_rate: number;
    recovery_potential: number;
    approved_fraud_amount: number;
  };
  monthly_trend: Array<{
    year: number;
    month: number;
    case_count: number;
    txn_count: number;
    detection_rate: number;
  }>;
}

interface RuleEffectiveness {
  generated_at: string;
  rule_performance: Array<{ rule_type: string; cases_generated: number }>;
  blacklist_rule: {
    total_cases: number;
    true_positives: number;
    false_positives: number;
    accuracy: number;
    total_amount_flagged: number;
  };
  graylist_rule: {
    total_cases: number;
    true_positives: number;
    false_positives: number;
    accuracy: number;
    total_amount_flagged: number;
  };
  recommendations: Array<{
    rule: string;
    issue: string;
    suggestion: string;
  }>;
}

interface ConsolidatedReport {
  generated_at: string;
  monthly: MonthlyReport;
  quarterly: QuarterlyReport;
  rule_effectiveness: RuleEffectiveness;
}

export default function ReportsPage() {
  const [report, setReport] = useState<ConsolidatedReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);

  const fetchReport = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/reports?type=consolidated');
      if (!response.ok) throw new Error('Failed to fetch report');
      const data = await response.json();
      setReport(data);
    } catch (error) {
      console.error('Error fetching report:', error);
    } finally {
      setLoading(false);
    }
  };

  const regenerateReport = async () => {
    try {
      setRegenerating(true);
      const response = await fetch('/api/reports', { method: 'POST' });
      if (!response.ok) throw new Error('Failed to regenerate report');
      await fetchReport();
    } catch (error) {
      console.error('Error regenerating report:', error);
    } finally {
      setRegenerating(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, []);

  if (loading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="p-8">
        <Card>
          <CardHeader>
            <CardTitle>No Reports Available</CardTitle>
            <CardDescription>Generate your first report to get started</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={regenerateReport} disabled={regenerating}>
              {regenerating ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                'Generate Report'
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { monthly, quarterly, rule_effectiveness } = report;

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Reports & Analytics</h1>
          <p className="text-muted-foreground">
            Comprehensive fraud detection performance reports
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={regenerateReport} disabled={regenerating}>
            {regenerating ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Regenerating...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Regenerate
              </>
            )}
          </Button>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export PDF
          </Button>
        </div>
      </div>

      <Tabs defaultValue="monthly" className="space-y-4">
        <TabsList>
          <TabsTrigger value="monthly">Monthly Report</TabsTrigger>
          <TabsTrigger value="quarterly">Quarterly Report</TabsTrigger>
          <TabsTrigger value="rules">Rule Effectiveness</TabsTrigger>
        </TabsList>

        {/* Monthly Report */}
        <TabsContent value="monthly" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{monthly.summary.total_transactions.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">Period: {monthly.period}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Cases Detected</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{monthly.summary.total_cases.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">
                  {monthly.summary.detection_rate}% detection rate
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Recovery Potential</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ₩{monthly.summary.recovery_potential.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">Flagged transactions</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Detection Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{monthly.summary.detection_rate}%</div>
                <p className="text-xs text-muted-foreground">Cases per transaction</p>
              </CardContent>
            </Card>
          </div>

          {/* Case Status Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Case Status Distribution</CardTitle>
              <CardDescription>Breakdown of fraud cases by current status</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {monthly.case_status_breakdown.map((status) => (
                  <div key={status.status} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant={status.status === 'APPROVED' ? 'destructive' : 'secondary'}>
                        {status.status}
                      </Badge>
                      <span className="text-sm text-muted-foreground">{status.count} cases</span>
                    </div>
                    <div className="w-64 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{
                          width: `${(status.count / monthly.summary.total_cases) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Top MCC Detections */}
          <Card>
            <CardHeader>
              <CardTitle>Top MCC Detections</CardTitle>
              <CardDescription>Most flagged merchant categories</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {monthly.top_mcc_detections.slice(0, 10).map((mcc) => (
                  <div key={mcc.mcc_code} className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{mcc.mcc_code}</span>
                        <Badge
                          variant={
                            mcc.risk_level === 'BLACK'
                              ? 'destructive'
                              : mcc.risk_level === 'GRAY'
                              ? 'secondary'
                              : 'outline'
                          }
                        >
                          {mcc.risk_level}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{mcc.mcc_desc}</p>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">{mcc.case_count} cases</div>
                      <div className="text-sm text-muted-foreground">
                        ₩{mcc.total_amount?.toLocaleString() || 0}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Top Employees */}
          <Card>
            <CardHeader>
              <CardTitle>Top Flagged Employees</CardTitle>
              <CardDescription>Employees with most fraud cases</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {monthly.top_employees.map((emp) => (
                  <div key={emp.employee_id} className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="font-medium">{emp.name}</div>
                      <p className="text-sm text-muted-foreground">
                        {emp.employee_id} • {emp.department}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">{emp.case_count} cases</div>
                      <div className="text-sm text-muted-foreground">
                        ₩{emp.total_amount?.toLocaleString() || 0}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Quarterly Report */}
        <TabsContent value="quarterly" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {quarterly.summary.total_transactions.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">Period: {quarterly.period}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Cases Detected</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{quarterly.summary.total_cases.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">
                  {quarterly.summary.detection_rate}% detection rate
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Recovery Potential</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ₩{quarterly.summary.recovery_potential.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">Pending/Under Review</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Approved Fraud Amount</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  ₩{quarterly.summary.approved_fraud_amount.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">Confirmed fraud</p>
              </CardContent>
            </Card>
          </div>

          {/* Monthly Trend */}
          <Card>
            <CardHeader>
              <CardTitle>Monthly Trend</CardTitle>
              <CardDescription>Detection rate and case count over time</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {quarterly.monthly_trend.map((month) => (
                  <div key={`${month.year}-${month.month}`} className="flex items-center justify-between">
                    <div>
                      <span className="font-medium">
                        {month.year}-{String(month.month).padStart(2, '0')}
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-muted-foreground">
                        {month.case_count} cases ({month.detection_rate}%)
                      </span>
                      {month.detection_rate > quarterly.summary.detection_rate ? (
                        <TrendingUp className="h-4 w-4 text-red-500" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-green-500" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Rule Effectiveness */}
        <TabsContent value="rules" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Blacklist Rule Performance</CardTitle>
                <CardDescription>High-risk MCC blocking effectiveness</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Cases</span>
                    <span className="font-semibold">{rule_effectiveness.blacklist_rule.total_cases}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">True Positives</span>
                    <span className="font-semibold text-green-600">
                      {rule_effectiveness.blacklist_rule.true_positives}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">False Positives</span>
                    <span className="font-semibold text-red-600">
                      {rule_effectiveness.blacklist_rule.false_positives}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Accuracy</span>
                    <Badge variant={rule_effectiveness.blacklist_rule.accuracy >= 70 ? 'default' : 'destructive'}>
                      {rule_effectiveness.blacklist_rule.accuracy}%
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Amount Flagged</span>
                    <span className="font-semibold">
                      ₩{rule_effectiveness.blacklist_rule.total_amount_flagged.toLocaleString()}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Graylist Rule Performance</CardTitle>
                <CardDescription>Medium-risk MCC monitoring effectiveness</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Cases</span>
                    <span className="font-semibold">{rule_effectiveness.graylist_rule.total_cases}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">True Positives</span>
                    <span className="font-semibold text-green-600">
                      {rule_effectiveness.graylist_rule.true_positives}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">False Positives</span>
                    <span className="font-semibold text-red-600">
                      {rule_effectiveness.graylist_rule.false_positives}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Accuracy</span>
                    <Badge variant={rule_effectiveness.graylist_rule.accuracy >= 70 ? 'default' : 'destructive'}>
                      {rule_effectiveness.graylist_rule.accuracy}%
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Amount Flagged</span>
                    <span className="font-semibold">
                      ₩{rule_effectiveness.graylist_rule.total_amount_flagged.toLocaleString()}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Optimization Recommendations */}
          {rule_effectiveness.recommendations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-500" />
                  Optimization Recommendations
                </CardTitle>
                <CardDescription>Suggested improvements for fraud detection rules</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {rule_effectiveness.recommendations.map((rec, idx) => (
                    <div key={idx} className="border-l-4 border-yellow-500 pl-4 py-2">
                      <div className="font-semibold">{rec.rule}</div>
                      <div className="text-sm text-muted-foreground mt-1">
                        <span className="font-medium">Issue:</span> {rec.issue}
                      </div>
                      <div className="text-sm mt-1">
                        <span className="font-medium">Suggestion:</span> {rec.suggestion}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Footer */}
      <div className="text-center text-sm text-muted-foreground">
        Last updated: {new Date(report.generated_at).toLocaleString('ko-KR')}
      </div>
    </div>
  );
}
