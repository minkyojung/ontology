# 법인카드 부정사용 탐지 시스템 오픈소스 공개 로드맵

**프로젝트명:** Corporate Card Fraud Detection System
**목표:** 오픈소스 공개 및 실제 기업 사용 가능한 수준 달성
**예상 기간:** 12주 (3개월)
**작성일:** 2025-10-21

---

## 📊 현재 상태 점검 (Current State Assessment)

### ✅ 완료된 것
- [x] Neo4j 기반 그래프 데이터베이스 연동
- [x] 기본 대시보드 UI (Next.js + TailwindCSS)
- [x] 케이스 조회 및 필터링 기능
- [x] Force-directed 그래프 시각화 (Phase 1 MVP)
- [x] 5개 탐지 규칙 구현 (MCC 블랙리스트, 세법 위반 등)
- [x] 하드코딩된 DB 자격증명 제거 (환경변수 전환)
- [x] 보안 검토 완료 (SECURITY_REVIEW.md)
- [x] 오픈소스 준비도 분석 (OPEN_SOURCE_READINESS.md)
- [x] 변경 이력 문서 (CHANGELOG.md)

### ❌ 미완료 (오픈소스 전 필수)
- [ ] 인증/인가 시스템 (현재 누구나 접근 가능)
- [ ] 데이터 임포트 기능 (CSV 업로드, API)
- [ ] Neo4j 인덱스 생성 (성능 이슈)
- [ ] API Rate Limiting
- [ ] 페이지네이션 (현재 500개 전체 로딩)
- [ ] 에러 처리 개선 (내부 에러 노출 중)
- [ ] 프로덕션급 로깅 시스템
- [ ] Docker/Docker Compose 환경
- [ ] CI/CD 파이프라인
- [ ] 종합 문서 (README, 설치 가이드 등)
- [ ] 오픈소스 라이선스 선택
- [ ] 커뮤니티 준비 (GitHub Issues, Discussions)

---

## 🎯 오픈소스 공개 목표

### 필수 달성 목표 (Minimum Viable Open Source)
1. **보안:** 인증 시스템 + API 보안 강화
2. **사용성:** CSV 업로드로 자체 데이터 사용 가능
3. **성능:** 1,000건 이상 거래 처리 시 응답속도 < 2초
4. **문서:** 비개발자도 10분 내 설치 가능한 가이드
5. **배포:** Docker Compose 한 줄로 실행 가능

### 선택 목표 (Nice to Have)
- SSO 통합 (Okta, Google Workspace)
- 커스텀 룰 빌더 UI
- Slack/Teams 알림 연동
- 다국어 지원 (영어)
- Helm Chart (Kubernetes 배포)

---

## 📅 12주 실행 계획 (Weekly Breakdown)

### **Week 1-2: 보안 강화 및 인증 구현**

#### Week 1 목표: 인증 시스템 MVP
**작업 항목:**
1. **NextAuth.js 설치 및 설정**
   ```bash
   cd dashboard
   npm install next-auth @next-auth/neo4j-adapter bcryptjs
   ```
   - [ ] `app/api/auth/[...nextauth]/route.ts` 생성
   - [ ] 이메일/비밀번호 로그인 구현
   - [ ] Neo4j에 User 노드 추가

2. **로그인 UI 구현**
   - [ ] `app/login/page.tsx` 생성
   - [ ] 로그인 폼 컴포넌트
   - [ ] 회원가입 폼 (초대 코드 방식)

3. **인증 미들웨어 추가**
   - [ ] `middleware.ts` 생성 - 미인증 시 리다이렉트
   - [ ] 모든 `/api/*` 경로 보호
   - [ ] 세션 관리

**검증 기준:**
- [ ] 로그인 없이는 대시보드 접근 불가
- [ ] `/api/cases` 호출 시 401 Unauthorized 반환
- [ ] 세션 만료 시 자동 로그아웃

---

