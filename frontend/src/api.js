export const API_URL = "http://localhost:5000"

export class ApiError extends Error {
  constructor(message, status) {
    super(message)
    this.name = "ApiError"
    this.status = status
  }
}

// The backend uses 403 both for bad/expired tokens AND for rule
// violations such as "Complete Challenge 1 first". Only the first
// kind means the session is over.
const AUTH_FAILURE_MESSAGES = [
  "Access token required",
  "Invalid authorization format",
  "Invalid or expired token",
  "Authenticated user not found",
  "Invalid authenticated user",
]

export function getToken() {
  return localStorage.getItem("logicLeakToken")
}

export function isAuthError(error) {
  if (!(error instanceof ApiError)) {
    return false
  }

  if (error.status === 401) {
    return true
  }

  return (
    error.status === 403 &&
    AUTH_FAILURE_MESSAGES.includes(error.message)
  )
}

export async function apiRequest(
  path,
  { method = "GET", body, auth = false } = {}
) {
  const headers = {}

  if (body !== undefined) {
    headers["Content-Type"] = "application/json"
  }

  if (auth) {
    const token = getToken()

    if (token) {
      headers.Authorization = `Bearer ${token}`
    }
  }

  let response

  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  } catch (error) {
    throw new ApiError(
      "Cannot reach the server. Check that the backend is running and try again.",
      0
    )
  }

  let data = null

  try {
    data = await response.json()
  } catch (error) {
    data = null
  }

  if (!response.ok) {
    throw new ApiError(
      (data && data.message) ||
        `Request failed (${response.status}).`,
      response.status
    )
  }

  if (data === null) {
    throw new ApiError(
      "The server sent an unexpected response.",
      response.status
    )
  }

  return data
}