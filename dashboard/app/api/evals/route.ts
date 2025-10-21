import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export async function GET() {
  try {
    // Read the metrics.json file
    const filePath = path.join(process.cwd(), '..', 'evals', 'metrics.json');
    const fileContents = await fs.readFile(filePath, 'utf8');
    const metrics = JSON.parse(fileContents);

    return NextResponse.json(metrics);
  } catch (_error) {
    // Return mock data if file doesn't exist
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      riskDistribution: {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
        total: 0
      },
      mccImpact: [],
      precisionRecall: {
        truePositives: 0,
        falsePositives: 0,
        trueNegatives: 0,
        falseNegatives: 0,
        precision: 0,
        recall: 0,
        f1Score: 0,
        accuracy: 0
      },
      recoveryPotential: {
        criticalAmount: 0,
        highAmount: 0,
        mediumAmount: 0,
        totalFlagged: 0,
        totalAmount: 0,
        potentialRecovery: 0
      },
      caseStats: {
        totalCases: 0,
        openCases: 0,
        criticalCases: 0,
        highCases: 0
      },
      employeeRiskStats: {
        totalEmployees: 0,
        highRiskEmployees: 0,
        mediumRiskEmployees: 0,
        lowRiskEmployees: 0
      }
    });
  }
}
