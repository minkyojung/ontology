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
      MATCH (t:Transaction {transaction_id: $id})-[:MADE_BY]->(e:Employee)
      MATCH (t)-[:BELONGS_TO]->(m:Merchant)
      OPTIONAL MATCH (m)-[:HAS_MCC]->(mcc:MCC)
      RETURN
        t.transaction_id as id,
        t.date as date,
        t.time as time,
        e.employee_id as employeeId,
        e.name as employeeName,
        e.department as employeeDepartment,
        e.email as employeeEmail,
        t.amount as amount,
        t.currency as currency,
        m.name as merchantName,
        m.category as merchantCategory,
        mcc.code as mcc,
        m.location as merchantLocation,
        t.status as status,
        t.risk_score as riskScore
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
    const transaction = {
      id: record.get('id'),
      date: record.get('date'),
      time: record.get('time'),
      employee: {
        id: record.get('employeeId'),
        name: record.get('employeeName'),
        department: record.get('employeeDepartment'),
        email: record.get('employeeEmail'),
      },
      merchant: {
        name: record.get('merchantName'),
        category: record.get('merchantCategory'),
        mcc: record.get('mcc'),
        location: record.get('merchantLocation'),
      },
      amount: record.get('amount'),
      currency: record.get('currency'),
      status: record.get('status'),
      riskScore: record.get('riskScore'),
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
