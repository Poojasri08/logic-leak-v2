# Logic Leak 2.0

> **Can You Spot the Leak?**

Logic Leak 2.0 is an interactive cybersecurity challenge platform designed to help users practice secure code review and vulnerability identification.

Players analyze vulnerable code, identify the security flaw, explain the vulnerability, propose a secure fix, and handle an edge case.

## Features

- 🔍 Vulnerability Identification
  - Find the security flaw in vulnerable code.
- 🧠 Explain + Fix
  - Explain why the vulnerability exists.
  - Describe a secure approach to fixing it.
- 🎯 Edge Case Challenges
  - Think about unexpected inputs and boundary conditions.
- 🏆 Scoring System
  - Tier 1: 30 points
  - Tier 2: 30 points
  - Tier 3: 40 points
  - 100 points per challenge
  - 300 points maximum.
- 🔄 Challenge Navigation
  - Complete multiple challenges sequentially.
- 📡 API-Based Challenge Data
  - Challenges are loaded from the backend API.
- ⚡ Loading & Error Handling
  - Displays appropriate states while loading or when the API is unavailable.
- ✅ Answer Validation
  - Validates vulnerability findings, explanations, fixes, and edge-case answers.
- 🏁 Completion Screen
  - Displays challenge completion and final score.

## Challenge Structure

Each challenge contains three tiers:

| Tier | Task | Points |
|---|---|---:|
| Tier 1 | Identify the vulnerability | 30 |
| Tier 2 | Explain the vulnerability + secure fix | 30 |
| Tier 3 | Solve the edge case | 40 |
| **Total** | **Per challenge** | **100** |

With 3 challenges, the maximum score is:

**300 points**

## Tech Stack

### Frontend

- React
- Vite
- JavaScript
- CSS

### Backend

- Node.js
- Express
- REST API

### Development Tools

- Git
- GitHub
- ESLint

## Project Structure

```text
logic-leak-v2/
│
├── frontend/
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── vite.config.js
│
├── backend/
│   ├── server.js
│   ├── challenges.js
│   └── package.json
│
├── docs/
│
└── README.md
