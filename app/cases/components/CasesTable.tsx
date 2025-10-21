'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface Case {
  id: string;
  caseId: string;
  caseType?: string;
  severity: string;
  status: string;
  description: string;
  assignedTo: string;
  createdAt: string;
  employee: {
    name: string;
    department: string;
  };
  transaction: {
    transactionId: string;
    amount: number;
    transactionDate: string;
    merchantName: string;
    mccCode: string;
    mccRiskGroup: string;
  };
  taxRules: Array<{
    ruleId: string;
    name: string;
    legalReference: string;
  }>;
}

interface CasesTableProps {
  cases: Case[];
}

function getSeverityBadge(severity: string) {
  switch (severity.toUpperCase()) {
    case 'CRITICAL':
      return <Badge variant="destructive" className="text-xs px-2 h-5">Critical</Badge>;
    case 'HIGH':
      return <Badge variant="outline" className="text-xs px-2 h-5 border-orange-400 text-orange-600">High</Badge>;
    case 'MEDIUM':
      return <Badge variant="secondary" className="text-xs px-2 h-5">Medium</Badge>;
    case 'LOW':
      return <Badge variant="outline" className="text-xs px-2 h-5">Low</Badge>;
    default:
      return <Badge variant="secondary" className="text-xs px-2 h-5">{severity}</Badge>;
  }
}

