'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, TrendingUp, TrendingDown, AlertCircle, CheckCircle } from 'lucide-react';

interface PerformanceData {
  generated_at: string;
  monthly_trends: Array<{
    year: number;
    month: number;
    case_count: number;
    txn_count: number;
    detection_rate: number;
  }>;
  avg_resolution_hours: number;
  repeat_offenders: Array<{
    employee_id: string;
    name: string;
    fraud_cases: number;
  }>;
  rule_effectiveness?: {
    blacklist_rule: {
      total_cases: number;
      true_positives: number;
      false_positives: number;
      accuracy: number;
      total_amount_flagged: number;
    };
    graylist_rule: {
      total_cases: number;
      true_positives: number;
      false_positives: number;
      accuracy: number;
      total_amount_flagged: number;
    };
    recommendations: Array<{
      rule: string;
      issue: string;
      suggestion: string;
    }>;
  };
}

export default function PerformancePage() {
  const [data, setData] = useState<PerformanceData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/performance');
      if (!response.ok) throw new Error('Failed to fetch performance data');
      const result = await response.json();
      setData(result);
    } catch (_error) {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-8">
        <Card>
          <CardHeader>
            <CardTitle>No Performance Data Available</CardTitle>
            <CardDescription>Generate reports to see performance metrics</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // 트렌드 계산
  const trends = data.monthly_trends || [];
  const latestTrend = trends.length > 0 ? trends[trends.length - 1] : null;
  const previousTrend = trends.length > 1 ? trends[trends.length - 2] : null;

  const detectionRateTrend = latestTrend && previousTrend
    ? latestTrend.detection_rate - previousTrend.detection_rate
    : 0;

  // 평균 탐지율 계산
  const avgDetectionRate = trends.length > 0
    ? trends.reduce((sum, t) => sum + t.detection_rate, 0) / trends.length
    : 0;

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Performance Tracking & Optimization</h1>
        <p className="text-muted-foreground">
          Monitor system performance and get optimization recommendations
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Detection Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgDetectionRate.toFixed(2)}%</div>
            <p className="text-xs text-muted-foreground">Last 6 months</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Latest Detection Rate</CardTitle>
            {detectionRateTrend > 0 ? (
              <TrendingUp className="h-4 w-4 text-red-500" />
            ) : (
              <TrendingDown className="h-4 w-4 text-green-500" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{latestTrend?.detection_rate.toFixed(2) || 0}%</div>
            <p className={`text-xs ${detectionRateTrend > 0 ? 'text-red-500' : 'text-green-500'}`}>
              {detectionRateTrend > 0 ? '+' : ''}{detectionRateTrend.toFixed(2)}% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Resolution Time</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.avg_resolution_hours ? data.avg_resolution_hours.toFixed(1) : '0.0'}h
            </div>
            <p className="text-xs text-muted-foreground">Case creation to decision</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Repeat Offenders</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.repeat_offenders.length}</div>
            <p className="text-xs text-muted-foreground">Employees with 2+ cases</p>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Trends */}
      <Card>
        <CardHeader>
          <CardTitle>Detection Rate Trends</CardTitle>
          <CardDescription>Monthly fraud detection performance over the last 6 months</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {trends.map((trend, idx) => {
              const prevRate = idx > 0 ? trends[idx - 1].detection_rate : trend.detection_rate;
              const rateChange = trend.detection_rate - prevRate;
              const isIncreasing = rateChange > 0;

              return (
                <div key={`${trend.year}-${trend.month}`} className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <span className="font-medium w-24">
                      {trend.year}-{String(trend.month).padStart(2, '0')}
                    </span>
                    <div className="w-96 bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          trend.detection_rate > avgDetectionRate ? 'bg-red-500' : 'bg-green-500'
                        }`}
                        style={{
                          width: `${Math.min(trend.detection_rate * 10, 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="font-semibold">{trend.detection_rate.toFixed(2)}%</div>
                      <div className="text-xs text-muted-foreground">
                        {trend.case_count} / {trend.txn_count}
                      </div>
                    </div>
                    {idx > 0 && (
                      <>
                        {isIncreasing ? (
                          <TrendingUp className="h-4 w-4 text-red-500" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-green-500" />
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Rule Performance Comparison */}
      {data.rule_effectiveness && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Blacklist Rule Performance</CardTitle>
              <CardDescription>High-risk MCC detection effectiveness</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Accuracy</span>
                  <Badge
                    variant={
                      data.rule_effectiveness.blacklist_rule.accuracy >= 80
                        ? 'default'
                        : data.rule_effectiveness.blacklist_rule.accuracy >= 60
                        ? 'secondary'
                        : 'destructive'
                    }
                  >
                    {data.rule_effectiveness.blacklist_rule.accuracy}%
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">True Positives</span>
                  <span className="font-semibold text-green-600">
                    {data.rule_effectiveness.blacklist_rule.true_positives}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">False Positives</span>
                  <span className="font-semibold text-red-600">
                    {data.rule_effectiveness.blacklist_rule.false_positives}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Cases</span>
                  <span className="font-semibold">{data.rule_effectiveness.blacklist_rule.total_cases}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-green-600 h-2 rounded-full"
                    style={{
                      width: `${data.rule_effectiveness.blacklist_rule.accuracy}%`,
                    }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Graylist Rule Performance</CardTitle>
              <CardDescription>Medium-risk MCC detection effectiveness</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Accuracy</span>
                  <Badge
                    variant={
                      data.rule_effectiveness.graylist_rule.accuracy >= 80
                        ? 'default'
                        : data.rule_effectiveness.graylist_rule.accuracy >= 60
                        ? 'secondary'
                        : 'destructive'
                    }
                  >
                    {data.rule_effectiveness.graylist_rule.accuracy}%
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">True Positives</span>
                  <span className="font-semibold text-green-600">
                    {data.rule_effectiveness.graylist_rule.true_positives}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">False Positives</span>
                  <span className="font-semibold text-red-600">
                    {data.rule_effectiveness.graylist_rule.false_positives}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Cases</span>
                  <span className="font-semibold">{data.rule_effectiveness.graylist_rule.total_cases}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-green-600 h-2 rounded-full"
                    style={{
                      width: `${data.rule_effectiveness.graylist_rule.accuracy}%`,
                    }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Repeat Offenders */}
      {data.repeat_offenders.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Repeat Offenders</CardTitle>
            <CardDescription>Employees with multiple fraud cases - requires monitoring</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.repeat_offenders.map((offender) => (
                <div key={offender.employee_id} className="flex items-center justify-between border-l-4 border-red-500 pl-4 py-2">
                  <div className="space-y-1">
                    <div className="font-medium">{offender.name}</div>
                    <div className="text-sm text-muted-foreground">{offender.employee_id}</div>
                  </div>
                  <Badge variant="destructive">{offender.fraud_cases} cases</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Optimization Recommendations */}
      {data.rule_effectiveness?.recommendations && data.rule_effectiveness.recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-500" />
              Optimization Recommendations
            </CardTitle>
            <CardDescription>AI-generated suggestions to improve detection accuracy</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.rule_effectiveness.recommendations.map((rec, idx) => (
                <div key={idx} className="border-l-4 border-yellow-500 pl-4 py-3 bg-yellow-50">
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                    <div className="flex-1 space-y-2">
                      <div className="font-semibold text-yellow-900">{rec.rule}</div>
                      <div className="text-sm">
                        <span className="font-medium text-yellow-800">Issue:</span>{' '}
                        <span className="text-yellow-700">{rec.issue}</span>
                      </div>
                      <div className="text-sm">
                        <span className="font-medium text-yellow-800">Recommendation:</span>{' '}
                        <span className="text-yellow-700">{rec.suggestion}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Footer */}
      <div className="text-center text-sm text-muted-foreground">
        Last updated: {new Date(data.generated_at).toLocaleString('ko-KR')}
      </div>
    </div>
  );
}
