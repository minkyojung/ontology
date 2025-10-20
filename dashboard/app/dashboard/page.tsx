import { KPICard } from '@/components/dashboard/kpi-card';
import { TransactionChart } from '@/components/dashboard/transaction-chart';
import { AlertTriangle, Receipt, Users, TrendingUp } from 'lucide-react';
import { getStats } from '@/lib/neo4j/queries';

// Mock chart data - this would typically come from another API endpoint
const chartData = [
  { date: '2025-10-13', total: 2100, flagged: 18 },
  { date: '2025-10-14', total: 2350, flagged: 22 },
  { date: '2025-10-15', total: 2200, flagged: 15 },
  { date: '2025-10-16', total: 2450, flagged: 28 },
  { date: '2025-10-17', total: 2300, flagged: 19 },
  { date: '2025-10-18', total: 2500, flagged: 25 },
  { date: '2025-10-19', total: 2334, flagged: 20 },
];

export default async function DashboardPage() {
  let kpiData;
  try {
    kpiData = await getStats();
  } catch (error) {
    console.error('Error fetching stats:', error);
    // Fallback to mock data
    kpiData = {
      totalTransactions: 15234,
      flaggedTransactions: 127,
      totalEmployees: 450,
      fraudRate: 0.83,
    };
  }
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Overview of fraud detection system metrics
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KPICard
          title="Total Transactions"
          value={kpiData.totalTransactions.toLocaleString()}
          icon={Receipt}
          description="Last 30 days"
          trend={{ value: 12.5, isPositive: true }}
        />
        <KPICard
          title="Flagged Transactions"
          value={kpiData.flaggedTransactions}
          icon={AlertTriangle}
          description="Requires review"
          trend={{ value: -5.2, isPositive: true }}
        />
        <KPICard
          title="Active Employees"
          value={kpiData.totalEmployees}
          icon={Users}
          description="Registered in system"
        />
        <KPICard
          title="Fraud Detection Rate"
          value={`${kpiData.fraudRate}%`}
          icon={TrendingUp}
          description="Of all transactions"
          trend={{ value: 0.3, isPositive: false }}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <TransactionChart data={chartData} />

        <div className="col-span-1">
          <div className="grid gap-4">
            {/* Placeholder for additional charts or widgets */}
          </div>
        </div>
      </div>
    </div>
  );
}
