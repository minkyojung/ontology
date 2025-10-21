'use client';

import { useRef, useCallback, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { GraphData, GraphNode } from '@/lib/graph/types';

// Dynamically import ForceGraph2D to avoid SSR issues
const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), {
  ssr: false,
});

interface ForceGraphProps {
  data: GraphData;
  onNodeClick?: (node: GraphNode) => void;
  onNodeHover?: (node: GraphNode | null) => void;
  width?: number;
  height?: number;
}

export function ForceGraph({
  data,
  onNodeClick,
  onNodeHover,
  width = 800,
  height = 600,
}: ForceGraphProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fgRef = useRef<any>(null);
  const [highlightNodes, setHighlightNodes] = useState(new Set());
  const [highlightLinks, setHighlightLinks] = useState(new Set());
  const [hoverNode, setHoverNode] = useState<GraphNode | null>(null);

  // Auto-fit view on data change
  useEffect(() => {
    if (fgRef.current && data.nodes.length > 0) {
      fgRef.current.zoomToFit(400, 50);
    }
  }, [data]);

  const handleNodeHover = useCallback(
    (node: unknown) => {
      const graphNode = node as GraphNode | null;
      if (graphNode) {
        // Highlight node and its connections
        const neighbors = new Set<string>();
        const links = new Set<string>();

        data.links.forEach((link) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          if (link.source === graphNode.id || (typeof link.source === 'object' && (link.source as any).id === graphNode.id)) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            neighbors.add(typeof link.target === 'string' ? link.target : (link.target as any).id);
            links.add(`${link.source}-${link.target}`);
          }
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          if (link.target === graphNode.id || (typeof link.target === 'object' && (link.target as any).id === graphNode.id)) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            neighbors.add(typeof link.source === 'string' ? link.source : (link.source as any).id);
            links.add(`${link.source}-${link.target}`);
          }
        });

        neighbors.add(graphNode.id);
        setHighlightNodes(neighbors);
        setHighlightLinks(links);
      } else {
        setHighlightNodes(new Set());
        setHighlightLinks(new Set());
      }

      setHoverNode(graphNode);
      onNodeHover?.(graphNode);
    },
    [data.links, onNodeHover]
  );

  const handleNodeClick = useCallback(
    (node: unknown) => {
      const graphNode = node as GraphNode;
      onNodeClick?.(graphNode);
    },
    [onNodeClick]
  );

  // Node canvas rendering
  const paintNode = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const label = node.label;
      const fontSize = 12 / globalScale;
      ctx.font = `${fontSize}px Sans-Serif`;

      // Highlight effect
      const isHighlighted = highlightNodes.size === 0 || highlightNodes.has(node.id);
      const nodeSize = node.size || 5;

      // Draw node circle
      ctx.beginPath();
      ctx.arc(node.x, node.y, nodeSize, 0, 2 * Math.PI);
      ctx.fillStyle = node.color || '#999';
      ctx.globalAlpha = isHighlighted ? 1 : 0.3;
      ctx.fill();

      // Draw border for hover
      if (hoverNode?.id === node.id) {
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2 / globalScale;
        ctx.stroke();
      }

      // Draw label
      if (isHighlighted && globalScale > 0.8) {
        ctx.globalAlpha = 1;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#000';
        ctx.fillText(label, node.x, node.y + nodeSize + fontSize);
      }

      ctx.globalAlpha = 1;
    },
    [highlightNodes, hoverNode]
  );

  // Link canvas rendering
  const paintLink = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (link: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const start = link.source;
      const end = link.target;

      if (typeof start !== 'object' || typeof end !== 'object') return;

      const linkKey = `${start.id}-${end.id}`;
      const isHighlighted = highlightLinks.size === 0 || highlightLinks.has(linkKey);

      // Draw link line
      ctx.globalAlpha = isHighlighted ? 1 : 0.1;
      ctx.strokeStyle = link.color || '#999';
      ctx.lineWidth = (link.width || 1) / globalScale;

      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(end.x, end.y);
      ctx.stroke();

      // Draw link label (relationship type)
      if (isHighlighted && globalScale > 1.2 && link.type) {
        const midX = (start.x + end.x) / 2;
        const midY = (start.y + end.y) / 2;

        // Simplified label (remove underscores, capitalize)
        const label = link.type
          .replace(/_/g, ' ')
          .toLowerCase()
          .split(' ')
          .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' ');

        const fontSize = 10 / globalScale;
        ctx.font = `${fontSize}px Sans-Serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Background for readability
        const textWidth = ctx.measureText(label).width;
        const padding = 2 / globalScale;

        ctx.globalAlpha = 0.8;
        ctx.fillStyle = '#fff';
        ctx.fillRect(
          midX - textWidth / 2 - padding,
          midY - fontSize / 2 - padding,
          textWidth + padding * 2,
          fontSize + padding * 2
        );

        // Label text
        ctx.globalAlpha = 1;
        ctx.fillStyle = link.color || '#666';
        ctx.fillText(label, midX, midY);
      }

      ctx.globalAlpha = 1;
    },
    [highlightLinks]
  );

  return (
    <div className="relative bg-muted/10 rounded-lg border">
      <ForceGraph2D
        ref={fgRef}
        graphData={data}
        width={width}
        height={height}
        nodeLabel="label"
        nodeCanvasObject={paintNode}
        linkCanvasObject={paintLink}
        onNodeHover={handleNodeHover}
        onNodeClick={handleNodeClick}
        linkDirectionalParticles={2}
        linkDirectionalParticleWidth={2}
        linkDirectionalParticleSpeed={0.005}
        cooldownTicks={100}
        d3AlphaDecay={0.02}
        d3VelocityDecay={0.3}
        enableNodeDrag={true}
        enableZoomInteraction={true}
        enablePanInteraction={true}
      />
    </div>
  );
}
