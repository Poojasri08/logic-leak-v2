# Logic Leak 2.0

> **Can You Spot the Leak?**

Logic Leak 2.0 is an interactive cybersecurity learning platform focused on secure code review, vulnerability identification, security reasoning, and understanding how security flaws can be prevented.

Users analyze vulnerable code, identify the security flaw, explain why it exists, propose a secure fix, and handle an edge case.

---

## Project Status

**Current Milestone: Phase 4 — Security & Architecture Audit Complete**

| Phase | Status |
|---|---|
| Phase 1 — Core Backend | ✅ Complete |
| Phase 2 — Learning / Game System | ✅ Complete |
| Phase 3 — Security Hardening & Regression Testing | ✅ Complete |
| Phase 4 — Security & Architecture Audit | ✅ Complete |
| Phase 5 — Security Remediation | ⏳ Next |
| Phase 6 — Production Hardening | ⏳ Planned |
| Phase 7 — Final QA & Security Validation | ⏳ Planned |
| Phase 8 — Deployment / Release | ⏳ Planned |

### Current Test Baseline

**112 passed · 0 failed · 112 total**

The regression suite covers authentication, authorization, challenge progression, input validation, XP integrity, JWT attack cases, information disclosure, leaderboard behavior, and streak logic.

---

## Features

- Vulnerability identification
- Vulnerability explanation and secure-fix reasoning
- Edge-case and boundary-condition challenges
- Sequential challenge progression
- Tier-based learning system
- Server-side answer validation
- XP-based scoring
- Level progression
- Streak tracking
- Protected user progress
- Authentication and authorization
- API-based challenge data
- Leaderboard
- Loading and error handling
- Completion and progress tracking

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

## Security Engineering

Security was treated as part of the application design rather than as a final testing step.

The project includes:

- JWT-based authentication
- Protected API endpoints
- Server-side user identity reconstruction
- User existence checks
- Cross-user authorization testing
- Challenge progression enforcement
- Tier progression enforcement
- Server-side XP calculation
- Input validation
- Invalid challenge and tier handling
- Wrong-answer handling
- Malformed JSON handling
- Oversized request handling
- Global API error handling
- Authentication failure handling
- Security regression testing

### Authentication

Protected endpoints require a valid authentication token.

The backend does not rely only on client-supplied identity information. The authenticated user is reconstructed and validated on the server before protected operations are performed.

JWT forgery and `alg:none` attack cases are included in the regression testing.

### Authorization

User progress is scoped to the authenticated user.

Cross-user access attempts were tested to verify that one user cannot modify another user's progress by supplying another user's ID.

### Business Logic Security

Challenge progression and reward logic are enforced server-side.

Testing included attempts involving:

- Skipping required challenges
- Skipping required tiers
- Invalid challenge IDs
- Invalid tiers
- Repeating completed tiers
- Client-controlled XP
- Client-controlled level
- Client-controlled streak
- Cross-user progress manipulation
- Incorrect answers
- Malformed requests

---

## Security Audit

A dedicated security and architecture audit was completed in Phase 4.

### Confirmed Vulnerability

#### A-04 — Concurrent Duplicate XP Reward

**Severity:** P2
**Status:** Confirmed

The challenge reward flow currently contains a race condition where concurrent requests can pass the pre-transaction completion check before the progress state is updated.

This means sequential duplicate-reward protection is working, but concurrent duplicate submissions require an atomic state transition.

The issue has been identified and is scheduled for remediation in Phase 5.

### Additional Hardening Findings

The audit also identified:

- JWT storage in `localStorage`
- Permissive CORS configuration
- Missing explicit SQLite foreign-key configuration in source
- Username enumeration behavior
- bcrypt password-length edge case requiring verification
- JWT algorithm allowlisting hardening
- Hardcoded development API URL
- Challenge answer and scoring information duplicated in frontend source

These findings are being tracked as security hardening work rather than being presented as confirmed vulnerabilities.

---

## Security Testing

The current regression suite contains **112 tests with 0 failures**.

### Authentication

- Signup
- Login
- Password validation
- Wrong-password handling
- Authentication-required endpoints
- Invalid tokens
- Non-Bearer authorization

### Authorization

- Cross-user access attempts
- User ID manipulation
- Protected progress endpoints
- Protected leaderboard endpoints
- Protected challenge submission

### JWT Security

- Forged token rejection
- Invalid signature rejection
- `alg:none` attack rejection

### Input Validation

- Invalid challenge IDs
- Invalid tiers
- Invalid steps
- Missing fields
- Wrong data types
- Empty answers
- Oversized answers
- Malformed JSON
- Oversized request bodies

### Business Logic

- Challenge ordering
- Tier ordering
- XP integrity
- Wrong-answer behavior
- Duplicate reward behavior
- Explanation/fix sequencing
- Level progression
- Streak behavior

### Information Disclosure

- Password/hash protection
- Leaderboard data exposure
- Public challenge response filtering
- Protection of challenge answers and secure code

---

## Known Testing Gaps

The current regression suite does not yet automatically test:

- Concurrent reward requests
- Expired JWTs
- Rate limiting
- CORS behavior
- Frontend security behavior

These gaps are part of the Phase 5 security remediation and testing roadmap.

---

## Security Architecture

```text
Frontend
   |
   | API Requests
   v
Express API
   |
   +-- Authentication
   |
   +-- Authorization
   |
   +-- Input Validation
   |
   +-- Business Logic
   |
   +-- XP / Progression
   |
   v
SQLite Database
