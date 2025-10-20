#!/usr/bin/env python3
"""
프로젝트 통계 생성 스크립트

Git 커밋 히스토리를 분석하여 프로젝트 통계를 JSON 형식으로 생성합니다.
"""

import git
import json
import os
from datetime import datetime, timedelta
from collections import defaultdict


def generate_stats():
    """Git 리포지토리를 분석하여 통계 생성"""
    try:
        repo = git.Repo('.')
    except git.InvalidGitRepositoryError:
        print("Error: Not a git repository")
        return

    stats = {
        'total_commits': 0,
        'commits_by_type': defaultdict(int),
        'commits_by_scope': defaultdict(int),
        'lines_added': 0,
        'lines_deleted': 0,
        'files_changed': set(),
        'contributors': set(),
        'timeline': [],
        'recent_commits': []
    }

    # 최근 30일 커밋 분석
    since = datetime.now() - timedelta(days=30)

    for commit in repo.iter_commits(since=since.isoformat()):
        stats['total_commits'] += 1
        stats['contributors'].add(commit.author.name)

        # Conventional Commit 파싱
        msg = commit.message.split('\n')[0]
        if '(' in msg and ')' in msg and ':' in msg:
            type_part = msg.split('(')[0]
            scope_part = msg.split('(')[1].split(')')[0]
            stats['commits_by_type'][type_part] += 1
            stats['commits_by_scope'][scope_part] += 1
        elif ':' in msg:
            type_part = msg.split(':')[0]
            stats['commits_by_type'][type_part] += 1

        # 최근 커밋 저장 (최대 10개)
        if len(stats['recent_commits']) < 10:
            stats['recent_commits'].append({
                'hash': commit.hexsha[:7],
                'message': msg,
                'author': commit.author.name,
                'date': commit.committed_datetime.isoformat()
            })

        # 변경 통계
        if commit.parents:
            try:
                diff = commit.parents[0].diff(commit)
                for d in diff:
                    if d.a_path:
                        stats['files_changed'].add(d.a_path)
                    if d.b_path:
                        stats['files_changed'].add(d.b_path)
            except Exception as e:
                # Diff 에러 무시
                pass

    # Set을 list로 변환 (JSON 직렬화를 위해)
    stats['files_changed'] = list(stats['files_changed'])
    stats['contributors'] = list(stats['contributors'])
    stats['commits_by_type'] = dict(stats['commits_by_type'])
    stats['commits_by_scope'] = dict(stats['commits_by_scope'])

    # 디렉토리 생성
    os.makedirs('portfolio', exist_ok=True)

    # JSON 저장
    with open('portfolio/stats.json', 'w', encoding='utf-8') as f:
        json.dump(stats, f, indent=2, ensure_ascii=False)

    print(f"✅ Generated stats: {stats['total_commits']} commits analyzed")
    print(f"   Files changed: {len(stats['files_changed'])}")
    print(f"   Contributors: {', '.join(stats['contributors'])}")


if __name__ == '__main__':
    generate_stats()
