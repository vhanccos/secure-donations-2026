# Project: Plataforma de Donaciones Seguras («Fundación AQP-SOLIDARIA»)

## Architecture
Serverless cloud architecture on AWS in region `us-east-2` following the Zero Trust Security Model (NIST SP 800-207) and AWS Free Tier constraints.

```
[Browser / Client SPA]
       │
       ▼ (HTTPS / TLS 1.3)
[Amazon API Gateway HTTP API v2 (PEP)] ──(JWT Validation JWKS)──> [Amazon Cognito User Pool (PA)]
       │ (Claims injected)                                          - Groups: DONANTE, GESTOR, AUDITOR
       ▼                                                            - MFA: TOTP enforced on GESTOR/AUDITOR
[AWS Lambda Functions (PDP + Business Logic)]
       │ (Node.js 24 + TypeScript + Zod Validation)
       ├── DynamoDB TransactWriteItems ──> [DynamoDB Tables]
       │                                     - Projects (PK: projectId, GSI: status)
       │                                     - Donations (PK: donationId, GSI: donorSub)
       │                                     - Idempotency (PK: pk, TTL: expiresAt)
       │                                     - AuditEvents (PK: eventType, SK: timestamp#id)
       │
       └── Structured JSON Logs ─────────> [Amazon CloudWatch Logs]
```

### Decoupled Control & Data Planes (NIST SP 800-207)
- **Policy Enforcement Point (PEP)**: Amazon API Gateway HTTP API with JWT Authorizer validating token signatures, issuer, audience, and required OAuth scopes (`api/projects.write`, `api/donations.write`, `api/donations.read`, `api/audit.read`).
- **Policy Decision Point (PDP)**: Lambda authorization logic evaluating verified claims (`sub`, `cognito:groups`) against resource state and ownership in DynamoDB.
- **Policy Administrator (PA)**: Amazon Cognito User Pool issuing short-lived tokens (≤ 15 min), enforcing software token MFA TOTP, and managing group assignments.

---

## Feature Inventory
Every feature from the Step 0 Survey is mapped to a milestone below.

| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | DynamoDB On-Demand Tables | 4 tables (`Projects`, `Donations`, `Idempotency`, `AuditEvents`) with TTL on `expiresAt` | M1 | Survey |
| 2 | Cognito User Pool & Groups | User Pool, public client (PKCE), groups `DONANTE`, `GESTOR`, `AUDITOR`, scopes | M1 | Survey |
| 3 | Mandatory MFA TOTP | Software token TOTP (RFC 6238) enforced on `GESTOR` and `AUDITOR` | M1 | Survey |
| 4 | API Gateway HTTP API PEP | JWT Authorizer validating Cognito issuer, client_id, and scopes; route definitions | M1 | Survey |
| 5 | AWS SAM Template & Deployment | Synthesizable, reproducible `template.yaml` deployed to `us-east-2` | M1 | Survey |
| 6 | Public Catalog & Detail (HU-01, HU-02) | `GET /v1/projects` (only published) and `GET /v1/projects/{id}` | M2 | Survey |
| 7 | Public Statistics (HU-09) | `GET /v1/projects/{id}/stats` aggregate confirmed amounts | M2 | Survey |
| 8 | Project Management (HU-08) | `POST /v1/projects` and `PATCH /v1/projects/{id}/publish` restricted to `GESTOR` | M2 | Survey |
| 9 | Donation Intention (HU-05) | `POST /v1/donations` with `Idempotency-Key` and amount validation | M2 | Survey |
| 10 | Atomic Idempotency Protocol | `TransactWriteItems` reserving key and writing donation with SHA-256 payload hash | M2 | Survey |
| 11 | Simulated Confirmation (HU-06) | `POST /v1/donations/{id}/simulate` with atomic balance increment and race prevention | M2 | Survey |
| 12 | Donor History & BOLA Prevention (HU-07) | `GET /v1/donations/me` filtered strictly by authenticated `donorSub` | M2 | Survey |
| 13 | Structured CloudWatch Logging | JSON logs with `requestId`, duration, action, and secret redaction | M2 | Survey |
| 14 | In-Memory Token Management | Tokens held exclusively in React Context memory; zero `localStorage`/`sessionStorage` | M3 | Survey |
| 15 | Academic Simulation Banner | Persistent visual warnings that donations are simulated and no real funds are used | M3 | Survey |
| 16 | Data Minimization UI | Donation forms requesting only amount; zero card/banking/DNI fields | M3 | Survey |
| 17 | Responsive Design & Accessibility | WCAG 2.2 AA compliant UI, 375px mobile responsiveness, keyboard navigable | M3 | Survey |
| 18 | MFA Interactive UI Flow | TOTP challenge prompts during login for privileged administrative roles | M3 | Survey |
| 19 | Git Repository Initialization | Local repo initialized and connected to `vhanccos/secure-donations-2026` | M4 | Survey |
| 20 | Team Collaborative Flow | Feature branches, attributed commits for 4 members (Vladimir Hancco, Jean Chara, Jeanpier Valera, Gonzalo Layme), PRs | M4 | Survey |
| 21 | GitHub Actions CI Pipeline | Automated workflow for linting, typechecking, tests, and build checks | M4 | Survey |
| 22 | E2E Test Suite (Tiers 1-4) | Comprehensive test harness executing test scenarios T01 to T14 and edge cases | Test Track & M5 | Survey |
| 23 | IAM Least Privilege Guardrail (T10) | Read-only Lambdas denied write permissions (`AccessDeniedException`) | M1 & M5 | Survey |
| 24 | Tier 5 Adversarial Coverage Hardening | White-box stress testing, race-condition generators, and boundary validation | M5 | Survey |
| 25 | Typst Report Update & Compilation | `INFORME_LAB04_ZERO_TRUST.typ` compiled cleanly with Typst 0.15.1 | M6 | Survey |
| 26 | Genuine Execution Evidence | 24 report screenshots populated with real terminal, AWS, and UI captures | M6 | Survey |

---

## Milestones

| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| Test | E2E Testing Track | Independent requirement-driven test suite (Tiers 1-4, T01-T14), runner, `TEST_READY.md` | none | DONE |
| M1 | Cloud Infrastructure & SAM Deployment | `template.yaml`, DynamoDB tables, Cognito, API Gateway PEP, deploy to AWS `us-east-2` | none | DONE |
| M2 | Serverless Backend & Atomic Idempotency | TypeScript Lambdas (HU-01..09, 11), Zod schemas, TransactWriteItems, audit logging | M1 | DONE |
| M3 | Frontend SPA & Browser Security | React 19, Tailwind CSS, in-memory tokens, simulation banner, MFA UI | M1 | DONE |
| M4 | GitHub Repo & Collaborative Flow | GitHub repo `secure-donations-2026`, 4-member branches, commits, PRs, GitHub Actions CI | M1, M2, M3 | DONE |
| M5 | Final Milestone: E2E Verification & Adversarial Hardening | Pass 100% of E2E test suite (Tiers 1-4, T01-T14) + Tier 5 adversarial hardening | M2, M3, Test | DONE |
| M6 | Technical Report & Typst Compilation | Update `INFORME_LAB04_ZERO_TRUST.typ` with real evidence screenshots, compile PDF | M4, M5 | DONE |

---

## Interface Contracts

### 1. HTTP API Gateway ↔ Lambda Backend
- **Format**: API Gateway HTTP API Payload Format Version 2.0.
- **Authorization Context**: Injected at `requestContext.authorizer.jwt`:
  - `claims.sub`: Unique user identifier (UUID).
  - `claims["cognito:groups"]`: String or Array of group names (`DONANTE`, `GESTOR`, `AUDITOR`).
  - `claims.scope`: Space-delimited string of granted OAuth scopes.
