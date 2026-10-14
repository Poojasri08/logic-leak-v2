import { useState } from "react"
import { apiRequest } from "../api"

function Login({ onLogin, onSignup, notice }) {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setError("")

    if (!username.trim() || !password) {
      setError("Enter your username and password.")
      return
    }

    setLoading(true)

    try {
      const data = await apiRequest(
        "/api/auth/login",
        {
          method: "POST",
          body: {
            username: username.trim(),
            password,
          },
        }
      )

      if (
        !data.userId ||
        typeof data.username !== "string"
      ) {
        throw new Error(
          "The server sent an unexpected login response."
        )
      }

      onLogin({
        id: data.userId,
        username: data.username,
      })
    } catch (error) {
      setError(
        error.message || "Unable to log in."
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="login-page">
      <section className="login-content">
        <header className="login-header">
          <div className="login-logo-mark">
            L
          </div>

          <div className="login-logo-text">
            LOGIC LEAK
          </div>
        </header>

        <div className="login-intro">
          <span className="login-eyebrow">
            SECURITY LEARNING PLATFORM
          </span>

          <h1>
            Learn to spot
            <span> insecure code.</span>
          </h1>

          <p>
            Find vulnerabilities, understand why
            they happen, and learn how to fix them.
          </p>
        </div>

        <div className="login-card">
          <div className="login-card-header">
            <span className="login-card-label">
              SECURE ACCESS
            </span>

            <span className="login-card-status">
              AUTHENTICATED SESSION
            </span>
          </div>

          <form onSubmit={handleSubmit}>
            {notice && !error && (
              <div
                className={
                  notice.type === "success"
                    ? "login-notice"
                    : "login-error"
                }
                role={
                  notice.type === "success"
                    ? "status"
                    : "alert"
                }
              >
                {notice.message}
              </div>
            )}

            <div className="login-field">
              <label htmlFor="username">
                Username
              </label>

              <input
                id="username"
                type="text"
                value={username}
                onChange={(event) =>
                  setUsername(event.target.value)
                }
                placeholder="Enter your username"
                autoComplete="username"
                disabled={loading}
              />
            </div>

            <div className="login-field">
              <label htmlFor="password">
                Password
              </label>

              <input
                id="password"
                type="password"
                value={password}
                onChange={(event) =>
                  setPassword(event.target.value)
                }
                placeholder="Enter your password"
                autoComplete="current-password"
                disabled={loading}
              />
            </div>

            {error && (
              <div
                className="login-error"
                role="alert"
              >
                <span aria-hidden="true">!</span>
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              className="login-button"
              disabled={loading}
            >
              <span>
                {loading
                  ? "Signing in..."
                  : "Continue"}
              </span>

              {!loading && (
                <span aria-hidden="true">
                  →
                </span>
              )}
            </button>
          </form>

          <div className="login-signup">
            <span>New to Logic Leak?</span>

            <button
              type="button"
              onClick={onSignup}
              disabled={loading}
            >
              Create an account
            </button>
          </div>
        </div>

        <div className="login-features">
          <div className="login-feature">
            <span className="feature-number">
              01
            </span>

            <div>
              <strong>Find</strong>
              <p>Spot the vulnerability.</p>
            </div>
          </div>

          <div className="login-feature">
            <span className="feature-number">
              02
            </span>

            <div>
              <strong>Understand</strong>
              <p>
                Explain why it is dangerous.
              </p>
            </div>
          </div>

          <div className="login-feature">
            <span className="feature-number">
              03
            </span>

            <div>
              <strong>Fix</strong>
              <p>Learn the secure solution.</p>
            </div>
          </div>
        </div>

        <footer className="login-footer">
          LOGIC LEAK{" "}
          <span aria-hidden="true">·</span>{" "}
          INTERACTIVE SECURITY LEARNING
        </footer>
      </section>
    </main>
  )
}

export default Login