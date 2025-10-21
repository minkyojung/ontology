import { NextResponse } from 'next/server';
import { getDriver } from '@/lib/neo4j/driver';

export async function GET() {
  const driver = getDriver();
  const session = driver.session();

  try {
    // Get transactions with relationships
    const result = await session.run(`
      MATCH (t:Transaction)-[:MADE_BY]->(e:Employee)
      MATCH (t)-[:BELONGS_TO]->(m:Merchant)
      OPTIONAL MATCH (m)-[:HAS_MCC]->(mcc:MCC)
      RETURN
        e.employee_id as employeeId,
        e.name as employeeName,
        t.transaction_id as transactionId,
        t.amount as amount,
        t.status as status,
        t.risk_score as riskScore,
        m.merchant_id as merchantId,
        m.name as merchantName,
        mcc.code as mccCode
      LIMIT 20
    `);

    const nodes: Array<{
      id: string;
      type: string;
      data: { label: string };
      position: { x: number; y: number };
      style: { background: string; color: string; border: string };
    }> = [];
    const edges: Array<{
      id: string;
      source: string;
      target: string;
      label: string;
    }> = [];
    const nodeIds = new Set<string>();

    result.records.forEach((record, index) => {
      const employeeId = `employee-${record.get('employeeId')}`;
      const transactionId = `transaction-${record.get('transactionId')}`;
      const merchantId = `merchant-${record.get('merchantId')}`;

      // Add employee node
      if (!nodeIds.has(employeeId)) {
        nodes.push({
          id: employeeId,
          type: 'default',
          data: { label: `${record.get('employeeName')}\n(Employee)` },
          position: { x: (index % 4) * 300, y: 0 },
          style: { background: '#22c55e', color: 'white', border: '1px solid #16a34a' },
        });
        nodeIds.add(employeeId);
      }

      // Add transaction node
      if (!nodeIds.has(transactionId)) {
        const riskScore = record.get('riskScore');
        const bgColor = riskScore > 0.7 ? '#ef4444' : '#3b82f6';
        const borderColor = riskScore > 0.7 ? '#dc2626' : '#2563eb';

        nodes.push({
          id: transactionId,
          type: 'default',
          data: { label: `Transaction\n₩${record.get('amount').toLocaleString()}` },
          position: { x: (index % 4) * 300, y: 150 },
          style: { background: bgColor, color: 'white', border: `1px solid ${borderColor}` },
        });
        nodeIds.add(transactionId);
      }

      // Add merchant node
      if (!nodeIds.has(merchantId)) {
        const mccCode = record.get('mccCode');
        nodes.push({
          id: merchantId,
          type: 'default',
          data: {
            label: `${record.get('merchantName')}\n${mccCode ? `(MCC: ${mccCode})` : ''}`,
          },
          position: { x: (index % 4) * 300, y: 300 },
          style: { background: '#8b5cf6', color: 'white', border: '1px solid #7c3aed' },
        });
        nodeIds.add(merchantId);
      }

      // Add edges
      edges.push({
        id: `e-${transactionId}-${employeeId}`,
        source: transactionId,
        target: employeeId,
        label: 'MADE_BY',
      });

      edges.push({
        id: `e-${transactionId}-${merchantId}`,
        source: transactionId,
        target: merchantId,
        label: 'BELONGS_TO',
      });
    });

    return NextResponse.json({ nodes, edges });
  } catch (_error) {
    return NextResponse.json(
      { error: 'Failed to fetch graph data' },
      { status: 500 }
    );
  } finally {
    await session.close();
  }
}
