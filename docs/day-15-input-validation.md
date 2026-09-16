Day 15 – Input Validation \& Business Logic Abuse Testing



Objective



Test whether Logic Leak 2.0 properly validates API input and prevents users from bypassing application business rules.



Tests Performed



Test	Expected Result	Result

Missing tier/answer	HTTP 400	PASS

Invalid tier	HTTP 400	PASS

Invalid challenge ID	HTTP 400	PASS

Invalid Tier 2 step	HTTP 400	PASS

Step used with Tier 1	HTTP 400	PASS

Empty answer	HTTP 400	PASS

Challenge 3 before Challenge 2	HTTP 403	PASS

Tier 2 before Tier 1	HTTP 403	PASS

Duplicate Tier 1 reward	0 points	PASS

Client-supplied score manipulation	Fake points rejected/ignored	PASS



Key Security Checks



The answer submission API validates the authenticated user, challenge ID, tier, step, and answer before processing the request.



Challenge progression is enforced server-side, preventing users from directly accessing later challenges without completing the previous challenge.



Tier progression is also enforced server-side. Tier 2 requires Tier 1 completion, and Tier 3 requires both Tier 1 and Tier 2 completion.



Repeated completion of an already completed tier does not award additional points.



Client-supplied scoring values are not used to calculate rewards. Points are determined by the challenge configuration.



Result



All planned Day 15 input-validation and business-logic abuse tests passed.



No security issue requiring a code change was identified during this test cycle.



Evidence



Screenshots/results recorded for:



1\. Missing input validation

2\. Invalid tier

3\. Invalid challenge ID

4\. Invalid Tier 2 step

5\. Invalid step usage

6\. Empty answer

7\. Challenge-order bypass

8\. Tier-order bypass

9\. Duplicate reward prevention

10\. Score manipulation attempt

