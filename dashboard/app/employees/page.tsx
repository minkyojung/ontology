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
import { getEmployees } from '@/lib/neo4j/queries';

interface Employee {
  id: string;
  name: string;
  department: string;
  email: string;
  totalTransactions: number;
  flaggedTransactions: number;
  riskScore: number;
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

export default async function EmployeesPage() {
  let employees: Employee[];
  try {
    employees = await getEmployees();
  } catch (error) {
    console.error('Error fetching employees:', error);
    // Fallback to mock data
    employees = [
      {
        id: 'E001',
        name: 'Kim Min-jun',
        department: 'Engineering',
        email: 'minjun.kim@company.com',
        totalTransactions: 45,
        flaggedTransactions: 2,
        riskScore: 0.15,
      },
    ];
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Employees</h1>
        <p className="text-muted-foreground mt-2">
          View employee transaction history and risk profiles
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Employees</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="text-right">Total Transactions</TableHead>
                <TableHead className="text-right">Flagged</TableHead>
                <TableHead>Risk Score</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees.map((employee) => (
                <TableRow key={employee.id} className="cursor-pointer hover:bg-muted/50">
                  <TableCell className="font-medium">{employee.id}</TableCell>
                  <TableCell>{employee.name}</TableCell>
                  <TableCell>{employee.department}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {employee.email}
                  </TableCell>
                  <TableCell className="text-right">
                    {employee.totalTransactions}
                  </TableCell>
                  <TableCell className="text-right">
                    {employee.flaggedTransactions > 0 ? (
                      <span className="text-yellow-600 font-medium">
                        {employee.flaggedTransactions}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">
                        {employee.flaggedTransactions}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getRiskScoreBadge(employee.riskScore)}
                      <span className="text-sm text-muted-foreground">
                        {(employee.riskScore * 100).toFixed(0)}%
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
