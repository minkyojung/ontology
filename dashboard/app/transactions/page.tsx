import Link from 'next/link';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getTransactions } from '@/lib/neo4j/queries';

interface Transaction {
  id: string;
  date: string;
  employee: string;
  amount: number;
  merchant: string;
  mcc: string;
  status: string;
  riskScore: number;
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'approved':
      return <Badge variant="default" className="bg-green-600">Approved</Badge>;
    case 'flagged':
      return <Badge variant="default" className="bg-yellow-600">Flagged</Badge>;
    case 'rejected':
      return <Badge variant="destructive">Rejected</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

function getRiskScoreBadge(score: number) {
  if (score < 0.3) {
    return <Badge variant="outline" className="text-green-600">Low</Badge>;
  } else if (score < 0.7) {
    return <Badge variant="outline" className="text-yellow-600">Medium</Badge>;
  } else {
    return <Badge variant="outline" className="text-red-600">High</Badge>;
  }
}

export default async function TransactionsPage() {
  let transactions: Transaction[];
  try {
    transactions = await getTransactions();
  } catch (error) {
    console.error('Error fetching transactions:', error);
    // Fallback to mock data
    transactions = [
      {
        id: '1',
        date: '2025-10-20',
        employee: 'Kim Min-jun',
        amount: 125000,
        merchant: 'Starbucks Seoul',
        mcc: '5814',
        status: 'approved',
        riskScore: 0.15,
      },
    ];
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Transactions</h1>
        <p className="text-muted-foreground mt-2">
          View and manage all expense transactions
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Employee</TableHead>
                <TableHead>Merchant</TableHead>
                <TableHead>MCC</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Risk Score</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((tx) => (
                <TableRow key={tx.id} className="cursor-pointer hover:bg-muted/50">
                  <TableCell>
                    <Link href={`/transactions/${tx.id}`} className="hover:underline">
                      {tx.date}
                    </Link>
                  </TableCell>
                  <TableCell>{tx.employee}</TableCell>
                  <TableCell>{tx.merchant}</TableCell>
                  <TableCell>{tx.mcc}</TableCell>
                  <TableCell className="text-right font-medium">
                    ₩{tx.amount.toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getRiskScoreBadge(tx.riskScore)}
                      <span className="text-sm text-muted-foreground">
                        {(tx.riskScore * 100).toFixed(0)}%
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(tx.status)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
