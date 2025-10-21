// Graph visualization types

export type NodeType = 'employee' | 'transaction' | 'merchant' | 'case';
export type LinkType =
  | 'MADE_TRANSACTION'
  | 'AT_MERCHANT'
  | 'INVOLVES_TRANSACTION'
  | 'SIMILAR_PATTERN'
  | 'SAME_DEPARTMENT';

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface GraphNode {
  id: string;
  label: string;
  type: NodeType;

  // Visual properties
  color?: string;
  size?: number;

  // Business properties
  risk?: RiskLevel;
  amount?: number;
  department?: string;

  // Metadata
  metadata: Record<string, any>;
}

export interface GraphLink {
  source: string;
  target: string;
  type: LinkType;
  label?: string;

  // Visual properties
  color?: string;
  width?: number;

  // Business properties
  weight?: number;
  timestamp?: string;

  // Metadata
  metadata: Record<string, any>;
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];

  // Statistics
  stats: {
    nodeCount: number;
    linkCount: number;
    clusterCount: number;
    riskDistribution: {
      critical: number;
      high: number;
      medium: number;
      low: number;
    };
  };
}

// Color scheme for consistency
export const NODE_COLORS = {
  employee: {
    low: '#64748b',      // slate-500
    medium: '#71717a',   // zinc-500
    high: '#525252',     // neutral-600
    critical: '#ef4444', // red-500
  },
  transaction: {
    low: '#3b82f6',      // blue-500
    medium: '#2563eb',   // blue-600
    high: '#1d4ed8',     // blue-700
    critical: '#ef4444', // red-500
  },
  merchant: {
    low: '#10b981',      // emerald-500
    medium: '#059669',   // emerald-600
    high: '#047857',     // emerald-700
    critical: '#ef4444', // red-500
  },
  case: {
    default: '#8b5cf6',  // violet-500
  },
};

export const LINK_COLORS = {
  MADE_TRANSACTION: '#94a3b8',    // slate-400
  AT_MERCHANT: '#a1a1aa',         // zinc-400
  INVOLVES_TRANSACTION: '#9ca3af', // gray-400
  SIMILAR_PATTERN: '#f59e0b',     // amber-500
  SAME_DEPARTMENT: '#06b6d4',     // cyan-500
};
