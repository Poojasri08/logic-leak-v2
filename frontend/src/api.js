const API_URL =
  import.meta.env.VITE_API_URL ||
  "http://localhost:5000"

export class ApiError extends Error {
  constructor(message, status) {
    super(message)
    this.name = "ApiError"
    this.status = status
  }
}

export function isAuthError(error) {
  return (
    error instanceof ApiError &&
    error.status === 401
  )
}

export async function apiRequest(
  path,
  {
    method = "GET",
    body,
  } = {}
) {
  const headers = {}

  if (body !== undefined) {
    headers["Content-Type"] =
      "application/json"
  }

  let response

  try {
    response = await fetch(
      `${API_URL}${path}`,
      {
        method,
        headers,
        credentials: "include",
        body:
          body !== undefined
            ? JSON.stringify(body)
            : undefined,
      }
    )
  } catch {
    throw new ApiError(
      "Cannot reach the server. Check that the backend is running and try again.",
      0
    )
  }

  let data

  try {
    data = await response.json()
  } catch {
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