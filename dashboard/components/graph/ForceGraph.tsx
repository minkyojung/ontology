'use client';

import { useRef, useCallback, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { GraphData, GraphNode, GraphLink } from '@/lib/graph/types';

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
  const fgRef = useRef<any>();
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
    (node: GraphNode | null) => {
      if (node) {
        // Highlight node and its connections
        const neighbors = new Set<string>();
        const links = new Set<string>();

        data.links.forEach((link) => {
          if (link.source === node.id || (typeof link.source === 'object' && (link.source as any).id === node.id)) {
            neighbors.add(typeof link.target === 'string' ? link.target : (link.target as any).id);
            links.add(`${link.source}-${link.target}`);
          }
          if (link.target === node.id || (typeof link.target === 'object' && (link.target as any).id === node.id)) {
            neighbors.add(typeof link.source === 'string' ? link.source : (link.source as any).id);
            links.add(`${link.source}-${link.target}`);
          }
        });

        neighbors.add(node.id);
        setHighlightNodes(neighbors);
        setHighlightLinks(links);
      } else {
        setHighlightNodes(new Set());
        setHighlightLinks(new Set());
      }

      setHoverNode(node);
      onNodeHover?.(node);
    },
    [data.links, onNodeHover]
  );

  const handleNodeClick = useCallback(
    (node: GraphNode) => {
      onNodeClick?.(node);
    },
    [onNodeClick]
  );

  // Node canvas rendering
  const paintNode = useCallback(
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
    (link: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const start = link.source;
      const end = link.target;

      if (typeof start !== 'object' || typeof end !== 'object') return;

      const linkKey = `${start.id}-${end.id}`;
      const isHighlighted = highlightLinks.size === 0 || highlightLinks.has(linkKey);

      ctx.globalAlpha = isHighlighted ? 1 : 0.1;
      ctx.strokeStyle = link.color || '#999';
      ctx.lineWidth = (link.width || 1) / globalScale;

      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(end.x, end.y);
      ctx.stroke();

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