#### Week 2 목표: RBAC 및 API 보안
**작업 항목:**
1. **역할 기반 접근 제어 (RBAC)**
   ```typescript
   // lib/auth/roles.ts
   enum Role {
     ADMIN = 'ADMIN',           // 모든 권한
     INVESTIGATOR = 'INVESTIGATOR',  // 케이스 조회/수정
     ANALYST = 'ANALYST',        // 읽기 전용
   }
   ```
   - [ ] User 노드에 `role` 속성 추가
   - [ ] 권한 체크 미들웨어 구현
   - [ ] API 엔드포인트별 권한 설정

2. **Rate Limiting 구현**
   ```bash
   npm install express-rate-limit
   ```
   - [ ] `/api/cases`: 분당 60회
   - [ ] `/api/cases/[id]/actions`: 분당 10회
   - [ ] `/api/import/*`: 시간당 100회

3. **입력 검증 (Zod)**
   ```bash
   npm install zod
   ```
   - [ ] `lib/validation/schemas.ts` 생성
   - [ ] 모든 POST 요청 검증
   - [ ] 에러 메시지 표준화

**검증 기준:**
- [ ] ANALYST 역할로 승인 시도 시 403 Forbidden
- [ ] Rate limit 초과 시 429 Too Many Requests
- [ ] 잘못된 JSON 전송 시 명확한 에러 메시지

---

### **Week 3-4: 데이터 임포트 시스템**

#### Week 3 목표: CSV 업로드 MVP
**작업 항목:**
1. **CSV 파일 업로드 UI**
   - [ ] `app/import/page.tsx` 생성
   - [ ] 파일 드래그 앤 드롭 컴포넌트
   - [ ] CSV 미리보기 테이블

2. **CSV 파싱 및 검증**
   ```bash
   npm install papaparse zod
   ```
   - [ ] `lib/import/csv-parser.ts` 구현
   - [ ] Transaction 스키마 검증
   - [ ] 에러 라인 번호 표시

3. **Neo4j 임포트 API**
   - [ ] `app/api/import/csv/route.ts` 생성
   - [ ] 배치 처리 (1,000건씩)
   - [ ] 진행률 표시 (Server-Sent Events)

**예제 CSV 형식:**
```csv
transaction_id,employee_id,merchant_name,amount,currency,mcc_code,transacted_at
TXN001,EMP001,스타벅스,4500,KRW,5814,2025-10-21T09:30:00Z
TXN002,EMP002,노트북매장,2500000,KRW,5732,2025-10-21T14:20:00Z
```

**검증 기준:**
- [ ] 1,000건 CSV 업로드 시 < 30초 처리
- [ ] 잘못된 형식 발견 시 구체적 에러 메시지
- [ ] 업로드 진행률 실시간 표시

---

#### Week 4 목표: API 임포트 및 웹훅
**작업 항목:**
1. **REST API 임포트**
   - [ ] `app/api/v1/transactions/import/route.ts` 생성
   - [ ] API 키 관리 시스템 (Neo4j에 저장)
   - [ ] Bearer Token 인증

2. **웹훅 수신 엔드포인트**
   - [ ] `app/api/v1/webhooks/transactions/route.ts`
   - [ ] HMAC 서명 검증
   - [ ] 비동기 처리 (큐 시스템)

3. **BullMQ 작업 큐 설정**
   ```bash
   npm install bullmq ioredis
   ```
   - [ ] Redis 연결 설정
   - [ ] 임포트 작업 큐 생성
   - [ ] 재시도 로직 (실패 시 3회)

**API 예제:**
```bash
curl -X POST https://api.fraud-detection.io/v1/transactions/import \
  -H "Authorization: Bearer API_KEY_123" \
  -H "Content-Type: application/json" \
  -d '{
    "transactions": [
      {
        "transaction_id": "TXN123",
        "amount": 50000,
        "merchant_name": "ABC Corp",
        "transacted_at": "2025-10-21T10:30:00Z"
      }
    ]
  }'
```