export function CasesTable({ cases }: CasesTableProps) {
  const [severityFilter, setSeverityFilter] = useState<string[]>([]);
  const [caseTypeFilter, setCaseTypeFilter] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string[]>([]);

  // Get unique values for filters
  const uniqueSeverities = useMemo(() => {
    return Array.from(new Set(cases.map(c => c.severity))).sort();
  }, [cases]);

  const uniqueCaseTypes = useMemo(() => {
    return Array.from(new Set(cases.map(c => c.caseType).filter(Boolean))).sort();
  }, [cases]);

  const uniqueStatuses = useMemo(() => {
    return Array.from(new Set(cases.map(c => c.status))).sort();
  }, [cases]);

  // Calculate priority score for smart sorting
  const calculatePriorityScore = (c: Case): number => {
    let score = 0;

    // Severity scoring
    switch (c.severity?.toUpperCase()) {
      case 'CRITICAL': score += 100; break;
      case 'HIGH': score += 50; break;
      case 'MEDIUM': score += 20; break;
      case 'LOW': score += 5; break;
    }

    // Case type urgency
    switch (c.caseType) {
      case 'SPLIT_PAYMENT': score += 30; break; // High urgency
      case 'BLACKLIST_MCC': score += 25; break;
      case 'OFF_HOURS': score += 15; break;
      case 'WEEKEND_TRANSACTION': score += 10; break;
      case 'GRAYLIST_MCC': score += 5; break;
    }

    // Amount-based urgency (high amount = higher priority)
    if (c.transaction.amount >= 1000000) score += 20;
    else if (c.transaction.amount >= 500000) score += 10;

    // Status urgency (OPEN should be prioritized)
    if (c.status === 'OPEN') score += 15;

    return score;
  };

  // Filter and sort cases by priority
  const filteredCases = useMemo(() => {
    const filtered = cases.filter(c => {
      const severityMatch = severityFilter.length === 0 || severityFilter.includes(c.severity);
      const caseTypeMatch = caseTypeFilter.length === 0 || (c.caseType && caseTypeFilter.includes(c.caseType));
      const statusMatch = statusFilter.length === 0 || statusFilter.includes(c.status);

      return severityMatch && caseTypeMatch && statusMatch;
    });

    // Sort by priority score (highest first)
    return filtered.sort((a, b) => calculatePriorityScore(b) - calculatePriorityScore(a));
  }, [cases, severityFilter, caseTypeFilter, statusFilter]);

  // Toggle filter
  const toggleFilter = (filterType: 'severity' | 'caseType' | 'status', value: string) => {
    if (filterType === 'severity') {
      setSeverityFilter(prev =>
        prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]
      );
    } else if (filterType === 'caseType') {
      setCaseTypeFilter(prev =>
        prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]
      );
    } else if (filterType === 'status') {
      setStatusFilter(prev =>
        prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]
      );
    }
  };

  // Clear all filters
  const clearFilters = () => {
    setSeverityFilter([]);
    setCaseTypeFilter([]);
    setStatusFilter([]);
  };

  const hasActiveFilters = severityFilter.length > 0 || caseTypeFilter.length > 0 || statusFilter.length > 0;

  // Get priority indicator (simplified, no badges)
  const getPriorityIndicator = (score: number) => {
    if (score >= 150) {
      return (
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
          <span className="text-xs font-medium text-red-600">Urgent</span>
        </div>
      );
    } else if (score >= 100) {
      return (
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />
          <span className="text-xs font-medium text-orange-600">High</span>
        </div>
      );
    } else if (score >= 50) {
      return (
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
          <span className="text-xs font-medium text-yellow-600">Medium</span>
        </div>
      );
    } else {
      return (
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
          <span className="text-xs font-medium text-green-600">Low</span>
        </div>
      );
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">Priority Queue</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Cases sorted by urgency • Auto-ranked
            </p>
          </div>
          <div className="text-xs text-muted-foreground">
            {filteredCases.length} of {cases.length}
          </div>
        </div>

        {/* Filters */}
        <div className="space-y-2 pt-3">
          {/* Severity Filter */}
          <div>
            <div className="text-xs font-medium mb-1.5">Severity</div>
            <div className="flex flex-wrap gap-1.5">
              {uniqueSeverities.map(severity => {
                const isActive = severityFilter.includes(severity);
                const count = cases.filter(c => c.severity === severity).length;

                return (
                  <Button
                    key={severity}
                    variant={isActive ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => toggleFilter('severity', severity)}
                    className="h-7 text-xs"
                  >
                    {severity} ({count})
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Case Type Filter */}
          {uniqueCaseTypes.length > 0 && (
            <div>
              <div className="text-xs font-medium mb-1.5">Case Type</div>
              <div className="flex flex-wrap gap-1.5">
                {uniqueCaseTypes.map(caseType => {
                  if (!caseType) return null;
                  const isActive = caseTypeFilter.includes(caseType);
                  const count = cases.filter(c => c.caseType === caseType).length;

                  return (
                    <Button
                      key={caseType}
                      variant={isActive ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => toggleFilter('caseType', caseType)}
                      className="h-7 text-xs"
                    >
                      {caseType.replace(/_/g, ' ')} ({count})
                    </Button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Status Filter */}
          <div>
            <div className="text-xs font-medium mb-1.5">Status</div>
            <div className="flex flex-wrap gap-1.5">
              {uniqueStatuses.map(status => {
                const isActive = statusFilter.includes(status);
                const count = cases.filter(c => c.status === status).length;

                return (
                  <Button
                    key={status}
                    variant={isActive ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => toggleFilter('status', status)}
                    className="h-7 text-xs"
                  >
                    {status} ({count})
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <div>
              <Button variant="ghost" size="sm" onClick={clearFilters} className="h-7 text-xs">
                Clear All
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow className="h-9">
              <TableHead className="text-xs w-12">#</TableHead>
              <TableHead className="text-xs">Priority</TableHead>
              <TableHead className="text-xs">Case ID</TableHead>
              <TableHead className="text-xs">Pattern</TableHead>
              <TableHead className="text-xs">Severity</TableHead>
              <TableHead className="text-xs">Employee</TableHead>
              <TableHead className="text-xs">Merchant / MCC</TableHead>
              <TableHead className="text-xs text-right">Amount</TableHead>
              <TableHead className="text-xs">Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCases.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-xs text-muted-foreground h-12">
                  {hasActiveFilters ? 'No cases match the selected filters' : 'No cases found'}
                </TableCell>
              </TableRow>
            ) : (
              filteredCases.map((c, index) => {
                const priorityScore = calculatePriorityScore(c);
                return (
                  <TableRow key={c.id} className="cursor-pointer hover:bg-muted/50 h-12">
                    <TableCell className="py-2">
                      <span className="text-xs text-muted-foreground font-mono">
                        {index + 1}
                      </span>
                    </TableCell>
                    <TableCell className="py-2">
                      {getPriorityIndicator(priorityScore)}
                    </TableCell>
                    <TableCell className="py-2">
                      <Link
                        href={`/cases/${c.caseId}`}
                        className="font-mono text-xs hover:underline"
                      >
                        {c.caseId}
                      </Link>
                    </TableCell>
                    <TableCell className="py-2">
                      {c.caseType && (
                        <span className="text-xs text-muted-foreground">
                          {c.caseType.replace(/_/g, ' ')}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="py-2">{getSeverityBadge(c.severity)}</TableCell>
                    <TableCell className="py-2">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs font-medium">{c.employee.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {c.employee.department}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="py-2">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs font-medium truncate max-w-[200px]">
                          {c.transaction.merchantName || 'N/A'}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-xs text-muted-foreground">
                            {c.transaction.mccCode || 'N/A'}
                          </span>
                          {c.transaction.mccRiskGroup && c.transaction.mccRiskGroup !== 'N/A' && (
                            <span className={`text-[10px] font-medium ${
                              c.transaction.mccRiskGroup === 'BLACK'
                                ? 'text-red-600'
                                : c.transaction.mccRiskGroup === 'GRAY'
                                ? 'text-yellow-600'
                                : 'text-muted-foreground'
                            }`}>
                              {c.transaction.mccRiskGroup}
                            </span>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-2 text-right text-sm font-medium">
                      ₩{c.transaction.amount.toLocaleString()}
                    </TableCell>
                    <TableCell className="py-2">
                      <span className="text-xs text-muted-foreground">
                        {new Date(c.createdAt).toLocaleDateString('ko-KR')}
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
