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

interface Case {
  id: string;
  caseId: string;
  severity: string;
  status: string;
  description: string;
  assignedTo: string;
  createdAt: string;
  employee: {
    name: string;
    department: string;
  };
  transaction: {
    transactionId: string;
    amount: number;
    transactionDate: string;
    merchantName: string;
    mccCode: string;
    mccRiskGroup: string;
  };
  taxRules: Array<{
    ruleId: string;
    name: string;
    legalReference: string;
  }>;
}

function getSeverityBadge(severity: string) {
  switch (severity.toUpperCase()) {
    case 'CRITICAL':
      return <Badge variant="destructive">CRITICAL</Badge>;
    case 'HIGH':
      return <Badge variant="default" className="bg-orange-600">HIGH</Badge>;
    case 'MEDIUM':
      return <Badge variant="default" className="bg-yellow-600">MEDIUM</Badge>;
    case 'LOW':
      return <Badge variant="outline">LOW</Badge>;
    default:
      return <Badge variant="secondary">{severity}</Badge>;
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

async function getCases(): Promise<Case[]> {
  const res = await fetch('http://localhost:3004/api/cases', {
    cache: 'no-store'
  });

  if (!res.ok) {
    console.error('Failed to fetch cases');
    return [];
  }

  return res.json();
}

export default async function CasesPage() {
  const cases = await getCases();

  // Calculate stats
  const stats = {
    total: cases.length,
    open: cases.filter(c => c.status === 'OPEN').length,
    critical: cases.filter(c => c.severity === 'CRITICAL').length,
    high: cases.filter(c => c.severity === 'HIGH').length,
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Fraud Cases</h1>
        <p className="text-muted-foreground mt-2">
          Manage and investigate fraud detection cases
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Cases
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Open Cases
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.open}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Critical
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.critical}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              High Priority
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.high}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Cases</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Case ID</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Employee</TableHead>
                <TableHead>Transaction</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>MCC</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Assigned To</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cases.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground">
                    No cases found
                  </TableCell>
                </TableRow>
              ) : (
                cases.map((c) => (
                  <TableRow key={c.id} className="cursor-pointer hover:bg-muted/50">
                    <TableCell>
                      <Link
                        href={`/cases/${c.id}`}
                        className="font-mono text-sm hover:underline text-blue-600"
                      >
                        {c.caseId}
                      </Link>
                    </TableCell>
                    <TableCell>{getSeverityBadge(c.severity)}</TableCell>
                    <TableCell>{getStatusBadge(c.status)}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{c.employee.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {c.employee.department}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-mono text-xs">{c.transaction.transactionId || 'N/A'}</span>
                        <span className="text-xs text-muted-foreground">
                          {c.transaction.merchantName}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      ₩{c.transaction.amount.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <span className="font-mono text-xs">{c.transaction.mccCode}</span>
                        {c.transaction.mccRiskGroup && (
                          <Badge
                            variant="outline"
                            className={
                              c.transaction.mccRiskGroup === 'BLACK'
                                ? 'bg-red-50 text-red-700 border-red-300 text-xs'
                                : c.transaction.mccRiskGroup === 'GRAY'
                                ? 'bg-yellow-50 text-yellow-700 border-yellow-300 text-xs'
                                : 'bg-green-50 text-green-700 border-green-300 text-xs'
                            }
                          >
                            {c.transaction.mccRiskGroup}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {new Date(c.createdAt).toLocaleDateString('ko-KR')}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{c.assignedTo}</span>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
