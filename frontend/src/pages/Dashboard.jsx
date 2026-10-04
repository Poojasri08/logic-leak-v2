import { useEffect, useState } from "react"
import { apiRequest, isAuthError } from "../api"

function Dashboard({ onChallenge, onLogout, onAuthError }) {
  const [challenges, setChallenges] = useState([])
  const [progressRows, setProgressRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [reloadKey, setReloadKey] = useState(0)

  const username =
    localStorage.getItem("logicLeakUsername") || ""

  /* =========================================
     LOAD CHALLENGES + PROGRESS
  ========================================= */

  useEffect(() => {
    let cancelled = false

    async function loadDashboard() {
      setLoading(true)
      setError("")

      try {
        const [challengeData, progressData] =
          await Promise.all([
            apiRequest("/api/challenges"),
            apiRequest("/api/progress", { auth: true }),
          ])

        if (cancelled) {
          return
        }

        if (
          !Array.isArray(challengeData) ||
          !Array.isArray(progressData.progress)
        ) {
          throw new Error(
            "The server sent data in an unexpected format."
          )
        }

        setChallenges(
          [...challengeData].sort(
            (a, b) => Number(a.id) - Number(b.id)
          )
        )
        setProgressRows(progressData.progress)
      } catch (error) {
        if (cancelled) {
          return
        }

        if (isAuthError(error)) {
          onAuthError()
          return
        }

        setError(
          error.message ||
            "Unable to load your dashboard."
        )
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadDashboard()

    return () => {
      cancelled = true
    }
  }, [reloadKey, onAuthError])

  /* =========================================
     STATES
  ========================================= */

  if (loading) {
    return (
      <main className="dashboard-page">
        <div className="dashboard-loading" role="status">
          Loading your learning progress...
        </div>
      </main>
    )
  }

  if (error) {
    return (
      <main className="dashboard-page">
        <div className="dashboard-error" role="alert">
          <p>{error}</p>

          <button
            type="button"
            onClick={() =>
              setReloadKey((count) => count + 1)
            }
          >
            Try again
          </button>

          <button type="button" onClick={onLogout}>
            Log out
          </button>
        </div>
      </main>
    )
  }

  /* =========================================
     DERIVED DATA
     (display only - the server enforces the
     real rules on every request)
  ========================================= */

  const progressById = new Map(
    progressRows.map((row) => [
      Number(row.challenge_id),
      row,
    ])
  )

  function isCompleted(challengeId) {
    const row = progressById.get(Number(challengeId))

    return Boolean(row) && Number(row.completed) === 1
  }

  // Mirrors the server rule: challenge N needs N-1 completed.
  function isLocked(challengeId) {
    const id = Number(challengeId)

    return id > 1 && !isCompleted(id - 1)
  }

  function tiersDone(challengeId) {
    const row = progressById.get(Number(challengeId))

    if (!row) {
      return 0
    }

    return [
      row.tier1_completed,
      row.tier2_completed,
      row.tier3_completed,
    ].filter((value) => Number(value) === 1).length
  }

  const totalXP = progressRows.reduce(
    (sum, row) => sum + Number(row.score || 0),
    0
  )

  const maxXP = challenges.reduce(
    (sum, challenge) =>
      sum +
      Number(challenge.tier1?.points || 0) +
      Number(challenge.tier2?.points || 0) +
      Number(challenge.tier3?.points || 0),
    0
  )

  const completedCount = challenges.filter((challenge) =>
    isCompleted(challenge.id)
  ).length

  const currentChallenge = challenges.find(
    (challenge) =>
      !isCompleted(challenge.id) &&
      !isLocked(challenge.id)
  )

  const currentTiersDone = currentChallenge
    ? tiersDone(currentChallenge.id)
    : 0

  function handleOpen(challenge) {
    if (isLocked(challenge.id)) {
      return
    }

    onChallenge(challenge.id)
  }

  /* =========================================
     RENDER
  ========================================= */

  return (
    <main className="dashboard-page">

      {/* Navigation */}

      <header className="dashboard-header">

        <div className="dashboard-logo">
          <div className="dashboard-logo-mark">
            L
          </div>

          <span>LOGIC LEAK</span>
        </div>

        <div className="dashboard-header-stats">
          <span>⚡ {totalXP} XP</span>

          {username && <span>{username}</span>}

          <button type="button" onClick={onLogout}>
            Log out
          </button>
        </div>

      </header>

      {/* Main Content */}

      <section className="dashboard-content">

        {/* Welcome */}

        <div className="dashboard-welcome">

          <div>
            <span className="dashboard-eyebrow">
              YOUR LEARNING PATH
            </span>

            <h1>
              Keep building your
              security skills.
            </h1>

            <p>
              Find vulnerabilities, understand
              the risk, and learn how to fix
              insecure code.
            </p>
          </div>

        </div>

        {/* Stats */}

        <section className="dashboard-stats">

          <div className="dashboard-stat-card">
            <span className="dashboard-stat-icon">
              ⚡
            </span>

            <div>
              <strong>
                {totalXP} / {maxXP}
              </strong>

              <span>XP earned</span>
            </div>
          </div>

          <div className="dashboard-stat-card">
            <span className="dashboard-stat-icon">
              🎯
            </span>

            <div>
              <strong>
                {completedCount} / {challenges.length}
              </strong>

              <span>Challenges completed</span>
            </div>
          </div>

        </section>

        {challenges.length === 0 && (
          <div className="dashboard-empty" role="status">
            No challenges are available right now.
          </div>
        )}

        {/* Continue Learning */}

        {currentChallenge && (
          <section className="dashboard-section">

            <div className="dashboard-section-heading">
              <div>
                <span className="dashboard-eyebrow">
                  CONTINUE LEARNING
                </span>

                <h2>
                  Your next challenge
                </h2>
              </div>
            </div>

            <div className="continue-card">

              <div className="continue-number">
                {String(currentChallenge.id).padStart(
                  2,
                  "0"
                )}
              </div>

              <div className="continue-info">

                <span className="challenge-difficulty">
                  {currentChallenge.difficulty ||
                    "Security challenge"}
                </span>

                <h3>
                  {currentChallenge.title}
                </h3>

                <p>
                  {currentChallenge.description ||
                    "Find the vulnerability and work through the security fix."}
                </p>

                <div className="continue-progress">

                  <div className="progress-track">
                    <div
                      className="progress-fill"
                      style={{
                        width: `${Math.round(
                          (currentTiersDone / 3) * 100
                        )}%`,
                      }}
                    />
                  </div>

                  <span>
                    {currentTiersDone} of 3 steps complete
                  </span>

                </div>

              </div>

              <button
                type="button"
                className="continue-button"
                onClick={() =>
                  handleOpen(currentChallenge)
                }
              >
                {currentTiersDone > 0
                  ? "Continue"
                  : "Start"}
                <span>→</span>
              </button>

            </div>

          </section>
        )}

        {challenges.length > 0 && !currentChallenge && (
          <section className="dashboard-section">
            <div className="continue-card" role="status">
              <div className="continue-info">
                <h3>All challenges completed</h3>

                <p>
                  You finished every challenge. You can
                  review any of them below.
                </p>
              </div>
            </div>
          </section>
        )}

        {/* Challenges */}

        {challenges.length > 0 && (
          <section className="dashboard-section">

            <div className="dashboard-section-heading">

              <div>
                <span className="dashboard-eyebrow">
                  CHALLENGES
                </span>

                <h2>
                  Practice security
                </h2>
              </div>

              <span className="challenge-count">
                {challenges.length} challenges
              </span>

            </div>

            <div className="challenge-grid">

              {challenges.map((challenge) => {
                const completed = isCompleted(challenge.id)
                const locked = isLocked(challenge.id)
                const started =
                  !completed && tiersDone(challenge.id) > 0

                let buttonLabel = "Start challenge"

                if (completed) {
                  buttonLabel = "Review challenge"
                } else if (locked) {
                  buttonLabel = "Locked"
                } else if (started) {
                  buttonLabel = "Continue challenge"
                }

                return (
                  <article
                    className={[
                      "challenge-card",
                      completed ? "challenge-completed" : "",
                      locked ? "challenge-locked" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    key={challenge.id}
                  >

                    <div className="challenge-card-top">

                      <span className="challenge-number">
                        {String(
                          challenge.id
                        ).padStart(2, "0")}
                      </span>

                      {completed && (
                        <span className="challenge-check">
                          ✓
                        </span>
                      )}

                    </div>

                    <span className="challenge-difficulty">
                      {challenge.difficulty ||
                        "Security challenge"}
                    </span>

                    <h3>
                      {challenge.title}
                    </h3>

                    <p>
                      {challenge.description ||
                        "Identify the vulnerability, explain the risk, and apply the secure fix."}
                    </p>

                    {locked && (
                      <p className="challenge-lock-note">
                        Complete Challenge{" "}
                        {Number(challenge.id) - 1} first.
                      </p>
                    )}

                    <button
                      type="button"
                      className="challenge-card-button"
                      disabled={locked}
                      onClick={() => handleOpen(challenge)}
                    >
                      {buttonLabel}

                      {!locked && <span>→</span>}
                    </button>

                  </article>
                )
              })}

            </div>

          </section>
        )}

      </section>

    </main>
  )
}

export default Dashboard