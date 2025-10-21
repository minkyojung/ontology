import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const reportsDir = path.join(process.cwd(), '..', 'reports');
    const performanceFile = path.join(reportsDir, 'performance_trends.json');
    const ruleEffectivenessFile = path.join(reportsDir, 'rule_effectiveness.json');

    // 성과 트렌드 파일 존재 확인
    if (!fs.existsSync(performanceFile)) {
      return NextResponse.json({ error: 'Performance trends not found' }, { status: 404 });
    }

    // 파일 읽기
    const performanceData = fs.readFileSync(performanceFile, 'utf-8');
    const performance = JSON.parse(performanceData);

    // 룰 효과성 데이터도 함께 가져오기
    let ruleEffectiveness = null;
    if (fs.existsSync(ruleEffectivenessFile)) {
      const ruleData = fs.readFileSync(ruleEffectivenessFile, 'utf-8');
      ruleEffectiveness = JSON.parse(ruleData);
    }

    // 통합 데이터 반환
    return NextResponse.json({
      ...performance,
      rule_effectiveness: ruleEffectiveness,
    });
  } catch (_error) {
    return NextResponse.json(
      { error: 'Failed to fetch performance data' },
      { status: 500 }
    );
  }
}
