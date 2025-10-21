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
    // Determine if id is elementId or case_id
    const isElementId = id.includes(':');

    // Simple query first - just get the case
    const result = await session.run(
      isElementId
        ? 'MATCH (c:Case) WHERE elementId(c) = $id RETURN c LIMIT 1'
        : 'MATCH (c:Case {case_id: $id}) RETURN c LIMIT 1',
      { id }
    );

    if (result.records.length === 0) {
      return NextResponse.json(
        { error: 'Case not found' },
        { status: 404 }
      );
    }

    const caseNode = result.records[0].get('c');

    const caseDetail = {
      id: result.records[0].get('c').elementId,
      caseId: caseNode.properties.case_id || 'N/A',
      caseType: caseNode.properties.case_type || null,
      severity: caseNode.properties.severity || 'UNKNOWN',
      status: caseNode.properties.status || 'UNKNOWN',
      description: caseNode.properties.description || '',
      assignedTo: caseNode.properties.assigned_to || 'Unassigned',
      detectionReasoning: null,
      createdAt: caseNode.properties.created_at?.toString() || 'N/A',
      employee: {
        id: 'N/A',
        name: 'N/A',
        department: 'N/A',
        email: 'N/A'
      },
      transaction: {
        transactionId: 'N/A',
        amount: 0,
        currency: 'KRW',
        transactionDate: 'N/A',
        description: 'N/A',
        riskScore: 0,
        merchantName: 'N/A',
        merchantCity: 'N/A',
        merchantCountry: 'N/A'
      },
      mcc: {
        code: 'N/A',
        category: 'N/A',
        description: 'N/A',
        riskGroup: 'N/A'
      },
      taxRules: []
    };

    return NextResponse.json(caseDetail);
  } catch (_error) {
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
  } catch (_error) {
    return NextResponse.json(
      { error: 'Failed to update case' },
      { status: 500 }
    );
  } finally {
    await session.close();
  }
}