**검증 기준:**
- [ ] API로 100건 전송 시 < 5초 응답
- [ ] 잘못된 API 키 전송 시 401 반환
- [ ] 작업 큐 상태 모니터링 가능

---

### **Week 5-6: 성능 최적화**

#### Week 5 목표: 데이터베이스 최적화
**작업 항목:**
1. **Neo4j 인덱스 생성**
   - [ ] `scripts/create-indexes.cypher` 작성
   ```cypher
   CREATE INDEX case_id_index IF NOT EXISTS FOR (c:Case) ON (c.case_id);
   CREATE INDEX case_status_index IF NOT EXISTS FOR (c:Case) ON (c.status);
   CREATE INDEX case_created_index IF NOT EXISTS FOR (c:Case) ON (c.created_at);
   CREATE INDEX transaction_id_index IF NOT EXISTS FOR (t:Transaction) ON (t.id);
   CREATE INDEX transaction_date_index IF NOT EXISTS FOR (t:Transaction) ON (t.transacted_at);
   CREATE INDEX employee_id_index IF NOT EXISTS FOR (e:Employee) ON (e.id);
   CREATE INDEX merchant_name_index IF NOT EXISTS FOR (m:Merchant) ON (m.name);
   CREATE CONSTRAINT case_id_unique IF NOT EXISTS FOR (c:Case) REQUIRE c.case_id IS UNIQUE;
   ```
   - [ ] 초기 설정 스크립트에 포함

2. **쿼리 최적화**
   - [ ] 케이스 목록 쿼리 개선 (`app/cases/page.tsx`)
   - [ ] N+1 쿼리 제거
   - [ ] EXPLAIN PLAN으로 쿼리 분석

3. **성능 테스트**
   ```bash
   npm install @k6-io/k6
   ```
   - [ ] `tests/performance/cases-api.js` 작성
   - [ ] 100 동시 사용자 시나리오
   - [ ] 목표: p95 응답속도 < 500ms

**검증 기준:**
- [ ] 10,000건 케이스 조회 시 < 2초
- [ ] 인덱스 사용 여부 EXPLAIN으로 확인
- [ ] CPU 사용률 < 70%

---

#### Week 6 목표: 캐싱 및 페이지네이션
**작업 항목:**
1. **Redis 캐싱 설정**
   ```bash
   npm install ioredis
   ```
   - [ ] `lib/cache/redis-client.ts` 구현
   - [ ] 케이스 목록 캐싱 (TTL: 5분)
   - [ ] MCC 코드 캐싱 (TTL: 24시간)

2. **커서 기반 페이지네이션**
   - [ ] `app/api/cases/route.ts` 수정
   ```typescript
   GET /api/cases?cursor=eyJjcmVhdGVkX2F0IjoiMjAyNS0xMC0yMVQxMDozMDowMFoifQ&limit=50
   ```
   - [ ] 무한 스크롤 UI 구현 (`react-intersection-observer`)

3. **정적 리소스 최적화**
   - [ ] Next.js Image 컴포넌트 사용
   - [ ] Font 최적화 (Google Fonts → Self-hosting)
   - [ ] Bundle 크기 분석 (`@next/bundle-analyzer`)

**검증 기준:**
- [ ] 캐시 적중률 > 60%
- [ ] 페이지 초기 로딩 시간 < 1초
- [ ] JavaScript 번들 < 500KB

---

### **Week 7-8: 관측성 및 모니터링**

#### Week 7 목표: 로깅 시스템
**작업 항목:**
1. **구조화된 로깅 (Winston)**
   ```bash
   npm install winston winston-daily-rotate-file
   ```
   - [ ] `lib/logger/winston.ts` 설정
   - [ ] 로그 레벨 (DEBUG, INFO, WARN, ERROR)
   - [ ] 일일 로그 파일 로테이션

