import { useState } from "react"

function Signup({ onSignup, onBackToLogin }) {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const hasMinLength = password.length >= 8
  const hasLetter = /[A-Za-z]/.test(password)
  const hasNumber = /[0-9]/.test(password)

  async function handleSubmit(event) {
    event.preventDefault()
    setError("")

    const trimmedUsername = username.trim()

    if (!trimmedUsername || !password || !confirmPassword) {
      setError("Fill in all fields.")
      return
    }

    if (!hasMinLength || !hasLetter || !hasNumber) {
      setError("Password does not meet the requirements.")
      return
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.")
      return
    }

    setLoading(true)

    try {
      const response = await fetch(
        "http://localhost:5000/api/auth/signup",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            username: trimmedUsername,
            password,
          }),
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || "Signup failed.")
      }

      onSignup()
    } catch (error) {
      setError(
        error.message || "Unable to connect to server."
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="login-page">

      <div className="login-background-grid" />

      <section className="login-container">

        <div className="login-brand">
          <div className="login-logo">L</div>

          <div>
            <div className="login-brand-name">
              LOGIC LEAK
            </div>

            <div className="login-brand-subtitle">
              CODE SECURITY LAB
            </div>
          </div>
        </div>

        <div className="login-card">

          <div className="login-status">
            <span />
            SYSTEM ONLINE
          </div>

          <h1>Create account.</h1>

          <p className="login-description">
            Start your security learning journey.
            <br />
            Find the leak. Fix the logic.
          </p>

          <form onSubmit={handleSubmit}>

            <div className="login-field">
              <label>USERNAME</label>

              <input
                type="text"
                value={username}
                onChange={(event) =>
                  setUsername(event.target.value)
                }
                placeholder="Choose a username"
                autoComplete="username"
              />
            </div>

            <div className="login-field">
              <label>PASSWORD</label>

              <input
                type="password"
                value={password}
                onChange={(event) =>
                  setPassword(event.target.value)
                }
                placeholder="Create a password"
                autoComplete="new-password"
              />

              <div className="password-requirements">
                <div className={hasMinLength ? "valid" : ""}>
                  {hasMinLength ? "✓" : "○"} At least 8 characters
                </div>

                <div className={hasLetter ? "valid" : ""}>
                  {hasLetter ? "✓" : "○"} At least one letter
                </div>

                <div className={hasNumber ? "valid" : ""}>
                  {hasNumber ? "✓" : "○"} At least one number
                </div>
              </div>
            </div>

            <div className="login-field">
              <label>CONFIRM PASSWORD</label>

              <input
                type="password"
                value={confirmPassword}
                onChange={(event) =>
                  setConfirmPassword(event.target.value)
                }
                placeholder="Confirm your password"
                autoComplete="new-password"
              />

              {confirmPassword && (
                <div
                  className={
                    password === confirmPassword
                      ? "password-match valid"
                      : "password-match"
                  }
                >
                  {password === confirmPassword
                    ? "✓ Passwords match"
                    : "Passwords do not match"}
                </div>
              )}
            </div>

            {error && (
              <div className="login-error">
                <span>!</span>
                {error}
              </div>
            )}

            <button
              className="login-button"
              type="submit"
              disabled={loading}
            >
              {loading
                ? "CREATING ACCOUNT..."
                : "CREATE ACCOUNT"}
            </button>

          </form>

          <button
            type="button"
            className="login-button"
            onClick={onBackToLogin}
          >
            BACK TO LOGIN
          </button>

          <div className="login-footer">
            <span>SECURE ACCOUNT CREATION</span>
            <span>•</span>
            <span>LOGIC LEAK v2.0</span>
          </div>

        </div>

      </section>

    </main>
  )
}

export default Signup