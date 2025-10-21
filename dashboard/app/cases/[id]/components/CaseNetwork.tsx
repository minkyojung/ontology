'use client';

import { useEffect, useState } from 'react';
import { ForceGraph } from '@/components/graph/ForceGraph';
import { GraphData, GraphNode } from '@/lib/graph/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

interface CaseNetworkProps {
  caseId: string;
}

export function CaseNetwork({ caseId }: CaseNetworkProps) {
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchGraphData() {
      try {
        setLoading(true);
        const response = await fetch(`/api/graph/case/${caseId}`);

        if (!response.ok) {
          throw new Error('Failed to fetch graph data');
        }

        const data = await response.json();
        setGraphData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    fetchGraphData();
  }, [caseId]);

  const handleNodeClick = (node: GraphNode) => {
    setSelectedNode(node);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-[600px] w-full" />
      </div>
    );
  }

  if (error || !graphData) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">
            {error || 'No graph data available'}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-[1fr,320px] gap-4">
      {/* Graph Visualization */}
      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Relationship Network</CardTitle>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  {graphData.stats.nodeCount} Nodes
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {graphData.stats.linkCount} Links
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ForceGraph
              data={graphData}
              onNodeClick={handleNodeClick}
              width={800}
              height={600}
            />
          </CardContent>
        </Card>

        {/* Legend */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Legend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-violet-500"></div>
                <span>Case</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-slate-500"></div>
                <span>Employee</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                <span>Transaction</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                <span>Merchant</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-px bg-slate-400"></div>
                <span className="text-muted-foreground">Transaction Link</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-px bg-zinc-400"></div>
                <span className="text-muted-foreground">Merchant Link</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Inspector Panel */}
      <div>
        <Card className="sticky top-4">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              {selectedNode ? 'Node Details' : 'Inspector'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedNode ? (
              <div className="space-y-3">
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Type</div>
                  <Badge variant="outline" className="text-xs capitalize">
                    {selectedNode.type}
                  </Badge>
                </div>

                <div>
                  <div className="text-xs text-muted-foreground mb-1">Label</div>
                  <div className="font-medium text-sm">{selectedNode.label}</div>
                </div>

                {selectedNode.risk && (
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Risk Level</div>
                    <Badge
                      variant={selectedNode.risk === 'critical' ? 'destructive' : 'outline'}
                      className="text-xs capitalize"
                    >
                      {selectedNode.risk}
                    </Badge>
                  </div>
                )}

                {selectedNode.amount && (
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Amount</div>
                    <div className="font-semibold text-sm">
                      ₩{selectedNode.amount.toLocaleString()}
                    </div>
                  </div>
                )}

                {selectedNode.department && (
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Department</div>
                    <div className="text-sm">{selectedNode.department}</div>
                  </div>
                )}

                {selectedNode.metadata && Object.keys(selectedNode.metadata).length > 0 && (
                  <div>
                    <div className="text-xs text-muted-foreground mb-2">Additional Info</div>
                    <div className="space-y-1.5">
                      {Object.entries(selectedNode.metadata).map(([key, value]) => {
                        if (!value) return null;
                        return (
                          <div key={key} className="text-xs">
                            <span className="text-muted-foreground">{key}: </span>
                            <span>{String(value)}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-xs text-muted-foreground text-center py-8">
                Click on a node to see details
              </div>
            )}
          </CardContent>
        </Card>

        {/* Statistics */}
        <Card className="mt-4">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Network Stats</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Nodes</span>
                <span className="font-medium">{graphData.stats.nodeCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Links</span>
                <span className="font-medium">{graphData.stats.linkCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Clusters</span>
                <span className="font-medium">{graphData.stats.clusterCount}</span>
              </div>

              <div className="pt-2 border-t">
                <div className="text-muted-foreground mb-2">Risk Distribution</div>
                <div className="space-y-1.5">
                  {graphData.stats.riskDistribution.critical > 0 && (
                    <div className="flex justify-between">
                      <Badge variant="destructive" className="text-xs">Critical</Badge>
                      <span>{graphData.stats.riskDistribution.critical}</span>
                    </div>
                  )}
                  {graphData.stats.riskDistribution.high > 0 && (
                    <div className="flex justify-between">
                      <Badge variant="outline" className="text-xs">High</Badge>
                      <span>{graphData.stats.riskDistribution.high}</span>
                    </div>
                  )}
                  {graphData.stats.riskDistribution.medium > 0 && (
                    <div className="flex justify-between">
                      <Badge variant="secondary" className="text-xs">Medium</Badge>
                      <span>{graphData.stats.riskDistribution.medium}</span>
                    </div>
                  )}
                  {graphData.stats.riskDistribution.low > 0 && (
                    <div className="flex justify-between">
                      <Badge variant="outline" className="text-xs">Low</Badge>
                      <span>{graphData.stats.riskDistribution.low}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