2. **감사 로그 (Audit Log)**
   - [ ] Neo4j에 AuditLog 노드 생성
   - [ ] 모든 케이스 액션 기록
   ```cypher
   CREATE (a:AuditLog {
     timestamp: datetime(),
     user_id: $userId,
     action: $action,
     resource: $resourceId,
     ip_address: $ip
   })
   ```

3. **에러 추적 (Sentry 연동)**
   ```bash
   npm install @sentry/nextjs
   ```
   - [ ] `sentry.client.config.ts` 설정
   - [ ] 프로덕션 에러 자동 리포팅
   - [ ] 소스맵 업로드

**검증 기준:**
- [ ] 모든 API 호출이 로그에 기록
- [ ] 케이스 승인/거부 시 감사 로그 생성
- [ ] 에러 발생 시 Sentry에 자동 전송

---

#### Week 8 목표: 메트릭 및 알림
**작업 항목:**
1. **Prometheus 메트릭 노출**
   ```bash
   npm install prom-client
   ```
   - [ ] `app/api/metrics/route.ts` 생성
   - [ ] 커스텀 메트릭 정의
     - `fraud_cases_total`: 탐지된 케이스 수
     - `fraud_detection_latency`: 탐지 소요 시간
     - `api_requests_total`: API 호출 수

2. **Grafana 대시보드**
   - [ ] `monitoring/grafana-dashboard.json` 작성
   - [ ] 주요 메트릭 시각화
   - [ ] 알림 규칙 설정

3. **헬스체크 엔드포인트**
   - [ ] `app/api/health/route.ts` 구현
   - [ ] Neo4j 연결 상태 확인
   - [ ] Redis 연결 상태 확인
   ```json
   {
     "status": "healthy",
     "neo4j": "connected",
     "redis": "connected",
     "uptime": 86400
   }
   ```

**검증 기준:**
- [ ] Prometheus가 `/api/metrics` 스크래핑 성공
- [ ] Grafana 대시보드에서 실시간 메트릭 확인
- [ ] Neo4j 장애 시 헬스체크 `unhealthy` 반환

---

### **Week 9-10: 문서 및 배포 환경**

#### Week 9 목표: Docker 환경 구축
**작업 항목:**
1. **Dockerfile 작성**
   ```dockerfile
   # dashboard/Dockerfile
   FROM node:20-alpine AS builder
   WORKDIR /app
   COPY package*.json ./
   RUN npm ci
   COPY . .
   RUN npm run build

   FROM node:20-alpine AS runner
   WORKDIR /app
   ENV NODE_ENV=production
   COPY --from=builder /app/.next/standalone ./
   COPY --from=builder /app/.next/static ./.next/static
   COPY --from=builder /app/public ./public
   EXPOSE 3000
   CMD ["node", "server.js"]
   ```

2. **Docker Compose 설정**
   ```yaml
   # docker-compose.yml
   version: '3.8'
   services:
     neo4j:
       image: neo4j:5-community
       environment:
         NEO4J_AUTH: neo4j/password123
       ports:
         - "7474:7474"
         - "7687:7687"
       volumes:
         - neo4j-data:/data

     redis:
       image: redis:7-alpine
       ports:
         - "6379:6379"

     dashboard:
       build: ./dashboard
       ports:
         - "3006:3000"
       environment:
         NEO4J_URI: bolt://neo4j:7687
         REDIS_URL: redis://redis:6379
       depends_on:
         - neo4j
         - redis

   volumes:
     neo4j-data:
   ```

3. **데이터 초기화 스크립트**
   - [ ] `scripts/docker-init.sh` 작성
   - [ ] 샘플 데이터 자동 생성
   - [ ] 초기 사용자 계정 생성

**검증 기준:**
- [ ] `docker-compose up` 한 번에 전체 시스템 실행
- [ ] 초기 실행 후 http://localhost:3006 접속 가능
- [ ] 샘플 데이터 100건 자동 생성

