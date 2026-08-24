# Logic Leak 2.0 - Requirements

## 1. Project Overview

Logic Leak 2.0 is an interactive cybersecurity challenge platform designed to help users practice secure code review and vulnerability identification.

Users analyze vulnerable code through a series of security challenges and progress through three tiers.

## 2. Functional Requirements

### FR1 - Challenge Loading

The system shall load challenge data from the backend API.

### FR2 - Vulnerability Identification

The system shall allow users to identify the primary vulnerability in a challenge.

### FR3 - Vulnerability Explanation

The system shall allow users to explain why the identified vulnerability exists.

### FR4 - Secure Fix

The system shall allow users to provide or describe an appropriate secure fix.

### FR5 - Edge Case Analysis

The system shall allow users to identify an additional security edge case.

### FR6 - Answer Validation

The system shall validate submitted answers against the expected security concepts.

### FR7 - Scoring

The system shall calculate scores for each completed tier.

- Tier 1: 30 points
- Tier 2: 30 points
- Tier 3: 40 points
- Maximum per challenge: 100 points
- Maximum for 3 challenges: 300 points

### FR8 - Challenge Navigation

The system shall allow users to move through multiple challenges sequentially.

### FR9 - Progress Tracking

The system shall maintain the user's current challenge, tier, and score during gameplay.

### FR10 - Completion

The system shall display a completion screen with the user's final score after all challenges are completed.

### FR11 - Error Handling

The system shall display appropriate error messages when challenge data cannot be loaded or an API request fails.

### FR12 - Loading State

The system shall display an appropriate loading state while retrieving challenge data.

## 3. Non-Functional Requirements

### Performance

The application should load challenges efficiently and provide responsive interactions.

### Usability

The interface should be simple enough for users to understand the challenge flow without additional instructions.

### Security

The application should avoid exposing sensitive configuration or credentials in the frontend or repository.

### Maintainability

The frontend and backend should remain separated to make future development easier.

### Scalability

The challenge system should allow additional challenges and vulnerability categories to be added without major changes to the existing architecture.

### Responsiveness

The interface should work across common desktop and mobile screen sizes.

## 4. Current Scope

The current version focuses on:

- SQL Injection
- Secure coding
- Input validation
- Code-review thinking
- Edge-case analysis

## 5. Future Scope

Future versions may include:

- Authentication
- Leaderboards
- Persistent user progress
- Additional vulnerability categories
- Difficulty levels
- Challenge analytics
- More detailed security explanations