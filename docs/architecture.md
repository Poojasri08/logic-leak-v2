# Logic Leak 2.0 - Architecture

## Overview

Logic Leak 2.0 uses a frontend-backend architecture.

The frontend is responsible for the user interface, challenge interaction, answer submission, scoring display, and completion screen.

The backend provides challenge data through an API and handles the server-side challenge logic.

## Architecture

```text
User
  │
  ▼
React Frontend
  │
  │ HTTP Request
  ▼
Node.js + Express Backend
  │
  ▼
Challenge Data