---

#### Week 10 목표: 종합 문서 작성
**작업 항목:**
1. **README.md 작성**
   ```markdown
   # Corporate Card Fraud Detection System

   🚀 **오픈소스 그래프 기반 법인카드 부정사용 탐지 시스템**

   ## 주요 기능
   - 실시간 거래 모니터링
   - 그래프 시각화 (Neo4j)
   - 5가지 탐지 규칙
   - CSV 데이터 업로드
   - 역할 기반 접근 제어

   ## 빠른 시작
   \`\`\`bash
   git clone https://github.com/yourorg/fraud-detection
   cd fraud-detection
   docker-compose up
   # 브라우저에서 http://localhost:3006 열기
   \`\`\`

   ## 스크린샷
   ![대시보드](docs/images/dashboard.png)

   ## 문서
   - [설치 가이드](docs/installation.md)
   - [API 레퍼런스](docs/api-reference.md)
   - [아키텍처 설명](docs/architecture.md)
   - [기여 가이드](CONTRIBUTING.md)

   ## 라이선스
   AGPL-3.0 - 자세한 내용은 [LICENSE](LICENSE) 참조
   ```

2. **상세 문서 작성**
   - [ ] `docs/installation.md` - 설치 가이드
   - [ ] `docs/configuration.md` - 환경 설정
   - [ ] `docs/api-reference.md` - API 문서
   - [ ] `docs/architecture.md` - 시스템 구조
   - [ ] `docs/deployment.md` - 배포 가이드
   - [ ] `CONTRIBUTING.md` - 기여자 가이드
   - [ ] `CODE_OF_CONDUCT.md` - 행동 강령
   - [ ] `SECURITY.md` - 보안 취약점 제보

3. **API 문서 자동 생성**
   ```bash
   npm install swagger-jsdoc swagger-ui-react
   ```
   - [ ] OpenAPI 3.0 스펙 작성
   - [ ] `/api-docs` 엔드포인트 생성
   - [ ] Postman Collection 생성

**검증 기준:**
- [ ] 비개발자가 README만 보고 설치 가능
- [ ] 모든 API 엔드포인트 문서화
- [ ] 스크린샷 및 데모 영상 포함

---

### **Week 11: CI/CD 및 테스트**

**작업 항목:**
1. **GitHub Actions CI 파이프라인**
   ```yaml
   # .github/workflows/ci.yml
   name: CI
   on: [push, pull_request]

   jobs:
     lint:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v3
         - uses: actions/setup-node@v3
         - run: npm ci
         - run: npm run lint

     test:
       runs-on: ubuntu-latest
       services:
         neo4j:
           image: neo4j:5
           env:
             NEO4J_AUTH: neo4j/test
       steps:
         - uses: actions/checkout@v3
         - run: npm ci
         - run: npm run test

     build:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v3
         - run: npm ci
         - run: npm run build
   ```

2. **보안 스캔 자동화**
   ```yaml
   # .github/workflows/security.yml
   name: Security Scan
   on: [push]

   jobs:
     trivy:
       runs-on: ubuntu-latest
       steps:
         - uses: aquasecurity/trivy-action@master
           with:
             scan-type: 'fs'
             severity: 'CRITICAL,HIGH'
   ```

3. **통합 테스트 작성**
   ```bash
   npm install --save-dev jest @testing-library/react
   ```
   - [ ] `tests/integration/api/cases.test.ts`
   - [ ] `tests/integration/import/csv.test.ts`
   - [ ] `tests/e2e/login.test.ts` (Playwright)

**검증 기준:**
- [ ] PR 생성 시 자동 CI 실행
- [ ] 테스트 실패 시 머지 차단
- [ ] 보안 취약점 발견 시 알림

---

### **Week 12: 오픈소스 공개 준비**

