Day 23: Signup Design \& Product Validation



Objective



Validate and improve the learner onboarding flow in Logic Leak 2.0.



The current platform supports login and authenticated challenge progression. A signup flow is required so that a new learner can create an account and start the learning journey without manual account creation.



Target Learner Flow



Signup → Login → Challenge 1 → Find Leak → Explain → Fix → Earn XP → Progress → Next Challenge



Signup Requirements



A new learner should be able to create an account using:



\* Username

\* Email

\* Password



Validation Requirements



The signup process should reject:



\* Missing required fields

\* Invalid email format

\* Empty or weak password

\* Duplicate username

\* Duplicate email



Validation errors should be clear and understandable to the learner.



Security Requirements



\* Passwords must never be stored as plain text.

\* Passwords must be securely hashed before storage.

\* Duplicate-account checks must not expose unnecessary account information.

\* User input must be validated on the server.

\* Authentication tokens must not be accepted without proper validation.

\* Signup must not allow creation of an account with malformed input.



Product Requirements



After successful signup:



1\. The learner receives a clear success response.

2\. The learner can proceed to login.

3\. The learner can access the challenge system after authentication.

4\. Progress should belong to the authenticated user.



Acceptance Criteria



\* New learner can create an account.

\* Invalid signup input is rejected.

\* Duplicate accounts are rejected.

\* Password is securely stored.

\* Successful signup allows login.

\* Newly registered user starts with the expected initial progress state.

\* Signup errors are understandable.

\* Existing login functionality continues to work.

\* Existing challenge progression is not broken.



Validation Plan



Test the signup flow with:



1\. Valid new account

2\. Missing username

3\. Missing email

4\. Invalid email

5\. Missing password

6\. Duplicate username

7\. Duplicate email

8\. Incorrect login after signup

9\. Correct login after signup

10\. Accessing protected endpoints after authentication



Day 23 Focus



The goal is not to add more challenges.



The goal is to make the existing learning experience usable by a new learner from the beginning.

