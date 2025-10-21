import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface EvalsMetrics {
  timestamp: string;
  riskDistribution: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    total: number;
  };
  mccImpact: Array<{
    riskGroup: string;
    totalTransactions: number;
    flaggedTransactions: number;
    detectionRate: number;
    totalAmount: number;
  }>;
  precisionRecall: {
    truePositives: number;
    falsePositives: number;
    trueNegatives: number;
    falseNegatives: number;
    precision: number;
    recall: number;
    f1Score: number;
    accuracy: number;
  };
  recoveryPotential: {
    criticalAmount: number;
    highAmount: number;
    mediumAmount: number;
    totalFlagged: number;
    totalAmount: number;
    potentialRecovery: number;
  };
  caseStats: {
    totalCases: number;
    openCases: number;
    criticalCases: number;
    highCases: number;
  };
  employeeRiskStats: {
    totalEmployees: number;
    highRiskEmployees: number;
    mediumRiskEmployees: number;
    lowRiskEmployees: number;
  };
}

async function getEvalsMetrics(): Promise<EvalsMetrics> {
  const res = await fetch('http://localhost:3004/api/evals', {
    cache: 'no-store'
  });

  if (!res.ok) {
    throw new Error('Failed to fetch evaluation metrics');
  }

  return res.json();
}

