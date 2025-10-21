import { NextResponse } from 'next/server';
import { getDriver } from '@/lib/neo4j/driver';

export async function GET() {
  const driver = getDriver();
  const session = driver.session();

  try {
    // Get all case types with reasonable limits per type
    const result = await session.run(`
      CALL {
        MATCH (c:Case {case_type: 'SPLIT_PAYMENT'})
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
        RETURN c, t, e, m, mcc, taxRules
        LIMIT 50

        UNION ALL

        MATCH (c:Case {case_type: 'WEEKEND_TRANSACTION'})
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
        RETURN c, t, e, m, mcc, taxRules
        ORDER BY c.created_at DESC
        LIMIT 200

        UNION ALL

        MATCH (c:Case {case_type: 'GRAYLIST_MCC'})
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
        RETURN c, t, e, m, mcc, taxRules
        ORDER BY c.created_at DESC
        LIMIT 200

        UNION ALL

        MATCH (c:Case {case_type: 'BLACKLIST_MCC'})
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
        RETURN c, t, e, m, mcc, taxRules
        ORDER BY c.created_at DESC
        LIMIT 200

        UNION ALL

        MATCH (c:Case {case_type: 'OFF_HOURS'})
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
        RETURN c, t, e, m, mcc, taxRules
        ORDER BY c.created_at DESC
        LIMIT 200
      }
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
        taxRules: record.get('taxRules').filter((rule: { ruleId: string | null }) => rule.ruleId !== null)
      };
    });

    return NextResponse.json(cases);
  } catch (_error) {
    return NextResponse.json(
      { error: 'Failed to fetch cases' },
      { status: 500 }
    );
  } finally {
    await session.close();
  }
}
