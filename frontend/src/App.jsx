import { useCallback, useEffect, useState } from "react"
import Login from "./pages/Login"
import Signup from "./pages/Signup"
import Dashboard from "./pages/Dashboard"
import Challenge from "./pages/Challenge"

const API_URL = "http://localhost:5000"

function clearSession() {
  localStorage.removeItem("logicLeakToken")
  localStorage.removeItem("logicLeakUsername")
}

function App() {
  const hasStoredToken = Boolean(
    localStorage.getItem("logicLeakToken")
  )

  const [page, setPage] = useState("login")
  const [selectedChallenge, setSelectedChallenge] =
    useState(null)

  // "checking" = validating a stored token
  // "ready"    = safe to render a page
  // "error"    = server unreachable, offer retry
  const [sessionStatus, setSessionStatus] = useState(
    hasStoredToken ? "checking" : "ready"
  )

  const [notice, setNotice] = useState(null)
  const [retryCount, setRetryCount] = useState(0)

  /* =========================================
     RESTORE SESSION (validate the token)
  ========================================= */

  useEffect(() => {
    const token = localStorage.getItem("logicLeakToken")

    if (!token) {
      setSessionStatus("ready")
      return
    }

    let cancelled = false

    setSessionStatus("checking")

    fetch(`${API_URL}/api/auth/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((response) => {
        if (cancelled) {
          return
        }

        if (response.ok) {
          setPage("dashboard")
          setSessionStatus("ready")
          return
        }

        if (
          response.status === 401 ||
          response.status === 403
        ) {
          clearSession()
          setNotice({
            type: "error",
            message:
              "Your session has expired. Please log in again.",
          })
          setPage("login")
          setSessionStatus("ready")
          return
        }

        // Unexpected server response: do not destroy the
        // session, let the learner retry.
        setSessionStatus("error")
      })
      .catch(() => {
        if (!cancelled) {
          setSessionStatus("error")
        }
      })

    return () => {
      cancelled = true
    }
  }, [retryCount])

  /* =========================================
     HANDLERS
  ========================================= */

  function handleLogin() {
    setNotice(null)
    setPage("dashboard")
  }

  // The backend does not return a token on signup, so the
  // learner must log in after creating an account.
  function handleSignup() {
    setNotice({
      type: "success",
      message: "Account created. Please log in.",
    })
    setPage("login")
  }

  function handleLogout() {
    clearSession()
    setSelectedChallenge(null)
    setNotice(null)
    setPage("login")
  }

  // Called by Dashboard / Challenge when any API request
  // returns 401 or 403.
  const handleAuthError = useCallback(() => {
    clearSession()
    setSelectedChallenge(null)
    setNotice({
      type: "error",
      message:
        "Your session has expired. Please log in again.",
    })
    setPage("login")
  }, [])

  function handleChallenge(challengeId) {
    setSelectedChallenge(challengeId)
    setPage("challenge")
  }

  function handleDashboard() {
    setSelectedChallenge(null)
    setPage("dashboard")
  }

  /* =========================================
     RENDER
  ========================================= */

  if (sessionStatus === "checking") {
    return (
      <main style={{ padding: "3rem", textAlign: "center" }}>
        <p>Checking your session...</p>
      </main>
    )
  }

  if (sessionStatus === "error") {
    return (
      <main style={{ padding: "3rem", textAlign: "center" }}>
        <p>
          Could not reach the server. Your progress is safe.
        </p>

        <button
          type="button"
          onClick={() => setRetryCount((count) => count + 1)}
        >
          Try again
        </button>

        <button
          type="button"
          onClick={handleLogout}
          style={{ marginLeft: "0.75rem" }}
        >
          Log out
        </button>
      </main>
    )
  }

  if (page === "login") {
    return (
      <Login
        onLogin={handleLogin}
        onSignup={() => {
          setNotice(null)
          setPage("signup")
        }}
        notice={notice}
      />
    )
  }

  if (page === "signup") {
    return (
      <Signup
        onSignup={handleSignup}
        onLogin={() => {
          setNotice(null)
          setPage("login")
        }}
      />
    )
  }

  if (page === "dashboard") {
    return (
      <Dashboard
        onChallenge={handleChallenge}
        onLogout={handleLogout}
        onAuthError={handleAuthError}
      />
    )
  }

  if (page === "challenge") {
    return (
      <Challenge
        challengeId={selectedChallenge}
        onBack={handleDashboard}
        onLogout={handleLogout}
        onAuthError={handleAuthError}
      />
    )
  }

  return null
}

export default App