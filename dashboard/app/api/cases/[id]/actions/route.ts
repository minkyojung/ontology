import { NextRequest, NextResponse } from 'next/server';
import { getDriver } from '@/lib/neo4j/driver';

interface RouteContext {
  params: Promise<{ id: string }>;
}

interface ActionRequest {
  action: 'approve' | 'reject' | 'request_receipt';
  comment?: string;
  reason?: string;
  metadata?: {
    action_type?: string;
    policy_reference?: string;
  };
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  try {
    const body: ActionRequest = await request.json();
    const { action, comment, reason, metadata } = body;

    const driver = getDriver();
    const session = driver.session();

    try {
      let result;
      const timestamp = new Date().toISOString();

      switch (action) {
        case 'approve':
          result = await session.run(
            `
            MATCH (c:Case {case_id: $caseId})
            SET c.status = 'APPROVED',
                c.approved_at = datetime($timestamp),
                c.approved_comment = $comment,
                c.updated_at = datetime($timestamp)
            RETURN c
            `,
            { caseId: id, timestamp, comment: comment || '' }
          );
          break;

        case 'reject':
          result = await session.run(
            `
            MATCH (c:Case {case_id: $caseId})
            SET c.status = 'REJECTED',
                c.rejected_at = datetime($timestamp),
                c.rejection_reason = $reason,
                c.rejection_comment = $comment,
                c.rejection_metadata = $metadata,
                c.updated_at = datetime($timestamp)
            RETURN c
            `,
            {
              caseId: id,
              timestamp,
              reason: reason || 'No reason provided',
              comment: comment || '',
              metadata: JSON.stringify(metadata || {}),
            }
          );
          break;

        case 'request_receipt':
          result = await session.run(
            `
            MATCH (c:Case {case_id: $caseId})
            SET c.status = 'PENDING_RECEIPT',
                c.receipt_requested_at = datetime($timestamp),
                c.receipt_request_message = $comment,
                c.updated_at = datetime($timestamp)
            RETURN c
            `,
            { caseId: id, timestamp, comment: comment || '' }
          );
          break;

        default:
          return NextResponse.json(
            { error: 'Invalid action' },
            { status: 400 }
          );
      }

      if (result.records.length === 0) {
        return NextResponse.json(
          { error: 'Case not found' },
          { status: 404 }
        );
      }

      const updatedCase = result.records[0].get('c').properties;

      return NextResponse.json({
        success: true,
        action,
        caseId: id,
        status: updatedCase.status,
        timestamp,
      });
    } finally {
      await session.close();
    }
  } catch (_error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