export default async function EvalsPage() {
  const metrics = await getEvalsMetrics();

  const riskDist = metrics.riskDistribution;
  const pr = metrics.precisionRecall;
  const recovery = metrics.recoveryPotential;

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Evaluation Metrics</h1>
        <p className="text-muted-foreground mt-2">
          Fraud detection system performance and impact analysis
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          Last updated: {new Date(metrics.timestamp).toLocaleString('ko-KR')}
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-6 md:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Precision
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {(pr.precision * 100).toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Flagged transactions accuracy
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Recall
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">
              {(pr.recall * 100).toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Fraud detection coverage
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              F1 Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-600">
              {(pr.f1Score * 100).toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Overall performance
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Potential Recovery
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">
              ₩{(recovery.potentialRecovery / 1000000).toFixed(1)}M
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {((recovery.potentialRecovery / recovery.totalAmount) * 100).toFixed(1)}% of total
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2 mb-6">
        {/* Confusion Matrix */}
        <Card>
          <CardHeader>
            <CardTitle>Confusion Matrix</CardTitle>
            <CardDescription>Classification performance breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="border rounded-lg p-4 bg-green-50">
                <div className="text-sm font-medium text-green-700 mb-1">
                  True Positives
                </div>
                <div className="text-2xl font-bold text-green-900">
                  {pr.truePositives}
                </div>
                <div className="text-xs text-green-600 mt-1">
                  Correctly flagged fraud
                </div>
              </div>

              <div className="border rounded-lg p-4 bg-red-50">
                <div className="text-sm font-medium text-red-700 mb-1">
                  False Positives
                </div>
                <div className="text-2xl font-bold text-red-900">
                  {pr.falsePositives}
                </div>
                <div className="text-xs text-red-600 mt-1">
                  Incorrect flags
                </div>
              </div>

              <div className="border rounded-lg p-4 bg-yellow-50">
                <div className="text-sm font-medium text-yellow-700 mb-1">
                  False Negatives
                </div>
                <div className="text-2xl font-bold text-yellow-900">
                  {pr.falseNegatives}
                </div>
                <div className="text-xs text-yellow-600 mt-1">
                  Missed fraud
                </div>
              </div>

              <div className="border rounded-lg p-4 bg-blue-50">
                <div className="text-sm font-medium text-blue-700 mb-1">
                  True Negatives
                </div>
                <div className="text-2xl font-bold text-blue-900">
                  {pr.trueNegatives}
                </div>
                <div className="text-xs text-blue-600 mt-1">
                  Correctly cleared
                </div>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Accuracy:</span>
                <span className="font-medium">{(pr.accuracy * 100).toFixed(2)}%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Risk Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Risk Distribution</CardTitle>
            <CardDescription>Transaction distribution by risk level</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium flex items-center gap-2">
                    <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300">
                      CRITICAL
                    </Badge>
                  </span>
                  <span className="text-sm font-medium">
                    {riskDist.critical} ({((riskDist.critical / riskDist.total) * 100).toFixed(1)}%)
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-red-600 h-2 rounded-full"
                    style={{ width: `${(riskDist.critical / riskDist.total) * 100}%` }}
                  ></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium flex items-center gap-2">
                    <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-300">
                      HIGH
                    </Badge>
                  </span>
                  <span className="text-sm font-medium">
                    {riskDist.high} ({((riskDist.high / riskDist.total) * 100).toFixed(1)}%)
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-orange-600 h-2 rounded-full"
                    style={{ width: `${(riskDist.high / riskDist.total) * 100}%` }}
                  ></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium flex items-center gap-2">
                    <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">
                      MEDIUM
                    </Badge>
                  </span>
                  <span className="text-sm font-medium">
                    {riskDist.medium} ({((riskDist.medium / riskDist.total) * 100).toFixed(1)}%)
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-yellow-600 h-2 rounded-full"
                    style={{ width: `${(riskDist.medium / riskDist.total) * 100}%` }}
                  ></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium flex items-center gap-2">
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
                      LOW
                    </Badge>
                  </span>
                  <span className="text-sm font-medium">
                    {riskDist.low} ({((riskDist.low / riskDist.total) * 100).toFixed(1)}%)
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-green-600 h-2 rounded-full"
                    style={{ width: `${(riskDist.low / riskDist.total) * 100}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* MCC Impact & Recovery */}
      <div className="grid gap-6 md:grid-cols-2 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>MCC Detection Performance</CardTitle>
            <CardDescription>Detection rates by MCC risk group</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {metrics.mccImpact.map((mcc) => (
                <div key={mcc.riskGroup} className="border-b pb-3 last:border-0">
                  <div className="flex justify-between items-center mb-2">
                    <Badge
                      variant="outline"
                      className={
                        mcc.riskGroup === 'BLACK'
                          ? 'bg-red-50 text-red-700 border-red-300'
                          : mcc.riskGroup === 'GRAY'
                          ? 'bg-yellow-50 text-yellow-700 border-yellow-300'
                          : 'bg-green-50 text-green-700 border-green-300'
                      }
                    >
                      {mcc.riskGroup}
                    </Badge>
                    <span className="text-sm font-medium">
                      {mcc.detectionRate.toFixed(1)}% detected
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {mcc.flaggedTransactions}/{mcc.totalTransactions} transactions flagged
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Total amount: ₩{(mcc.totalAmount / 1000000).toFixed(1)}M
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recovery Potential</CardTitle>
            <CardDescription>Financial impact of fraud detection</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="border-b pb-3">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-medium text-red-700">CRITICAL Amount</span>
                  <span className="text-lg font-bold text-red-900">
                    ₩{(recovery.criticalAmount / 1000000).toFixed(1)}M
                  </span>
                </div>
                <div className="text-xs text-muted-foreground">
                  High-confidence fraud transactions
                </div>
              </div>

              <div className="border-b pb-3">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-medium text-orange-700">HIGH Amount</span>
                  <span className="text-lg font-bold text-orange-900">
                    ₩{(recovery.highAmount / 1000000).toFixed(1)}M
                  </span>
                </div>
                <div className="text-xs text-muted-foreground">
                  Suspicious transactions requiring review
                </div>
              </div>

              <div className="border-b pb-3">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-medium text-yellow-700">MEDIUM Amount</span>
                  <span className="text-lg font-bold text-yellow-900">
                    ₩{(recovery.mediumAmount / 1000000).toFixed(1)}M
                  </span>
                </div>
                <div className="text-xs text-muted-foreground">
                  Moderate-risk transactions
                </div>
              </div>

              <div className="pt-3 bg-orange-50 -mx-6 -mb-6 px-6 py-4 rounded-b-lg">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Total Potential Recovery</span>
                  <span className="text-2xl font-bold text-orange-600">
                    ₩{(recovery.potentialRecovery / 1000000).toFixed(1)}M
                  </span>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {recovery.totalFlagged} transactions flagged
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Case & Employee Stats */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Case Statistics</CardTitle>
            <CardDescription>Current case workload</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Total Cases</span>
                <span className="text-sm font-medium">{metrics.caseStats.totalCases}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Open Cases</span>
                <span className="text-sm font-medium text-blue-600">
                  {metrics.caseStats.openCases}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Critical Cases</span>
                <span className="text-sm font-medium text-red-600">
                  {metrics.caseStats.criticalCases}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">High Cases</span>
                <span className="text-sm font-medium text-orange-600">
                  {metrics.caseStats.highCases}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Employee Risk Profile</CardTitle>
            <CardDescription>Risk distribution across employees</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Total Employees</span>
                <span className="text-sm font-medium">
                  {metrics.employeeRiskStats.totalEmployees}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">High Risk</span>
                <span className="text-sm font-medium text-red-600">
                  {metrics.employeeRiskStats.highRiskEmployees}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Medium Risk</span>
                <span className="text-sm font-medium text-yellow-600">
                  {metrics.employeeRiskStats.mediumRiskEmployees}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Low Risk</span>
                <span className="text-sm font-medium text-green-600">
                  {metrics.employeeRiskStats.lowRiskEmployees}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
