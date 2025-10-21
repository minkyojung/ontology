import { Card } from '@/components/ui/card';
import { GraphView } from '@/components/dashboard/graph-view';
import { getGraphData } from '@/lib/neo4j/queries';
import type { Node, Edge } from '@xyflow/react';

export default async function GraphPage() {
  let nodes: Node[] = [];
  let edges: Edge[] = [];

  try {
    const data = await getGraphData();
    nodes = data.nodes;
    edges = data.edges;
  } catch (_error) {
    // Fallback to mock data
    nodes = [
      {
        id: '1',
        type: 'default',
        data: { label: 'Kim Min-jun\n(Employee)' },
        position: { x: 250, y: 100 },
        style: { background: '#22c55e', color: 'white', border: '1px solid #16a34a' },
      },
    ];
    edges = [];
  }

  return (
    <div className="p-8 h-full">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Graph Explorer</h1>
        <p className="text-muted-foreground mt-2">
          Visualize transaction relationships and patterns
        </p>
      </div>

      <Card className="p-0 overflow-hidden" style={{ height: 'calc(100vh - 250px)' }}>
        <GraphView initialNodes={nodes} initialEdges={edges} />
      </Card>

      <div className="mt-4 grid grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-green-600" />
            <span className="text-sm">Employee</span>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-blue-600" />
            <span className="text-sm">Approved Transaction</span>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-red-600" />
            <span className="text-sm">Flagged Transaction</span>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-purple-600" />
            <span className="text-sm">Merchant</span>
          </div>
        </Card>
      </div>
    </div>
  );
}
