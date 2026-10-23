# Logic Leak 2.0

> **Can You Spot the Leak?**

Logic Leak 2.0 is an interactive cybersecurity learning platform focused on secure code review, vulnerability identification, security reasoning, and secure coding practices.

Users analyze vulnerable code, identify the security flaw, explain why it exists, propose a secure fix, and handle an edge case.

---

## Project Status

**Current Milestone: Phase 9 - Production Readiness**

| Phase | Status |
|---|---|
| Phase 1 - Foundation | Complete |
| Phase 2 - Core Application | Complete |
| Phase 3 - Functional Security | Complete |
| Phase 4 - Security Architecture Audit | Complete |
| Phase 5 - Security Hardening | Complete |
| Phase 6 - Learning Experience | Complete |
| Phase 7 - Architecture Cleanup | Complete |
| Phase 8 - Security Hardening | Complete |
| Phase 9 - Production Readiness | In Progress |

Phase 9 currently includes environment-based frontend API configuration, environment templates, production build validation, frontend linting, and backend security regression validation.

---

## Features

- Interactive secure-code learning challenges
- Three-tier challenge progression
- Vulnerability identification
- Vulnerability explanation
- Secure-fix reasoning
- Edge-case challenges
- Sequential challenge progression
- Server-side answer validation
- Server-authoritative XP calculation
- Level progression
- Daily streak tracking
- Persistent user progress
- Authentication and authorization
- Protected API endpoints
- Leaderboard
- Loading and error handling
- Responsive frontend
- Production build support

---

## Challenge Structure

Each challenge contains three tiers:

| Tier | Task | Points |
|---|---|---:|
| Tier 1 | Identify the vulnerability | 30 |
| Tier 2 | Explain the vulnerability and secure fix | 30 |
| Tier 3 | Solve the edge case | 40 |
| **Total** | **Per challenge** | **100** |

There are currently **3 challenges**, giving a maximum score of **300 XP**.

---

## Technology Stack

### Frontend

- React 19
- Vite 8
- JavaScript
- ESLint

### Backend

- Node.js
- Express 5
- JWT
- bcrypt
- express-rate-limit
- CORS
- dotenv

### Database

- SQLite
- better-sqlite3
- WAL journal mode

---

## Architecture

```text
                    User
                      |
                      v
              React Frontend
                      |
              HTTPS / API Requests
                      |
                      v
              Express API
                      |
        +-------------+-------------+
        |             |             |
        v             v             v
 Authentication   Validation   Business Logic
        |                           |
        +-------------+-------------+
                      |
                      v
              Progress / XP Logic
                      |
                      v
               SQLite Database