**작업 항목:**
1. **라이선스 결정 및 추가**
   - [ ] `LICENSE` 파일 추가 (권장: AGPL-3.0)
   - [ ] 모든 소스 파일에 라이선스 헤더 추가
   - [ ] 종속성 라이선스 검토

2. **GitHub 저장소 설정**
   - [ ] 공개 저장소로 전환 (또는 새 저장소 생성)
   - [ ] Issue 템플릿 설정 (`.github/ISSUE_TEMPLATE/`)
     - `bug_report.md`
     - `feature_request.md`
   - [ ] PR 템플릿 설정 (`.github/PULL_REQUEST_TEMPLATE.md`)
   - [ ] GitHub Discussions 활성화

3. **커뮤니티 준비**
   - [ ] Discord 서버 개설
   - [ ] Twitter/X 계정 생성
   - [ ] 론칭 블로그 포스트 작성
   - [ ] 데모 사이트 배포 (Vercel/Railway)
   - [ ] 데모 영상 녹화 (YouTube)

4. **론칭 체크리스트**
   - [ ] README 최종 검토
   - [ ] 보안 검토 완료
   - [ ] 성능 테스트 통과
   - [ ] 문서 링크 확인
   - [ ] 샘플 데이터 테스트

5. **홍보 계획**
   - [ ] Hacker News "Show HN" 게시
   - [ ] Reddit 게시 (/r/opensource, /r/netsec, /r/selfhosted)
   - [ ] Product Hunt 등록
   - [ ] Dev.to 튜토리얼 작성
   - [ ] LinkedIn 게시물
   - [ ] 한국 개발자 커뮤니티 (GeekNews, 클리앙)

**검증 기준:**
- [ ] 새 사용자가 10분 내 설치 성공
- [ ] 모든 문서 링크 유효
- [ ] 데모 사이트 정상 작동
- [ ] 24시간 내 첫 GitHub Star 획득

---

## 🚨 주요 리스크 및 대응 방안

### 리스크 1: 보안 취약점 발견
**가능성:** 중상
**영향도:** 치명적
**대응:**
- 보안 전문가 코드 리뷰 의뢰
- Bug Bounty 프로그램 운영 (오픈소스 공개 후)
- SECURITY.md에 책임있는 공개 절차 명시

### 리스크 2: 성능 문제
**가능성:** 중
**영향도:** 높음
**대응:**
- 부하 테스트 철저히 수행 (Week 5)
- 초기 사용자 제한 (베타 기간)
- 성능 개선 로드맵 README에 명시

### 리스크 3: 문서 부족으로 사용자 이탈
**가능성:** 높음
**영향도:** 높음
**대응:**
- 비개발자 테스트 사용자 모집 (Week 10)
- 설치 과정 화면 녹화 영상 제공
- "Getting Started in 5 minutes" 가이드 작성

### 리스크 4: 커뮤니티 형성 실패
**가능성:** 높음
**영향도:** 중
**대응:**
- 초기 기여자 적극 환영 (빠른 PR 리뷰)
- "Good First Issue" 라벨 활용
- 월간 컨트리뷰터 감사 포스트
- 오프라인 밋업 개최 (서울)

---

## ✅ 완료 체크리스트 (Launch Readiness Checklist)

### 보안
- [ ] 모든 API 엔드포인트 인증 필요
- [ ] Rate limiting 적용
- [ ] 입력 검증 구현
- [ ] 에러 메시지에 민감 정보 노출 없음
- [ ] 보안 스캔 도구 통과 (Trivy, Snyk)
- [ ] OWASP Top 10 취약점 검토

### 기능
- [ ] CSV 업로드 작동
- [ ] API 임포트 작동
- [ ] 5개 탐지 규칙 정상 작동
- [ ] 그래프 시각화 버그 없음
- [ ] 케이스 승인/거부 정상 작동
- [ ] 페이지네이션 작동

### 성능
- [ ] 10,000건 케이스 조회 < 2초
- [ ] Neo4j 인덱스 모두 생성
- [ ] 캐시 적중률 > 60%
- [ ] p95 응답속도 < 500ms
- [ ] JavaScript 번들 < 500KB

