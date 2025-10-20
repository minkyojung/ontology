import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CheckCircle, XCircle } from 'lucide-react';

interface TransactionDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

// Mock data - will be replaced with API calls
const transactionDetails = {
  id: '1',
  date: '2025-10-20',
  time: '14:30:25',
  employee: {
    id: 'E001',
    name: 'Kim Min-jun',
    department: 'Engineering',
    email: 'minjun.kim@company.com',
  },
  merchant: {
    name: 'Starbucks Seoul Station',
    category: 'Restaurant',
    mcc: '5814',
    location: 'Seoul, South Korea',
  },
  amount: 125000,
  currency: 'KRW',
  status: 'approved',
  riskScore: 0.15,
  riskFactors: [
    { factor: 'MCC Category', score: 0.1, severity: 'low' },
    { factor: 'Amount Range', score: 0.05, severity: 'low' },
  ],
  rules: [
    {
      name: 'MCC Blacklist Check',
      passed: true,
      description: 'Transaction MCC is not in blacklist',
    },
    {
      name: 'Amount Threshold',
      passed: true,
      description: 'Amount within acceptable range',
    },
    {
      name: 'Duplicate Detection',
      passed: true,
      description: 'No duplicate transactions found',
    },
  ],
};

export default async function TransactionDetailPage({ params }: TransactionDetailPageProps) {
  const { id } = await params;

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Transaction Detail</h1>
        <p className="text-muted-foreground mt-2">
          Transaction ID: {id}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Transaction Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Date & Time</p>
                  <p className="font-medium">
                    {transactionDetails.date} {transactionDetails.time}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Amount</p>
                  <p className="font-medium text-xl">
                    ₩{transactionDetails.amount.toLocaleString()}
                  </p>
                </div>
              </div>

              <Separator />

              <div>
                <p className="text-sm text-muted-foreground mb-2">Merchant</p>
                <p className="font-medium">{transactionDetails.merchant.name}</p>
                <p className="text-sm text-muted-foreground">
                  {transactionDetails.merchant.category} • MCC: {transactionDetails.merchant.mcc}
                </p>
                <p className="text-sm text-muted-foreground">
                  {transactionDetails.merchant.location}
                </p>
              </div>

              <Separator />

              <div>
                <p className="text-sm text-muted-foreground mb-2">Employee</p>
                <p className="font-medium">{transactionDetails.employee.name}</p>
                <p className="text-sm text-muted-foreground">
                  {transactionDetails.employee.department} • {transactionDetails.employee.id}
                </p>
                <p className="text-sm text-muted-foreground">
                  {transactionDetails.employee.email}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Rule Evaluation</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {transactionDetails.rules.map((rule, index) => (
                  <div key={index} className="flex items-start gap-3">
                    {rule.passed ? (
                      <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-600 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <p className="font-medium">{rule.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {rule.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Risk Assessment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Overall Risk Score</span>
                  <Badge variant="outline" className="text-green-600">Low Risk</Badge>
                </div>
                <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="absolute top-0 left-0 h-full bg-green-600"
                    style={{ width: `${transactionDetails.riskScore * 100}%` }}
                  />
                </div>
                <p className="text-right text-sm text-muted-foreground mt-1">
                  {(transactionDetails.riskScore * 100).toFixed(1)}%
                </p>
              </div>

              <Separator />

              <div>
                <p className="text-sm font-medium mb-3">Risk Factors</p>
                <div className="space-y-2">
                  {transactionDetails.riskFactors.map((factor, index) => (
                    <div key={index} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{factor.factor}</span>
                      <Badge
                        variant="outline"
                        className={
                          factor.severity === 'low'
                            ? 'text-green-600'
                            : factor.severity === 'medium'
                            ? 'text-yellow-600'
                            : 'text-red-600'
                        }
                      >
                        {(factor.score * 100).toFixed(0)}%
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Status</CardTitle>
            </CardHeader>
            <CardContent>
              <Badge
                variant="default"
                className="bg-green-600 text-white w-full justify-center py-2"
              >
                Approved
              </Badge>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
