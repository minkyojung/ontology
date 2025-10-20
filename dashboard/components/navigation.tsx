'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Receipt,
  Users,
  Network,
  BarChart3,
  AlertCircle
} from 'lucide-react';

const navItems = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    title: 'Transactions',
    href: '/transactions',
    icon: Receipt,
  },
  {
    title: 'Cases',
    href: '/cases',
    icon: AlertCircle,
  },
  {
    title: 'Employees',
    href: '/employees',
    icon: Users,
  },
  {
    title: 'Graph Explorer',
    href: '/graph',
    icon: Network,
  },
  {
    title: 'Evaluation Metrics',
    href: '/evals',
    icon: BarChart3,
  },
];

export function Navigation() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-2 p-4">
      <div className="mb-4">
        <h1 className="text-xl font-bold">Fraud Detection</h1>
        <p className="text-sm text-muted-foreground">Monitoring Dashboard</p>
      </div>
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
              isActive
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            <Icon className="h-4 w-4" />
            {item.title}
          </Link>
        );
      })}
    </nav>
  );
}
