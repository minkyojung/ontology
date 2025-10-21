import { getDriver } from './driver';

export async function getStats() {
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
      'MATCH (t:Transaction) WHERE t.riskScore > 0.7 RETURN count(t) as flagged'
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

    return {
      totalTransactions,
      flaggedTransactions,
      totalEmployees,
      fraudRate: parseFloat(fraudRate),
    };
  } catch (error) {
    throw error;
  } finally {
    await session.close();
  }
}

export async function getTransactions() {
  const driver = getDriver();
  const session = driver.session();

  try {
    const result = await session.run(`
      MATCH (e:Employee)-[:MADE_TRANSACTION]->(t:Transaction)-[:AT_MERCHANT]->(m:Merchant)
      OPTIONAL MATCH (m)-[:HAS_MCC]->(mcc:MCC)
      WITH t, e, m, mcc
      ORDER BY t.transactionDate DESC
      LIMIT 50
      RETURN
        elementId(t) as id,
        toString(t.transactionDate) as date,
        e.name as employee,
        t.amount as amount,
        m.name as merchant,
        mcc.code as mccCode,
        mcc.risk_group as mccRiskGroup,
        mcc.category as mccCategory,
        t.status as status,
        t.riskScore as riskScore
    `);

    return result.records.map((record) => {
      const amount = record.get('amount');
      const riskScore = record.get('riskScore');

      return {
        id: record.get('id') || 'unknown',
        date: record.get('date') || 'N/A',
        employee: record.get('employee') || 'Unknown',
        amount: typeof amount?.toNumber === 'function'
          ? amount.toNumber()
          : amount || 0,
        merchant: record.get('merchant') || 'Unknown',
        mcc: record.get('mccCode') || 'N/A',
        mccRiskGroup: record.get('mccRiskGroup') || 'N/A',
        mccCategory: record.get('mccCategory') || 'N/A',
        status: record.get('status') || 'unknown',
        riskScore: typeof riskScore?.toNumber === 'function'
          ? riskScore.toNumber()
          : riskScore || 0,
      };
    });
  } catch (error) {
    throw error;
  } finally {
    await session.close();
  }
}

export async function getEmployees() {
  const driver = getDriver();
  const session = driver.session();

  try {
    const result = await session.run(`
      MATCH (e:Employee)
      OPTIONAL MATCH (e)-[:MADE_TRANSACTION]->(t:Transaction)
      WITH e,
           count(t) as totalTransactions,
           sum(CASE WHEN t.riskScore > 0.7 THEN 1 ELSE 0 END) as flaggedCount,
           e.riskScore as employeeRiskScore
      RETURN
        elementId(e) as id,
        e.name as name,
        e.department as department,
        e.email as email,
        totalTransactions,
        flaggedCount as flaggedTransactions,
        employeeRiskScore as riskScore
      ORDER BY e.name
    `);

    return result.records.map((record) => {
      const totalTx = record.get('totalTransactions');
      const flaggedTx = record.get('flaggedTransactions');
      const riskScore = record.get('riskScore');

      return {
        id: record.get('id') || 'unknown',
        name: record.get('name') || 'Unknown',
        department: record.get('department') || 'N/A',
        email: record.get('email') || 'N/A',
        totalTransactions: typeof totalTx?.toNumber === 'function' ? totalTx.toNumber() : (totalTx || 0),
        flaggedTransactions: typeof flaggedTx?.toNumber === 'function' ? flaggedTx.toNumber() : (flaggedTx || 0),
        riskScore: typeof riskScore?.toNumber === 'function' ? riskScore.toNumber() : (riskScore || 0),
      };
    });
  } catch (error) {
    throw error;
  } finally {
    await session.close();
  }
}

export async function getGraphData() {
  const driver = getDriver();
  const session = driver.session();

  try {
    const result = await session.run(`
      MATCH (e:Employee)-[:MADE_TRANSACTION]->(t:Transaction)
      MATCH (t)-[:AT_MERCHANT]->(m:Merchant)
      OPTIONAL MATCH (m)-[:HAS_MCC]->(mcc:MCC)
      RETURN
        elementId(e) as employeeId,
        e.name as employeeName,
        elementId(t) as transactionId,
        t.amount as amount,
        t.status as status,
        t.riskScore as riskScore,
        elementId(m) as merchantId,
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
      const employeeName = record.get('employeeName') || 'Unknown';
      const merchantName = record.get('merchantName') || 'Unknown';
      const amount = record.get('amount');
      const amountValue = typeof amount?.toNumber === 'function' ? amount.toNumber() : (amount || 0);

      if (!nodeIds.has(employeeId)) {
        nodes.push({
          id: employeeId,
          type: 'default',
          data: { label: `${employeeName}\n(Employee)` },
          position: { x: (index % 4) * 300, y: 0 },
          style: { background: '#22c55e', color: 'white', border: '1px solid #16a34a' },
        });
        nodeIds.add(employeeId);
      }

      if (!nodeIds.has(transactionId)) {
        const riskScoreRaw = record.get('riskScore');
        const riskScore = typeof riskScoreRaw?.toNumber === 'function'
          ? riskScoreRaw.toNumber()
          : riskScoreRaw || 0;
        const bgColor = riskScore > 70 ? '#ef4444' : '#3b82f6';
        const borderColor = riskScore > 70 ? '#dc2626' : '#2563eb';

        nodes.push({
          id: transactionId,
          type: 'default',
          data: { label: `Transaction\n₩${amountValue.toLocaleString()}` },
          position: { x: (index % 4) * 300, y: 150 },
          style: { background: bgColor, color: 'white', border: `1px solid ${borderColor}` },
        });
        nodeIds.add(transactionId);
      }

      if (!nodeIds.has(merchantId)) {
        const mccCode = record.get('mccCode');
        nodes.push({
          id: merchantId,
          type: 'default',
          data: {
            label: `${merchantName}\n${mccCode ? `(MCC: ${mccCode})` : ''}`,
          },
          position: { x: (index % 4) * 300, y: 300 },
          style: { background: '#8b5cf6', color: 'white', border: '1px solid #7c3aed' },
        });
        nodeIds.add(merchantId);
      }

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

    return { nodes, edges };
  } catch (error) {
    throw error;
  } finally {
    await session.close();
  }
}
