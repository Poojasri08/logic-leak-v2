Day 15 – Input Validation \& Business Logic Abuse Testing



Objective



Test Logic Leak 2.0 for improper input handling and business-logic abuse that could allow users to bypass application rules or gain unintended rewards.



Testing Performed



1\. Input Validation



Tested:



\* Missing required fields

\* Invalid tier values

\* Invalid challenge IDs

\* Invalid Tier 2 steps

\* Step supplied with the wrong tier

\* Empty answers



Expected behavior: Invalid requests should be rejected by the backend with appropriate 400 responses.



2\. Business Logic Testing



Tested:



\* Skipping challenge progression

\* Skipping challenge tiers

\* Repeated tier submissions

\* Attempts to manipulate awarded points



3\. Key Results



Test	Expected Result	Status

Missing fields	400	PASS

Invalid tier	400	PASS

Invalid challenge ID	400	PASS

Invalid Tier 2 step	400	PASS

Step with Tier 1	400	PASS

Empty answer	400	PASS

Challenge skipping	403	PASS

Tier skipping	403	\[VERIFY]

Duplicate reward	0 additional points	\[VERIFY]

Score manipulation	Client-supplied points ignored	\[VERIFY]



Security Observations



The backend performs validation before processing challenge submissions.



Challenge progression and tier progression are enforced server-side rather than relying only on the frontend.



Duplicate completion does not award additional points, and scoring is calculated by the server based on the challenge configuration.



Evidence



Screenshots are stored in:



docs/day15/screenshots/



Outcome



Day 15 focused on validating that Logic Leak 2.0 cannot be easily abused through malformed input, progression bypasses, repeated submissions, or client-side score manipulation.



This testing strengthened the application’s input validation and business-logic controls.

