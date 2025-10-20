import { NextResponse } from 'next/server';
import { getDriver } from '@/lib/neo4j/driver';

export async function GET() {
  const driver = getDriver();
  const session = driver.session();

  try {
    const result = await session.run(`
      MATCH (t:Transaction)-[:MADE_BY]->(e:Employee)
      MATCH (t)-[:BELONGS_TO]->(m:Merchant)
      OPTIONAL MATCH (m)-[:HAS_MCC]->(mcc:MCC)
      RETURN
        t.transaction_id as id,
        t.date as date,
        e.name as employee,
        t.amount as amount,
        m.name as merchant,
        mcc.code as mcc,
        t.status as status,
        t.risk_score as riskScore
      ORDER BY t.date DESC
      LIMIT 50
    `);

    const transactions = result.records.map((record) => ({
      id: record.get('id'),
      date: record.get('date'),
      employee: record.get('employee'),
      amount: record.get('amount'),
      merchant: record.get('merchant'),
      mcc: record.get('mcc'),
      status: record.get('status'),
      riskScore: record.get('riskScore'),
    }));

    return NextResponse.json(transactions);
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transactions' },
      { status: 500 }
    );
  } finally {
    await session.close();
  }
}
