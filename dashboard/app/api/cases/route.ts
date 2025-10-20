import { NextResponse } from 'next/server';
import { getDriver } from '@/lib/neo4j/driver';

export async function GET() {
  const driver = getDriver();
  const session = driver.session();

  try {
    const result = await session.run(`
      MATCH (c:Case)
      OPTIONAL MATCH (c)-[:RELATED_TO_TRANSACTION]->(t:Transaction)
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
        c.caseId as caseId,
        c.severity as severity,
        c.status as status,
        c.description as description,
        c.assignedTo as assignedTo,
        toString(c.createdAt) as createdAt,
        e.name as employeeName,
        e.department as employeeDepartment,
        t.transactionId as transactionId,
        t.amount as amount,
        toString(t.transactionDate) as transactionDate,
        m.name as merchantName,
        mcc.code as mccCode,
        mcc.risk_group as mccRiskGroup,
        taxRules
      ORDER BY c.createdAt DESC
      LIMIT 100
    `);

    const cases = result.records.map((record) => {
      const amount = record.get('amount');

      return {
        id: record.get('id') || 'unknown',
        caseId: record.get('caseId') || 'N/A',
        severity: record.get('severity') || 'UNKNOWN',
        status: record.get('status') || 'UNKNOWN',
        description: record.get('description') || '',
        assignedTo: record.get('assignedTo') || 'Unassigned',
        createdAt: record.get('createdAt') || 'N/A',
        employee: {
          name: record.get('employeeName') || 'Unknown',
          department: record.get('employeeDepartment') || 'N/A'
        },
        transaction: {
          transactionId: record.get('transactionId'),
          amount: typeof amount?.toNumber === 'function' ? amount.toNumber() : (amount || 0),
          transactionDate: record.get('transactionDate') || 'N/A',
          merchantName: record.get('merchantName') || 'Unknown',
          mccCode: record.get('mccCode') || 'N/A',
          mccRiskGroup: record.get('mccRiskGroup') || 'N/A'
        },
        taxRules: record.get('taxRules').filter((rule: any) => rule.ruleId !== null)
      };
    });

    return NextResponse.json(cases);
  } catch (error) {
    console.error('Error fetching cases:', error);
    return NextResponse.json(
      { error: 'Failed to fetch cases' },
      { status: 500 }
    );
  } finally {
    await session.close();
  }
}
