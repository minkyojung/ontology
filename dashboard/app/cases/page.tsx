import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CasesTable } from './components/CasesTable';
import { getDriver } from '@/lib/neo4j/driver';

interface Case {
  id: string;
  caseId: string;
  caseType?: string;
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


async function getCases(): Promise<Case[]> {
  const driver = getDriver();
  const session = driver.session();

  try {
    const result = await session.run(`
      MATCH (c:Case)
      OPTIONAL MATCH (c)-[:INVOLVES_TRANSACTION]->(t:Transaction)
      OPTIONAL MATCH (e:Employee)-[:MADE_TRANSACTION]->(t)
      OPTIONAL MATCH (t)-[:AT_MERCHANT]->(m:Merchant)
      OPTIONAL MATCH (m)-[:HAS_MCC]->(mcc:MCC)
      OPTIONAL MATCH (c)-[:CITES_RULE]->(rule:TaxRule)
      WITH c, t, e, m, mcc,
           collect(DISTINCT {
             ruleId: rule.ruleId,
             name: rule.name,
             legalReference: rule.legalReference
           }) as taxRules
      RETURN
        elementId(c) as id,
        c.case_id as caseId,
        c.case_type as caseType,
        c.severity as severity,
        c.status as status,
        c.description as description,
        c.assigned_to as assignedTo,
        toString(c.created_at) as createdAt,
        e.name as employeeName,
        e.department as employeeDepartment,
        t.id as transactionId,
        t.amount as amount,
        toString(t.transacted_at) as transactionDate,
        m.name as merchantName,
        mcc.code as mccCode,
        mcc.risk_group as mccRiskGroup,
        taxRules
      ORDER BY c.created_at DESC
      LIMIT 500
    `);

    const cases = result.records.map((record) => {
      const amount = record.get('amount');

      return {
        id: record.get('id') || 'unknown',
        caseId: record.get('caseId') || 'N/A',
        caseType: record.get('caseType') || undefined,
        severity: record.get('severity') || 'UNKNOWN',
        status: record.get('status') || 'UNKNOWN',
        description: record.get('description') || '',
        assignedTo: record.get('assignedTo') || 'Unassigned',
        createdAt: record.get('createdAt') || '',
        employee: {
          name: record.get('employeeName') || 'N/A',
          department: record.get('employeeDepartment') || 'N/A',
        },
        transaction: {
          transactionId: record.get('transactionId') || 'N/A',
          amount: typeof amount?.toNumber === 'function' ? amount.toNumber() : (amount || 0),
          transactionDate: record.get('transactionDate') || 'N/A',
          merchantName: record.get('merchantName') || 'N/A',
          mccCode: record.get('mccCode') || 'N/A',
          mccRiskGroup: record.get('mccRiskGroup') || 'N/A',
        },
        taxRules: record.get('taxRules').filter((rule: { ruleId: string | null }) => rule.ruleId !== null)
      };
    });

    return cases;
  } catch (error) {
    console.error('Error fetching cases:', error);
    return [];
  } finally {
    await session.close();
  }
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
    <div className="p-4">
      <div className="mb-4">
        <h1 className="text-2xl font-bold">Fraud Cases</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage and investigate fraud detection cases
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-3 md:grid-cols-4 mb-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Total Cases
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Open Cases
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{stats.open}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Critical
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{stats.critical}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              High Priority
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{stats.high}</div>
          </CardContent>
        </Card>
      </div>

      <CasesTable cases={cases} />
    </div>
  );
}
