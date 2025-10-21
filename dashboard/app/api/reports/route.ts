import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'consolidated';

    const reportsDir = path.join(process.cwd(), '..', 'reports');

    // 리포트 타입에 따라 파일 선택
    let reportFile: string;

    switch (type) {
      case 'monthly':
        // 가장 최근 월별 리포트 찾기
        const monthlyFiles = fs.readdirSync(reportsDir).filter(f => f.startsWith('monthly_'));
        if (monthlyFiles.length === 0) {
          return NextResponse.json({ error: 'No monthly reports found' }, { status: 404 });
        }
        monthlyFiles.sort().reverse();
        reportFile = path.join(reportsDir, monthlyFiles[0]);
        break;

      case 'quarterly':
        // 가장 최근 분기별 리포트 찾기
        const quarterlyFiles = fs.readdirSync(reportsDir).filter(f => f.startsWith('quarterly_'));
        if (quarterlyFiles.length === 0) {
          return NextResponse.json({ error: 'No quarterly reports found' }, { status: 404 });
        }
        quarterlyFiles.sort().reverse();
        reportFile = path.join(reportsDir, quarterlyFiles[0]);
        break;

      case 'rules':
        reportFile = path.join(reportsDir, 'rule_effectiveness.json');
        break;

      case 'performance':
        reportFile = path.join(reportsDir, 'performance_trends.json');
        break;

      case 'consolidated':
      default:
        reportFile = path.join(reportsDir, 'consolidated_report.json');
        break;
    }

    // 파일 존재 확인
    if (!fs.existsSync(reportFile)) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    // 파일 읽기
    const reportData = fs.readFileSync(reportFile, 'utf-8');
    const report = JSON.parse(reportData);

    return NextResponse.json(report);
  } catch (_error) {
    return NextResponse.json(
      { error: 'Failed to fetch reports' },
      { status: 500 }
    );
  }
}

// 리포트 재생성 API
export async function POST() {
  try {
    // 리포트 생성 스크립트 실행
    const scriptPath = path.join(process.cwd(), '..', 'scripts', '08_generate_reports.py');
    const { stdout, stderr: _stderr } = await execAsync(`python3 ${scriptPath}`);

    return NextResponse.json({
      success: true,
      message: 'Reports regenerated successfully',
      output: stdout
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to regenerate reports', details: errorMessage },
      { status: 500 }
    );
  }
}
