import {
  GraphData,
  GraphNode,
  GraphLink,
  RiskLevel,
  NODE_COLORS,
  LINK_COLORS,
} from './types';

/**
 * Convert Neo4j Integer/BigInt to number
 */
function toNumber(value: any): number {
  if (typeof value === 'object' && value !== null && 'toNumber' in value) {
    return value.toNumber();
  }
  return Number(value);
}

/**
 * Determine risk level based on severity or amount
 */
function getRiskLevel(severity?: string, amount?: number): RiskLevel {
  if (severity) {
    switch (severity.toUpperCase()) {
      case 'CRITICAL':
        return 'critical';
      case 'HIGH':
        return 'high';
      case 'MEDIUM':
        return 'medium';
      default:
        return 'low';
    }
  }

  if (amount) {
    if (amount >= 1000000) return 'critical';
    if (amount >= 500000) return 'high';
    if (amount >= 100000) return 'medium';
    return 'low';
  }

  return 'low';
}

/**
 * Calculate node size based on type and properties
 */
function getNodeSize(type: string, amount?: number): number {
  const baseSize: Record<string, number> = {
    case: 20,
    employee: 15,
    transaction: 10,
    merchant: 12,
  };

  let size = baseSize[type] || 10;

  // Scale transaction nodes by amount
  if (type === 'transaction' && amount) {
    const scale = Math.log10(amount / 10000 + 1);
    size = Math.max(5, Math.min(25, size * scale));
  }

  return size;
}

/**
 * Transform Case Network data from Neo4j to GraphData
 */
export function transformCaseNetwork(data: any): GraphData {
  const nodes: GraphNode[] = [];
  const links: GraphLink[] = [];
  const nodeIds = new Set<string>();

  if (!data) {
    return {
      nodes: [],
      links: [],
      stats: {
        nodeCount: 0,
        linkCount: 0,
        clusterCount: 0,
        riskDistribution: { critical: 0, high: 0, medium: 0, low: 0 },
      },
    };
  }

  const { case: caseNode, transaction, employee, merchant, mcc, relatedTransactions } = data;

  // Add Case node
  if (caseNode) {
    const caseId = caseNode.properties.case_id;
    const severity = caseNode.properties.severity;
    const risk = getRiskLevel(severity);

    nodes.push({
      id: caseId,
      label: caseId,
      type: 'case',
      color: NODE_COLORS.case.default,
      size: 20,
      risk,
      metadata: {
        caseType: caseNode.properties.case_type,
        status: caseNode.properties.status,
        description: caseNode.properties.description,
      },
    });
    nodeIds.add(caseId);
  }

  // Add main Transaction node
  if (transaction) {
    const txId = transaction.properties.id;
    const amount = toNumber(transaction.properties.amount);
    const risk = getRiskLevel(undefined, amount);

    nodes.push({
      id: txId,
      label: `₩${amount.toLocaleString()}`,
      type: 'transaction',
      color: NODE_COLORS.transaction[risk],
      size: getNodeSize('transaction', amount),
      risk,
      amount,
      metadata: {
        transactedAt: transaction.properties.transacted_at?.toString(),
        category: transaction.properties.category,
      },
    });
    nodeIds.add(txId);

    // Link: Case → Transaction
    if (caseNode) {
      links.push({
        source: caseNode.properties.case_id,
        target: txId,
        type: 'INVOLVES_TRANSACTION',
        color: LINK_COLORS.INVOLVES_TRANSACTION,
        width: 2,
        metadata: {},
      });
    }
  }

  // Add Employee node
  if (employee) {
    const empId = employee.properties.id;
    const dept = employee.properties.department;

    nodes.push({
      id: empId,
      label: employee.properties.name,
      type: 'employee',
      color: NODE_COLORS.employee.medium,
      size: 15,
      department: dept,
      metadata: {
        email: employee.properties.email,
        jobTitle: employee.properties.job_title,
      },
    });
    nodeIds.add(empId);

    // Link: Employee → Transaction
    if (transaction) {
      links.push({
        source: empId,
        target: transaction.properties.id,
        type: 'MADE_TRANSACTION',
        color: LINK_COLORS.MADE_TRANSACTION,
        width: 2,
        metadata: {},
      });
    }
  }

  // Add Merchant node
  if (merchant) {
    const merchId = merchant.properties.name;

    nodes.push({
      id: merchId,
      label: merchId,
      type: 'merchant',
      color: NODE_COLORS.merchant.medium,
      size: 12,
      metadata: {
        address: merchant.properties.address,
        city: merchant.properties.city,
        country: merchant.properties.country,
        mccCode: mcc?.properties?.code,
        mccDescription: mcc?.properties?.description,
      },
    });
    nodeIds.add(merchId);

    // Link: Transaction → Merchant
    if (transaction) {
      links.push({
        source: transaction.properties.id,
        target: merchId,
        type: 'AT_MERCHANT',
        color: LINK_COLORS.AT_MERCHANT,
        width: 2,
        metadata: {},
      });
    }
  }

  // Add related transactions (30-day window)
  if (relatedTransactions && employee) {
    relatedTransactions
      .filter((rt: any) => rt.transaction)
      .forEach((rt: any, idx: number) => {
        const relTx = rt.transaction;
        const relMerch = rt.merchant;
        const relTxId = relTx.properties.id;

        // Add related transaction node
        if (!nodeIds.has(relTxId)) {
          const amount = toNumber(relTx.properties.amount);
          const risk = getRiskLevel(undefined, amount);

          nodes.push({
            id: relTxId,
            label: `₩${amount.toLocaleString()}`,
            type: 'transaction',
            color: NODE_COLORS.transaction[risk],
            size: getNodeSize('transaction', amount),
            risk,
            amount,
            metadata: {
              transactedAt: relTx.properties.transacted_at?.toString(),
              category: relTx.properties.category,
            },
          });
          nodeIds.add(relTxId);

          // Link: Employee → Related Transaction
          links.push({
            source: employee.properties.id,
            target: relTxId,
            type: 'MADE_TRANSACTION',
            color: LINK_COLORS.MADE_TRANSACTION,
            width: 1,
            metadata: {},
          });
        }

        // Add related merchant node
        if (relMerch && !nodeIds.has(relMerch.properties.name)) {
          const merchId = relMerch.properties.name;

          nodes.push({
            id: merchId,
            label: merchId,
            type: 'merchant',
            color: NODE_COLORS.merchant.low,
            size: 10,
            metadata: {
              address: relMerch.properties.address,
              city: relMerch.properties.city,
            },
          });
          nodeIds.add(merchId);

          // Link: Related Transaction → Related Merchant
          links.push({
            source: relTxId,
            target: merchId,
            type: 'AT_MERCHANT',
            color: LINK_COLORS.AT_MERCHANT,
            width: 1,
            metadata: {},
          });
        } else if (relMerch) {
          // Link to existing merchant
          links.push({
            source: relTxId,
            target: relMerch.properties.name,
            type: 'AT_MERCHANT',
            color: LINK_COLORS.AT_MERCHANT,
            width: 1,
            metadata: {},
          });
        }
      });
  }

  // Calculate statistics
  const riskDistribution = {
    critical: nodes.filter((n) => n.risk === 'critical').length,
    high: nodes.filter((n) => n.risk === 'high').length,
    medium: nodes.filter((n) => n.risk === 'medium').length,
    low: nodes.filter((n) => n.risk === 'low').length,
  };

  return {
    nodes,
    links,
    stats: {
      nodeCount: nodes.length,
      linkCount: links.length,
      clusterCount: 1, // TODO: Implement clustering algorithm
      riskDistribution,
    },
  };
}
