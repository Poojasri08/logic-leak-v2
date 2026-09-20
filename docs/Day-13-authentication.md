# Day 13 - Authentication & Progress Persistence

## Objective

Strengthen the **Logic Leak** authentication and progress system and verify that protected user data and challenge progression work correctly.

---

## Implemented

### Authentication

- Added user signup endpoint
- Added login endpoint
- Passwords are hashed using **bcrypt**
- JWT tokens are generated after successful login
- Protected routes require a valid JWT
- Added authenticated user verification through `/api/auth/me`

### Challenge Security

- Challenge submissions require authentication
- Users must complete challenges in order
- Users must complete tiers in order
- Repeated tier rewards are prevented

### Progress Persistence

- User progress is stored in **SQLite**
- Challenge completion status is persisted
- Tier completion status is persisted
- Scores are persisted
- Progress is restored when the user logs in again

### Session Handling

- JWT token is stored after successful login
- Logout removes authentication data from local storage
- Protected API requests send the JWT token

---

## Testing

| Test | Result |
|---|---|
| Signup | ✅ Passed |
| Login | ✅ Passed |
| JWT authentication | ✅ Passed |
| `/api/auth/me` | ✅ 200 |
| `/api/progress` | ✅ 200 |
| Challenge submission | ✅ Passed |
| Challenge order enforcement | ✅ 403 when locked |
| Tier order enforcement | ✅ Passed |
| Progress persistence | ✅ Passed |
| Duplicate reward prevention | ✅ Passed |
| Logout | ✅ Passed |

---

## Debugging

During testing, the progress endpoint initially returned:

```text
403 Invalid or expired token