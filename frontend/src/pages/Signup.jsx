import { useState } from "react"
import { apiRequest } from "../api"

function Signup({ onSignup, onLogin }) {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setError("")

    if (!username.trim() || !password) {
      setError("Enter a username and password.")
      return
    }

    // Mirrors the server rule (password.length < 6 is rejected).
    if (password.length < 6) {
      setError("Password must be at least 6 characters.")
      return
    }

    setLoading(true)

    try {
      await apiRequest("/api/auth/signup", {
        method: "POST",
        body: {
          username: username.trim(),
          password,
        },
      })

      // The backend does not issue a token at signup.
      // App sends the learner to the login screen.
      if (onSignup) {
        onSignup()
      }
    } catch (error) {
      setError(
        error.message || "Unable to create your account."
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
            Start learning
            <span> security.</span>
          </h1>

          <p>
            Build your security skills by finding,
            understanding, and fixing vulnerable code.
          </p>
        </div>

        <div className="login-card">
          <div className="login-card-header">
            <span className="login-card-label">
              CREATE ACCOUNT
            </span>

            <span className="login-card-status">
              SECURE SIGNUP
            </span>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="login-field">
              <label htmlFor="signup-username">
                Username
              </label>

              <input
                id="signup-username"
                type="text"
                value={username}
                onChange={(event) =>
                  setUsername(event.target.value)
                }
                placeholder="Choose a username"
                autoComplete="username"
                disabled={loading}
              />
            </div>

            <div className="login-field">
              <label htmlFor="signup-password">
                Password
              </label>

              <input
                id="signup-password"
                type="password"
                value={password}
                onChange={(event) =>
                  setPassword(event.target.value)
                }
                placeholder="Create a password (6+ characters)"
                autoComplete="new-password"
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
                  ? "Creating account..."
                  : "Create account"}
              </span>

              {!loading && (
                <span aria-hidden="true">
                  →
                </span>
              )}
            </button>
          </form>

          <div className="login-signup">
            <span>Already have an account?</span>

            <button
              type="button"
              onClick={onLogin}
              disabled={loading}
            >
              Sign in
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
              <p>Learn why it matters.</p>
            </div>
          </div>

          <div className="login-feature">
            <span className="feature-number">
              03
            </span>

            <div>
              <strong>Fix</strong>
              <p>Apply the secure solution.</p>
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

export default Signup
