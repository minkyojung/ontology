import { NextResponse } from 'next/server';
import { getDriver } from '@/lib/neo4j/driver';

export async function GET() {
  const driver = getDriver();
  const session = driver.session();

  try {
    const result = await session.run(`
      MATCH (e:Employee)
      OPTIONAL MATCH (t:Transaction)-[:MADE_BY]->(e)
      WITH e, count(t) as totalTransactions,
           collect(CASE WHEN t.risk_score > 0.7 THEN t ELSE null END) as flaggedTxs
      RETURN
        e.employee_id as id,
        e.name as name,
        e.department as department,
        e.email as email,
        totalTransactions,
        size([x IN flaggedTxs WHERE x IS NOT NULL]) as flaggedTransactions,
        avg(CASE WHEN totalTransactions > 0 THEN e.risk_score ELSE 0 END) as riskScore
      ORDER BY e.name
    `);

    const employees = result.records.map((record) => ({
      id: record.get('id'),
      name: record.get('name'),
      department: record.get('department'),
      email: record.get('email'),
      totalTransactions: record.get('totalTransactions').toNumber(),
      flaggedTransactions: record.get('flaggedTransactions'),
      riskScore: record.get('riskScore') || 0,
    }));

    return NextResponse.json(employees);
  } catch (_error) {
    return NextResponse.json(
      { error: 'Failed to fetch employees' },
      { status: 500 }
    );
  } finally {
    await session.close();
  }
}