- **Response Format**:
  ```json
  {
    "statusCode": 200,
    "headers": {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*"
    },
    "body": "{\"data\": ...}"
  }
  ```
- **Error Response Format**:
  ```json
  {
    "code": "BAD_REQUEST | UNAUTHORIZED | FORBIDDEN | NOT_FOUND | CONFLICT | INTERNAL_ERROR",
    "message": "Descriptive message",
    "requestId": "api-request-uuid"
  }
  ```

### 2. Backend ↔ DynamoDB Idempotency Contract
- **Idempotency Key**: Passed via HTTP Header `Idempotency-Key` (UUID regex validated).
- **Partition Key**: `${donorSub}#createDonation#${idempotencyKey}`.
- **TransactWriteItems**:
  1. `Put` in `Idempotency` conditional on `attribute_not_exists(pk)`.
  2. `Put` in `Donations` conditional on `attribute_not_exists(donationId)`.
- **Payload Hash**: `SHA-256(JSON.stringify(normalizedBody))`. Replay with identical hash returns cached 201; differing hash returns 409 Conflict.

### 3. Backend ↔ Frontend Contract
- **Authentication**: Authorization Code Grant with PKCE. Tokens received from Cognito token endpoint stored in volatile React state.
- **Endpoints**:
  - `GET /v1/projects`: Public project list.
  - `GET /v1/projects/{id}`: Public project details.
  - `GET /v1/projects/{id}/stats`: Public aggregated statistics.
  - `POST /v1/projects`: Create project draft (Gestor).
  - `PATCH /v1/projects/{id}/publish`: Publish project (Gestor).
  - `POST /v1/donations`: Create donation intention (Donante).
  - `POST /v1/donations/{id}/simulate`: Confirm/reject simulation (Donante).
  - `GET /v1/donations/me`: Private donor history (Donante).
  - `GET /v1/audit`: Audit event queries (Auditor).

---

## Code Layout & Write Boundaries

To ensure clean isolation and prevent concurrent worker file collisions:

```
/home/vlad/tmp/lab04/
├── template.yaml                   # Owned exclusively by M1 (Cloud Infrastructure)
├── samconfig.toml                  # Owned exclusively by M1
├── backend/                        # Owned exclusively by M2 (Serverless Backend)
│   ├── package.json
│   ├── tsconfig.json
│   ├── src/
│   │   ├── auth/                   # PDP authorization helpers
│   │   ├── common/                 # DynamoDB client, response helpers, logging
│   │   ├── projects/               # Project catalog, creation, publish handlers
│   │   ├── donations/              # Donation intention, simulation, history handlers
│   │   └── audit/                  # Audit event logging & query handlers
│   └── tests/                      # Backend unit tests
├── frontend/                       # Owned exclusively by M3 (Frontend SPA)
│   ├── package.json
│   ├── vite.config.ts
│   ├── src/
│   │   ├── components/             # UI components (Banner, Layout, Modals)
│   │   ├── context/                # In-memory AuthContext (Zero Trust)
│   │   ├── pages/                  # Catalog, Project Detail, History, Admin
│   │   └── services/               # API clients
├── tests/                          # Owned exclusively by Test Track Orchestrator
│   ├── package.json
│   ├── e2e/                        # Opaque-box E2E test suites (Tiers 1-4, T01-T14)
│   └── run-all-tests.sh            # Global test runner
├── .github/                        # Owned exclusively by M4 (GitHub & CI)
│   └── workflows/
│       └── ci.yml                  # GitHub Actions CI workflow
├── informe/                        # Owned exclusively by M6 (Report & Documentation)
│   ├── INFORME_LAB04_ZERO_TRUST.typ
│   ├── INFORME_LAB04_ZERO_TRUST.pdf
│   └── screenshots/                # Real execution captures (001 to 024)
└── TEST_INFRA.md, TEST_READY.md    # Test Track deliverables
```
