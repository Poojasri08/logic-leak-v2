\# Day 18 – Security Verification



\## Objective



The goal of Day 18 was to perform fresh security verification of the authentication, authorization, challenge progression, input validation, and reward logic implemented in Logic Leak 2.0.



This verification used a fresh test account and the running local application.



\## Repository Hardening



| Check | Result |

|---|---|

| Runtime SQLite database tracked by Git | Fixed |

| Database removed from Git tracking | PASS |

| SQLite database remains locally available for runtime use | PASS |

| `.gitignore` blocks `.db`, `.db-shm`, and `.db-wal` files | PASS |

| Working tree clean after verification | PASS |



Commit:



`ac6c5c9 Day 18: remove tracked runtime database`



\## Fresh Authentication Verification



Fresh test account:



\- User ID: 23

\- Username: `day18verify`



| Test | Expected Result | Result |

|---|---|---|

| Fresh signup | Account created | PASS |

| Login with valid credentials | JWT returned | PASS |

| Protected `/api/progress` with JWT | Authenticated progress returned | PASS |

| `/api/auth/me` with JWT | Correct authenticated user returned | PASS |

| Request without token | 401 – Access token required | PASS |

| Request with invalid token | 403 – Invalid or expired token | PASS |



Authenticated identity:



\- User ID: 23

\- Username: `day18verify`



\## Authorization Verification



The `/api/progress` endpoint uses the authenticated database identity from `req.user.userId`.



The implementation does not trust a client-supplied `user\_id`.



Fresh verification returned only the progress belonging to user 23.



Result: PASS



\## Challenge Verification



Challenge 1 was accessed successfully using the authenticated user.



Challenge:



\- ID: 1

\- Name: Bank Transfer



\### Tier 1 Verification



A correct Tier 1 answer was submitted.



Expected:



\- Correct answer

\- 30 points awarded

\- Tier 1 marked completed



Result:



`correct: true`



`points: 30`



Progress after submission:



\- Challenge 1 score: 30

\- Tier 1: completed

\- Tier 2: not completed

\- Tier 3: not completed



Result: PASS



\## Duplicate Reward Verification



The same Tier 1 answer was submitted again after Tier 1 was already completed.



Result:



\- `correct: true`

\- `points: 0`

\- Message: `Tier 1 already completed`



The stored score remained 30.



Result: PASS



\## Challenge Progression Verification



\### Tier 3 Bypass



Tier 3 was attempted before completing Tier 2.



Result:



\- `correct: false`

\- `points: 0`

\- Message: `Complete Tier 1 and Tier 2 first`



Result: PASS



\### Invalid Tier 2 Step



Tier 2 was submitted with an invalid step value.



Result:



`Invalid Tier 2 step`



Result: PASS



\## Input Validation Verification



An empty/whitespace-only answer was submitted.



Result:



`Answer cannot be empty`



Result: PASS



\## Final Progress State



Final verified progress for `day18verify`:



| Challenge | Score | Completed | Tier 1 | Tier 2 | Tier 3 |

|---|---:|---:|---:|---:|---:|

| Challenge 1 | 30 | 0 | 1 | 0 | 0 |



Rejected security test attempts did not modify the stored score or completion state.



\## Conclusion



Day 18 fresh security verification confirmed that the existing authentication, authorization, challenge progression, input validation, and duplicate reward protections continued to work correctly in the local application.



Repository hardening also confirmed that the runtime SQLite database is no longer tracked by Git and is protected by `.gitignore`.

