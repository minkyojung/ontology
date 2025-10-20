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
      MATCH (c:Case)
      WHERE elementId(c) = $id
      OPTIONAL MATCH (c)-[:RELATED_TO_TRANSACTION]->(t:Transaction)
      OPTIONAL MATCH (e:Employee)-[:MADE_TRANSACTION]->(t)
      OPTIONAL MATCH (t)-[:AT_MERCHANT]->(m:Merchant)
      OPTIONAL MATCH (m)-[:HAS_MCC]->(mcc:MCC)
      OPTIONAL MATCH (c)-[:CITES_RULE]->(rule:TaxRule)
      WITH c, t, e, m, mcc,
           collect(DISTINCT {
             ruleId: rule.ruleId,
             name: rule.name,
             legalReference: rule.legalReference,
             description: rule.description
           }) as taxRules
      RETURN
        elementId(c) as id,
        c.caseId as caseId,
        c.severity as severity,
        c.status as status,
        c.description as description,
        c.assignedTo as assignedTo,
        c.detection_reasoning as detectionReasoning,
        toString(c.createdAt) as createdAt,
        e.employeeId as employeeId,
        e.name as employeeName,
        e.department as employeeDepartment,
        e.email as employeeEmail,
        t.transactionId as transactionId,
        t.amount as amount,
        t.currency as currency,
        toString(t.transactionDate) as transactionDate,
        t.description as transactionDescription,
        t.riskScore as riskScore,
        m.name as merchantName,
        m.city as merchantCity,
        m.country as merchantCountry,
        mcc.code as mccCode,
        mcc.category as mccCategory,
        mcc.description as mccDescription,
        mcc.risk_group as mccRiskGroup,
        taxRules
      `,
      { id }
    );

    if (result.records.length === 0) {
      return NextResponse.json(
        { error: 'Case not found' },
        { status: 404 }
      );
    }

    const record = result.records[0];
    const amount = record.get('amount');
    const riskScore = record.get('riskScore');

    // Parse detection reasoning if it exists
    let detectionReasoning = null;
    const reasoningStr = record.get('detectionReasoning');
    if (reasoningStr) {
      try {
        detectionReasoning = JSON.parse(reasoningStr);
      } catch (e) {
        console.error('Failed to parse detection_reasoning:', e);
      }
    }

    const caseDetail = {
      id: record.get('id'),
      caseId: record.get('caseId'),
      severity: record.get('severity'),
      status: record.get('status'),
      description: record.get('description'),
      assignedTo: record.get('assignedTo'),
      detectionReasoning,
      createdAt: record.get('createdAt'),
      employee: {
        id: record.get('employeeId'),
        name: record.get('employeeName'),
        department: record.get('employeeDepartment'),
        email: record.get('employeeEmail')
      },
      transaction: {
        transactionId: record.get('transactionId'),
        amount: typeof amount?.toNumber === 'function' ? amount.toNumber() : (amount || 0),
        currency: record.get('currency'),
        transactionDate: record.get('transactionDate'),
        description: record.get('transactionDescription'),
        riskScore: typeof riskScore?.toNumber === 'function' ? riskScore.toNumber() : (riskScore || 0),
        merchantName: record.get('merchantName'),
        merchantCity: record.get('merchantCity'),
        merchantCountry: record.get('merchantCountry')
      },
      mcc: {
        code: record.get('mccCode'),
        category: record.get('mccCategory'),
        description: record.get('mccDescription'),
        riskGroup: record.get('mccRiskGroup')
      },
      taxRules: record.get('taxRules').filter((rule: { ruleId: string | null }) => rule.ruleId !== null)
    };

    return NextResponse.json(caseDetail);
  } catch (error) {
    console.error('Error fetching case detail:', error);
    return NextResponse.json(
      { error: 'Failed to fetch case detail' },
      { status: 500 }
    );
  } finally {
    await session.close();
  }
}

// PATCH endpoint for updating case status
export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const body = await request.json();
  const { action, comment } = body;

  const driver = getDriver();
  const session = driver.session();

  try {
    // Map action to status
    let newStatus = 'OPEN';
    switch (action) {
      case 'approve':
        newStatus = 'RESOLVED';
        break;
      case 'reject':
        newStatus = 'REJECTED';
        break;
      case 'hold':
        newStatus = 'IN_PROGRESS';
        break;
      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

    // Update case status
    await session.run(
      `
      MATCH (c:Case)
      WHERE elementId(c) = $id
      SET c.status = $status,
          c.updatedAt = datetime(),
          c.lastAction = $action,
          c.lastComment = $comment
      RETURN c
      `,
      { id, status: newStatus, action, comment: comment || '' }
    );

    return NextResponse.json({ success: true, status: newStatus });
  } catch (error) {
    console.error('Error updating case:', error);
    return NextResponse.json(
      { error: 'Failed to update case' },
      { status: 500 }
    );
  } finally {
    await session.close();
  }
}
