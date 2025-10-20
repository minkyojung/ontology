import { NextResponse } from 'next/server';
import { getDriver } from '@/lib/neo4j/driver';

export async function GET() {
  const driver = getDriver();
  const session = driver.session();

  try {
    // Get total transactions
    const totalTransactionsResult = await session.run(
      'MATCH (t:Transaction) RETURN count(t) as total'
    );
    const totalTransactions = totalTransactionsResult.records[0]?.get('total').toNumber() || 0;

    // Get flagged transactions
    const flaggedTransactionsResult = await session.run(
      'MATCH (t:Transaction) WHERE t.risk_score > 0.7 RETURN count(t) as flagged'
    );
    const flaggedTransactions = flaggedTransactionsResult.records[0]?.get('flagged').toNumber() || 0;

    // Get total employees
    const totalEmployeesResult = await session.run(
      'MATCH (e:Employee) RETURN count(e) as total'
    );
    const totalEmployees = totalEmployeesResult.records[0]?.get('total').toNumber() || 0;

    // Calculate fraud rate
    const fraudRate = totalTransactions > 0
      ? ((flaggedTransactions / totalTransactions) * 100).toFixed(2)
      : '0.00';

    return NextResponse.json({
      totalTransactions,
      flaggedTransactions,
      totalEmployees,
      fraudRate: parseFloat(fraudRate),
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch statistics' },
      { status: 500 }
    );
  } finally {
    await session.close();
  }
}
