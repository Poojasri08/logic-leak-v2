Day 14 – Authorization Hardening



Objective



The goal of Day 14 was to strengthen the authentication and authorization boundary and verify that authenticated users can access only their own user-scoped data.



The focus was on:



\* Validating JWT-based identity

\* Verifying that the authenticated user still exists in the database

\* Rebuilding req.user from current database data

\* Ensuring progress data is scoped to the authenticated user

\* Testing unauthorized and invalid-token requests

\* Testing cross-user parameter tampering



⸻



1\. Authentication Identity Hardening



The authentication middleware first verifies the JWT.



After successful verification, the server checks whether the user ID from the token still exists in the database.



If the user exists, req.user is rebuilt from the current database record:



req.user = {

&#x20; userId: existingUser.id,

&#x20; username: existingUser.username,

}



This ensures that the application uses the current database identity for subsequent protected operations.



If the authenticated user no longer exists, the server rejects the request with 403 Forbidden.



⸻



2\. User-Scoped Progress



The /api/progress endpoint retrieves progress using the authenticated user’s ID.



The database query is scoped with:



WHERE user\_id = ?



The value supplied to this query comes from:



req.user.userId



The endpoint does not use a client-supplied userId parameter to determine whose progress is returned.



⸻



3\. Cross-User Authorization Test



A request was sent using the authenticated test account:



Username: day14authA

User ID: 19



The request attempted to access another user’s progress by adding:



?userId=13



The server continued to return the authenticated user’s data:



userId: 19

username: day14authA



This confirmed that the client-controlled userId parameter did not override the authenticated identity.



Evidence:



day-14-cross-user-progress-authorization.png



⸻



4\. Challenge Progress Authorization



The /api/challenges/:id/answer endpoint is protected by the authentication middleware.



Challenge progress is retrieved using both the authenticated user ID and challenge ID:



WHERE user\_id = ?

&#x20; AND challenge\_id = ?



The user ID comes from:



req.user.userId



The challenge answer processing therefore operates on progress belonging to the authenticated account.



Challenge order and tier order are also checked against progress belonging to that authenticated user.



This prevents a client from selecting another user’s progress record through a user-controlled ID.



⸻



5\. Security Test Results



Test	Expected Result	Result

Challenge answer without token	401 Unauthorized	PASS

Challenge answer with invalid token	403 Forbidden	PASS

Valid token with incorrect answer	200, 0 points	PASS

User A requests /api/progress	User A data	PASS

User A adds another user’s userId parameter	User A data remains	PASS

/api/auth/me with valid token	Authenticated identity	PASS

/api/auth/me without token	401 Unauthorized	PASS



⸻



6\. Evidence



The following screenshots were captured during Day 14 testing:



\* day-14-unauthenticated-answer-401.png

\* day-14-invalid-token-answer-403.png

\* day-14-cross-user-progress-authorization.png

\* day-14-authenticated-user-identity-200.png

\* day-14-unauthenticated-me-401.png



⸻



7\. Outcome



Day 14 strengthened the application’s authentication and authorization boundary.



The protected request flow is:



JWT

&#x20; ↓

JWT Verification

&#x20; ↓

Database User Verification

&#x20; ↓

Trusted req.user

&#x20; ↓

User-Scoped Database Queries

&#x20; ↓

Authorized Response



The security tests confirmed that:



\* Missing credentials are rejected.

\* Invalid JWTs are rejected.

\* Authenticated users can access their own protected resources.

\* Client-supplied user IDs cannot override the authenticated identity in /api/progress.

\* Challenge progress is associated with the authenticated user.

\* /api/auth/me returns the current authenticated database identity.



Day 14 Status



Authorization hardening and security testing completed successfully.