### 개발 환경
- [ ] Docker Compose 한 줄로 실행
- [ ] 환경 변수 문서화 (.env.example)
- [ ] 샘플 데이터 자동 생성
- [ ] 로컬 개발 가이드 작성

### 문서
- [ ] README 완성
- [ ] 설치 가이드 작성
- [ ] API 레퍼런스 작성
- [ ] 아키텍처 다이어그램 작성
- [ ] CONTRIBUTING.md 작성
- [ ] CODE_OF_CONDUCT.md 작성
- [ ] SECURITY.md 작성

### CI/CD
- [ ] GitHub Actions CI 파이프라인
- [ ] 자동 테스트 실행
- [ ] 보안 스캔 자동화
- [ ] Docker 이미지 자동 빌드

### 커뮤니티
- [ ] GitHub Issues 템플릿
- [ ] PR 템플릿
- [ ] Discord 서버 개설
- [ ] 론칭 블로그 포스트 작성
- [ ] 데모 영상 녹화

### 법률 및 라이선스
- [ ] 라이선스 선택 (AGPL-3.0)
- [ ] 모든 종속성 라이선스 확인
- [ ] 라이선스 파일 추가
- [ ] 소스 파일 헤더 추가

---

## 📊 주차별 목표 요약 (Quick Reference)

| 주차 | 핵심 목표 | 산출물 |
|-----|---------|--------|
| 1 | NextAuth 인증 구현 | 로그인 페이지, 세션 관리 |
| 2 | RBAC + API 보안 | 권한 시스템, Rate Limiting |
| 3 | CSV 업로드 MVP | 임포트 UI, 파일 파서 |
| 4 | API 임포트 + 웹훅 | REST API, 작업 큐 |
| 5 | Neo4j 인덱스 + 쿼리 최적화 | 인덱스 스크립트, 성능 테스트 |
| 6 | Redis 캐싱 + 페이지네이션 | 무한 스크롤, 번들 최적화 |
| 7 | 로깅 + 감사 추적 | Winston 설정, 감사 로그 |
| 8 | 메트릭 + 모니터링 | Prometheus, Grafana |
| 9 | Docker 환경 구축 | Dockerfile, docker-compose.yml |
| 10 | 종합 문서 작성 | README, 가이드 문서 |
| 11 | CI/CD + 테스트 | GitHub Actions, 통합 테스트 |
| 12 | 오픈소스 공개 | 라이선스, 커뮤니티, 론칭 |

---

## 🎯 성공 지표 (Success Metrics)

### 오픈소스 공개 후 1개월 목표
- [ ] GitHub Stars: 100개 이상
- [ ] 외부 기여자: 3명 이상
- [ ] Issues 응답 시간: 평균 24시간 이내
- [ ] Docker Hub 다운로드: 500회 이상
- [ ] 문서 페이지뷰: 1,000회 이상

### 오픈소스 공개 후 3개월 목표
- [ ] GitHub Stars: 500개 이상
- [ ] 실제 사용 기업: 1개 이상
- [ ] 커뮤니티 Discord 멤버: 50명 이상
- [ ] 컨퍼런스 발표: 1회 이상
- [ ] 블로그 튜토리얼: 5개 이상

---

## 📞 지원 및 문의

**프로젝트 관리자:** [이름]
**이메일:** [이메일]
**Discord:** [링크]
**GitHub Discussions:** [링크]

---

## 🔄 다음 검토일

- **Week 4 검토:** 2025-11-18 (데이터 임포트 완료 후)
- **Week 8 검토:** 2025-12-16 (성능 최적화 완료 후)
- **Week 12 검토:** 2026-01-13 (오픈소스 공개 전)

---

**문서 버전:** 1.0
**최종 수정일:** 2025-10-21
**다음 업데이트:** Week 1 완료 후
