import { getDriver } from '../neo4j/driver';

/**
 * Get 2-hop network for a specific case
 * Returns: Case → Transaction → Employee/Merchant + Related Transactions
 */
export async function getCaseNetwork(caseId: string) {
  const driver = getDriver();
  const session = driver.session();

  try {
    const result = await session.run(
      `
      // Get the case and its direct transaction
      MATCH (c:Case {case_id: $caseId})-[:INVOLVES_TRANSACTION]->(t:Transaction)

      // Get employee and merchant
      OPTIONAL MATCH (e:Employee)-[:MADE_TRANSACTION]->(t)
      OPTIONAL MATCH (t)-[:AT_MERCHANT]->(m:Merchant)
      OPTIONAL MATCH (m)-[:HAS_MCC]->(mcc:MCC)

      // Get related transactions by the same employee (2-hop)
      OPTIONAL MATCH (e)-[:MADE_TRANSACTION]->(related:Transaction)
      WHERE related.id <> t.id
        AND related.transacted_at IS NOT NULL
        AND t.transacted_at IS NOT NULL
        AND duration.between(
          datetime(related.transacted_at),
          datetime(t.transacted_at)
        ).days <= 30
      OPTIONAL MATCH (related)-[:AT_MERCHANT]->(relatedMerchant:Merchant)

      // Collect all data
      RETURN
        c,
        t,
        e,
        m,
        mcc,
        collect(DISTINCT {
          transaction: related,
          merchant: relatedMerchant
        }) as relatedTransactions
      `,
      { caseId }
    );

    if (result.records.length === 0) {
      return null;
    }

    const record = result.records[0];

    return {
      case: record.get('c'),
      transaction: record.get('t'),
      employee: record.get('e'),
      merchant: record.get('m'),
      mcc: record.get('mcc'),
      relatedTransactions: record.get('relatedTransactions'),
    };
  } finally {
    await session.close();
  }
}

/**
 * Get employee network (all transactions by an employee)
 */
export async function getEmployeeNetwork(employeeId: string) {
  const driver = getDriver();
  const session = driver.session();

  try {
    const result = await session.run(
      `
      MATCH (e:Employee {id: $employeeId})
      OPTIONAL MATCH (e)-[:MADE_TRANSACTION]->(t:Transaction)
      OPTIONAL MATCH (t)-[:AT_MERCHANT]->(m:Merchant)
      OPTIONAL MATCH (m)-[:HAS_MCC]->(mcc:MCC)

      RETURN
        e,
        collect(DISTINCT {
          transaction: t,
          merchant: m,
          mcc: mcc
        }) as transactions
      `,
      { employeeId }
    );

    if (result.records.length === 0) {
      return null;
    }

    const record = result.records[0];

    return {
      employee: record.get('e'),
      transactions: record.get('transactions'),
    };
  } finally {
    await session.close();
  }
}

/**
 * Get merchant network (all employees who transacted with a merchant)
 */
export async function getMerchantNetwork(merchantId: string) {
  const driver = getDriver();
  const session = driver.session();

  try {
    const result = await session.run(
      `
      MATCH (m:Merchant {name: $merchantId})
      OPTIONAL MATCH (m)<-[:AT_MERCHANT]-(t:Transaction)
      OPTIONAL MATCH (e:Employee)-[:MADE_TRANSACTION]->(t)

      RETURN
        m,
        collect(DISTINCT {
          transaction: t,
          employee: e
        }) as transactions
      `,
      { merchantId }
    );

    if (result.records.length === 0) {
      return null;
    }

    const record = result.records[0];

    return {
      merchant: record.get('m'),
      transactions: record.get('transactions'),
    };
  } finally {
    await session.close();
  }
}
