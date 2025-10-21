# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Quick Actions**: Approve, Reject, and Request Receipt buttons with dialog confirmations
- **Auto-reject templates**: Predefined rejection reasons based on case type with policy references
- **Priority Queue**: Smart case sorting based on severity, case type, amount, and status
- **Priority indicators**: Visual dots with color-coded urgency labels
- **Toast notifications**: Real-time feedback using Sonner library
- **Tax Law Violation filter**: Added missing case type to filters
- **Environment variable template** (`.env.example`): Setup guidance for database configuration
- **Security Review document**: Comprehensive security and performance audit
- **Open Source Readiness analysis**: Enterprise features roadmap and implementation guide

### Changed
- **BREAKING**: Neo4j credentials now required via environment variables (no fallbacks)
- **Cases query**: Simplified from UNION-based to single query for all case types
- **Priority column**: Replaced badge-heavy design with minimalist dots + text
- **Pattern column**: Changed from badge to plain text for better visual hierarchy
- **Merchant/MCC column**: Display format now matches Employee column (vertical layout)
- **Severity badges**: Unified sizing (h-5, px-2) with orange color for HIGH
- **MCC risk group**: Changed from badge to colored text (BLACK=red, GRAY=yellow)
- **Connection pool size**: Reduced to 10 for production (was 50)
- **Connection acquisition timeout**: Reduced to 10 seconds (was 2 minutes)

### Removed
- **Hardcoded credentials**: Removed default password 'ontology123' from Neo4j driver
- **Debug/test endpoints**: Deleted `/api/test/route.ts`
- **Backup files**: Removed `page.tsx.backup`, `page_client_backup.tsx`, `page_server_backup.tsx`, `page_simple.tsx`
- **console.log statements**: Cleaned up 20+ debug logs across codebase
- **Sensitive error details**: Removed stack traces from API error responses
- **Unused imports**: Removed FileText, Button, CheckCircle, XCircle, MoreHorizontal, GraphLink
- **Unused functions**: Removed getStatusBadge, getRiskColor
- **Unused variables**: Fixed unused parameter warnings

### Fixed
- **Tax Law Violation missing**: Fixed filtering issue where TAX_LAW_VIOLATION cases weren't displayed
- **TypeScript type errors**: Added proper interfaces for CaseDetail, Transaction, Employee
- **Type safety**: Replaced `any` types with proper types or unknown where appropriate
- **Nullable checks**: Added conditional rendering for optional fields (transactedAt, similarity, merchant)
- **API error handling**: Standardized error responses without leaking implementation details

### Security
- ⚠️ **CRITICAL**: Removed hardcoded database password from source code
- ⚠️ **CRITICAL**: No authentication/authorization on API routes (documented in SECURITY_REVIEW.md)
- ⚠️ **HIGH**: Input validation missing (documented for future implementation)
- ⚠️ **HIGH**: No rate limiting (documented for future implementation)
- Documented 16 security issues with remediation steps in `SECURITY_REVIEW.md`

### Performance
- ⚠️ **CRITICAL**: Missing database indexes (documented in SECURITY_REVIEW.md)
- ⚠️ **HIGH**: No caching layer (documented for future implementation)
- ⚠️ **MEDIUM**: No pagination (LIMIT 500 hardcoded)
- Documented performance optimization plan in `SECURITY_REVIEW.md`

### Technical Debt
- Remaining TypeScript errors in QuickActions.tsx, page.tsx, ForceGraph.tsx (requires refactoring)
- Neo4j type definitions need improvement for better type inference
- Build process times out on type checking (needs investigation)

### Documentation
- Created `SECURITY_REVIEW.md` with 200+ lines of security analysis
- Created `OPEN_SOURCE_READINESS.md` with 700+ lines of enterprise roadmap
- Added `.env.example` template

---

## [0.1.0] - 2025-10-21

### Added
- Force-directed graph visualization for case networks
- Detection reasoning display on case detail pages
- Kaggle dataset research and integration
- Portfolio automation system
- Performance monitoring and metrics

### Infrastructure
- Neo4j graph database integration
- Next.js 15.5.6 dashboard
- Tailwind CSS + Shadcn/ui components
- TypeScript with strict mode

---

[Unreleased]: https://github.com/org/fraud-detection/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/org/fraud-detection/releases/tag/v0.1.0
