import { NextRequest, NextResponse } from 'next/server';
import { getCaseNetwork } from '@/lib/graph/queries';
import { transformCaseNetwork } from '@/lib/graph/transforms';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Fetch network data from Neo4j
    const networkData = await getCaseNetwork(id);

    if (!networkData) {
      return NextResponse.json(
        { error: 'Case not found' },
        { status: 404 }
      );
    }

    // Transform to GraphData format
    const graphData = transformCaseNetwork(networkData);

    return NextResponse.json(graphData);
  } catch (_error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
