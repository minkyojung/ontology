import { NextResponse } from 'next/server';
import { getDriver } from '@/lib/neo4j/driver';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const driver = getDriver();
  const session = driver.session();

  try {
    const result = await session.run(
      `
      MATCH (e:Employee)-[:MADE_TRANSACTION]->(t:Transaction)
      WHERE elementId(t) = $id
      MATCH (t)-[:AT_MERCHANT]->(m:Merchant)
      OPTIONAL MATCH (m)-[:HAS_MCC]->(mcc:MCC)
      OPTIONAL MATCH (mcc)<-[:APPLIES_TO_MCC]-(tax:TaxRule)
      RETURN
        elementId(t) as id,
        t.transactionDate as transactionDate,
        t.transactionId as transactionId,
        e.employeeId as employeeId,
        e.name as employeeName,
        e.department as employeeDepartment,
        e.email as employeeEmail,
        t.amount as amount,
        t.currency as currency,
        m.name as merchantName,
        m.city as merchantCity,
        m.country as merchantCountry,
        mcc.code as mccCode,
        mcc.category as mccCategory,
        mcc.description as mccDescription,
        mcc.risk_group as mccRiskGroup,
        mcc.risk_level as mccRiskLevel,
        collect(DISTINCT {
          ruleId: tax.ruleId,
          name: tax.name,
          legalReference: tax.legalReference
        }) as taxRules,
        t.status as status,
        t.riskScore as riskScore,
        t.description as description
      `,
      { id }
    );

    if (result.records.length === 0) {
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      );
    }

    const record = result.records[0];
    const amount = record.get('amount');
    const riskScore = record.get('riskScore');
    const mccRiskLevel = record.get('mccRiskLevel');
    const transactionDate = record.get('transactionDate');

    // Convert Neo4j DateTime to string
    let dateString = 'N/A';
    if (transactionDate && typeof transactionDate === 'object' && transactionDate.year) {
      dateString = `${transactionDate.year}-${String(transactionDate.month).padStart(2, '0')}-${String(transactionDate.day).padStart(2, '0')} ${String(transactionDate.hour).padStart(2, '0')}:${String(transactionDate.minute).padStart(2, '0')}`;
    } else if (typeof transactionDate === 'string') {
      dateString = transactionDate;
    }

    const transaction = {
      id: record.get('id'),
      transactionId: record.get('transactionId'),
      transactionDate: dateString,
      description: record.get('description'),
      employee: {
        id: record.get('employeeId'),
        name: record.get('employeeName'),
        department: record.get('employeeDepartment'),
        email: record.get('employeeEmail'),
      },
      merchant: {
        name: record.get('merchantName'),
        city: record.get('merchantCity'),
        country: record.get('merchantCountry'),
      },
      mcc: {
        code: record.get('mccCode'),
        category: record.get('mccCategory'),
        description: record.get('mccDescription'),
        riskGroup: record.get('mccRiskGroup'),
        riskLevel: typeof mccRiskLevel?.toNumber === 'function' ? mccRiskLevel.toNumber() : (mccRiskLevel || 0),
      },
      taxRules: record.get('taxRules').filter((rule: any) => rule.ruleId !== null),
      amount: typeof amount?.toNumber === 'function' ? amount.toNumber() : (amount || 0),
      currency: record.get('currency'),
      status: record.get('status'),
      riskScore: typeof riskScore?.toNumber === 'function' ? riskScore.toNumber() : (riskScore || 0),
    };

    return NextResponse.json(transaction);
  } catch (error) {
    console.error('Error fetching transaction detail:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transaction detail' },
      { status: 500 }
    );
  } finally {
    await session.close();
  }
}
