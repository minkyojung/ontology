#!/usr/bin/env python3
"""
주간 개발 리포트 생성 스크립트

Git 커밋 히스토리를 기반으로 주간 개발 리포트를 마크다운 형식으로 생성합니다.
"""

import git
import os
from datetime import datetime, timedelta
from jinja2 import Template

TEMPLATE = """# 주간 개발 리포트 - {{ week_number }}

**기간**: {{ start_date }} ~ {{ end_date }}

## 📊 Summary

- **총 커밋 수**: {{ total_commits }}
- **변경된 파일 수**: {{ files_changed }}
- **기여자**: {{ contributors | join(', ') }}

## 🎯 주요 작업

{% for commit in commits %}
### {{ commit.subject }}

- **작성자**: {{ commit.author }}
- **날짜**: {{ commit.date }}
- **커밋**: `{{ commit.hash }}`

{% if commit.body %}
{{ commit.body }}
{% else %}
_상세 내용 없음_
{% endif %}

---
{% endfor %}

## 📈 작업 분류

| 카테고리 | 커밋 수 | 비율 |
|---------|--------|------|
{% for type, count in commit_types.items() %}
| {{ type }} | {{ count }} | {{ (count / total_commits * 100) | round(1) }}% |
{% endfor %}

## 🔗 관련 링크

- [프로젝트 GitHub](https://github.com/minkyojung/ontology)
- [프로젝트 대시보드](http://localhost:3000/dashboard)

---

_자동 생성됨: {{ generated_at }}_
"""


def generate_weekly_report():
    """주간 리포트 생성"""
    try:
        repo = git.Repo('.')
    except git.InvalidGitRepositoryError:
        print("Error: Not a git repository")
        return

    # 이번 주 월요일 ~ 일요일
    today = datetime.now()
    start_of_week = today - timedelta(days=today.weekday())
    start_of_week = start_of_week.replace(hour=0, minute=0, second=0, microsecond=0)
    end_of_week = start_of_week + timedelta(days=6, hours=23, minutes=59, seconds=59)

    commits = []
    commit_types = {}
    files_changed = set()
    contributors = set()

    for commit in repo.iter_commits(since=start_of_week.isoformat(), until=end_of_week.isoformat()):
        msg = commit.message.split('\n')
        subject = msg[0]
        body = '\n'.join(msg[1:]).strip()

        # Parse conventional commit
        if ':' in subject:
            type_scope = subject.split(':')[0]
            commit_type = type_scope.split('(')[0] if '(' in type_scope else type_scope
        else:
            commit_type = 'other'

        contributors.add(commit.author.name)

        commits.append({
            'hash': commit.hexsha[:7],
            'subject': subject,
            'body': body,
            'author': commit.author.name,
            'date': commit.committed_datetime.strftime('%Y-%m-%d %H:%M'),
        })

        commit_types[commit_type] = commit_types.get(commit_type, 0) + 1

        # 파일 변경 추적
        if commit.parents:
            try:
                diff = commit.parents[0].diff(commit)
                for d in diff:
                    if d.a_path:
                        files_changed.add(d.a_path)
                    if d.b_path:
                        files_changed.add(d.b_path)
            except:
                pass

    # 커밋이 없으면 리포트 생성 안 함
    if len(commits) == 0:
        print("ℹ️  No commits this week, skipping weekly report")
        return

    # 템플릿 렌더링
    template = Template(TEMPLATE)
    content = template.render(
        week_number=start_of_week.strftime('%Y-W%U'),
        start_date=start_of_week.strftime('%Y-%m-%d'),
        end_date=end_of_week.strftime('%Y-%m-%d'),
        total_commits=len(commits),
        files_changed=len(files_changed),
        contributors=list(contributors),
        commits=commits,
        commit_types=commit_types,
        generated_at=datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    )

    # 디렉토리 생성
    os.makedirs('portfolio/weekly', exist_ok=True)

    # 파일 저장
    week_file = f"portfolio/weekly/{start_of_week.strftime('%Y-W%U')}.md"
    with open(week_file, 'w', encoding='utf-8') as f:
        f.write(content)

    print(f"✅ Generated weekly report: {week_file}")
    print(f"   Commits: {len(commits)}")
    print(f"   Contributors: {', '.join(contributors)}")


if __name__ == '__main__':
    generate_weekly_report()
