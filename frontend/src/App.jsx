import { useCallback, useEffect, useState } from "react"
import Login from "./pages/Login"
import Signup from "./pages/Signup"
import Dashboard from "./pages/Dashboard"
import Challenge from "./pages/Challenge"
import { apiRequest } from "./api"

function App() {
  const [page, setPage] = useState("login")
  const [selectedChallenge, setSelectedChallenge] =
    useState(null)

  const [sessionStatus, setSessionStatus] =
    useState("checking")

  const [user, setUser] = useState(null)

  const [notice, setNotice] = useState(null)

  const [retryCount, setRetryCount] =
    useState(0)

  useEffect(() => {
    let cancelled = false

    async function checkSession() {
      try {
        const data = await apiRequest(
          "/api/auth/me"
        )

        if (cancelled) {
          return
        }

        setUser(data.user)
        setPage("dashboard")
        setSessionStatus("ready")
      } catch (error) {
        if (cancelled) {
          return
        }

        if (
          error.status === 401
        ) {
          setUser(null)
          setPage("login")
          setSessionStatus("ready")
          return
        }

        setSessionStatus("error")
      }
    }

    checkSession()

    return () => {
      cancelled = true
    }
  }, [retryCount])

  function handleLogin(loggedInUser) {
    setUser(loggedInUser)
    setNotice(null)
    setPage("dashboard")
  }

  function handleSignup() {
    setNotice({
      type: "success",
      message:
        "Account created. Please log in.",
    })

    setPage("login")
  }

  async function handleLogout() {
    try {
      await apiRequest(
        "/api/auth/logout",
        {
          method: "POST",
        }
      )
    } catch {
      // The local UI still clears even if the
      // backend is temporarily unreachable.
    } finally {
      setUser(null)
      setSelectedChallenge(null)
      setNotice(null)
      setPage("login")
    }
  }

  const handleAuthError = useCallback(() => {
    setUser(null)
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

  if (sessionStatus === "checking") {
    return (
      <main
        style={{
          padding: "3rem",
          textAlign: "center",
        }}
      >
        <p>Checking your session...</p>
      </main>
    )
  }

  if (sessionStatus === "error") {
    return (
      <main
        style={{
          padding: "3rem",
          textAlign: "center",
        }}
      >
        <p>
          Could not reach the server. Your
          progress is safe.
        </p>

        <button
          type="button"
          onClick={() =>
            setRetryCount(
              (count) => count + 1
            )
          }
        >
          Try again
        </button>

        <button
          type="button"
          onClick={handleLogout}
          style={{
            marginLeft: "0.75rem",
          }}
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
        username={user?.username || ""}
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
