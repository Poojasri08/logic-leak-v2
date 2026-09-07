# Day 12 – API Hardening

## Objective

The objective of Day 12 was to test and harden the Logic Leak backend API against invalid requests, malformed JSON, invalid challenge IDs, and unauthenticated access.

## Testing Performed

### 1. API Health Check

Endpoint:

`GET /`

Result:

`200 OK`

Response:

```json
{
  "message": "Logic Leak API is running"
}
```

This confirmed that the backend API was running correctly.

### 2. Challenge Listing

Endpoint:

`GET /api/challenges`

Result:

`200 OK`

The API successfully returned all three challenges:

1. Bank Transfer
2. Product Search
3. E-commerce Checkout

### 3. Individual Challenge

Endpoint:

`GET /api/challenges/1`

Result:

`200 OK`

Challenge 1 was successfully retrieved.

### 4. Invalid Challenge ID

Endpoint:

`GET /api/challenges/abc`

Result:

`400 Bad Request`

Response:

```json
{
  "message": "Invalid challenge ID"
}
```

The API correctly rejects non-numeric challenge IDs.

### 5. Non-existent Challenge

Endpoint:

`GET /api/challenges/9999`

Result:

`404 Not Found`

Response:

```json
{
  "message": "Challenge not found"
}
```

The API correctly handles requests for challenges that do not exist.

### 6. Unauthenticated Answer Submission

Endpoint:

`POST /api/challenges/1/answer`

Request without an authentication token.

Result:

`401 Unauthorized`

Response:

```json
{
  "message": "Access token required"
}
```

This confirmed that answer submission is protected by authentication middleware.

## Security Issue Discovered

During malformed JSON testing, the backend initially returned a raw parser error.

The response exposed implementation details including:

* `SyntaxError`
* JSON parser internals
* `body-parser`
* Node.js stack information
* Local filesystem paths

Exposing internal error details is poor security practice because it can reveal information about the server implementation and environment.

## Fix Implemented

A global Express error handler was added to `backend/server.js`.

The handler detects malformed JSON requests and returns a controlled API response instead of exposing internal stack traces and filesystem paths.

This improves:

* Error handling
* Information disclosure protection
* API consistency
* Security posture

## Validation

The modified backend was checked using:

```text
node --check .\backend\server.js
```

Result: Passed.

Whitespace/error checking was performed using:

```text
git diff --check
```

Result: Passed.

## Git Verification

Changes were committed with:

```text
security: harden API JSON error handling
```

Commit:

```text
a0a028e
```

Branch:

```text
day-12-api-hardening
```

The branch was successfully pushed to GitHub.

## Day 12 Result

Day 12 successfully improved the security and reliability of the Logic Leak API.

The backend now:

* Validates challenge IDs
* Rejects missing authentication
* Handles malformed JSON safely
* Prevents unnecessary internal error disclosure
* Returns controlled HTTP error responses
* Passes JavaScript syntax validation
* Has a clean Git working tree
* Has the security change committed and pushed

## Key Security Lesson

API security is not only about authentication and authorization. Error responses matter too.

A backend should provide enough information for legitimate clients to understand the failure without revealing unnecessary internal implementation details.
