import { useEffect, useState } from "react"

function Dashboard({ onChallenge }) {
  const [challenges, setChallenges] = useState([])
  const [progress, setProgress] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const token = localStorage.getItem("logicLeakToken")

  useEffect(() => {
    async function loadDashboard() {
      try {
        const headers = {
          Authorization: `Bearer ${token}`,
        }

        const [challengeResponse, progressResponse] =
          await Promise.all([
            fetch("http://localhost:5000/api/challenges", {
              headers,
            }),
            fetch("http://localhost:5000/api/progress", {
              headers,
            }),
          ])

        if (!challengeResponse.ok) {
          throw new Error("Unable to load challenges.")
        }

        if (!progressResponse.ok) {
          throw new Error("Unable to load progress.")
        }

        const challengeData =
          await challengeResponse.json()

        const progressData =
          await progressResponse.json()

        setChallenges(challengeData.challenges || [])
        setProgress(progressData)
      } catch (error) {
        setError(
          error.message ||
            "Unable to load your dashboard."
        )
      } finally {
        setLoading(false)
      }
    }

    loadDashboard()
  }, [token])

  if (loading) {
    return (
      <main className="dashboard-page">
        <div className="dashboard-loading">
          Loading your learning progress...
        </div>
      </main>
    )
  }

  if (error) {
    return (
      <main className="dashboard-page">
        <div className="dashboard-error">
          {error}
        </div>
      </main>
    )
  }

  const totalXP = progress?.totalXP || 0

  const completedChallenges =
    progress?.completedChallenges || 0

  const currentChallenge =
    challenges.find(
      (challenge) =>
        !progress?.completed?.includes(challenge.id)
    ) || challenges[0]

  const completionPercentage =
    challenges.length > 0
      ? Math.round(
          (completedChallenges /
            challenges.length) *
            100
        )
      : 0

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

        <nav className="dashboard-nav">
          <button className="dashboard-nav-active">
            Learn
          </button>

          <button>
            Progress
          </button>

          <button>
            Leaderboard
          </button>
        </nav>

        <div className="dashboard-header-stats">
          <span>⚡ {totalXP} XP</span>
          <span>🔥 0</span>
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
              <strong>{totalXP}</strong>
              <span>Total XP</span>
            </div>
          </div>

          <div className="dashboard-stat-card">
            <span className="dashboard-stat-icon">
              🔥
            </span>

            <div>
              <strong>0</strong>
              <span>Day streak</span>
            </div>
          </div>

          <div className="dashboard-stat-card">
            <span className="dashboard-stat-icon">
              🎯
            </span>

            <div>
              <strong>
                {completedChallenges} /{" "}
                {challenges.length}
              </strong>

              <span>Challenges completed</span>
            </div>
          </div>

        </section>

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
                  Find the vulnerability and
                  work through the security fix.
                </p>

                <div className="continue-progress">

                  <div className="progress-track">
                    <div
                      className="progress-fill"
                      style={{
                        width: `${completionPercentage}%`,
                      }}
                    />
                  </div>

                  <span>
                    {completionPercentage}%
                  </span>

                </div>

              </div>

              <button
                className="continue-button"
                onClick={() =>
                  onChallenge(currentChallenge.id)
                }
              >
                Continue
                <span>→</span>
              </button>

            </div>

          </section>
        )}

        {/* Challenges */}

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

              const completed =
                progress?.completed?.includes(
                  challenge.id
                )

              return (
                <article
                  className={`challenge-card ${
                    completed
                      ? "challenge-completed"
                      : ""
                  }`}
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
                    Identify the vulnerability,
                    explain the risk, and apply
                    the secure fix.
                  </p>

                  <button
                    className="challenge-card-button"
                    onClick={() =>
                      onChallenge(challenge.id)
                    }
                  >
                    {completed
                      ? "Review challenge"
                      : "Start challenge"}

                    <span>→</span>
                  </button>

                </article>
              )
            })}

          </div>

        </section>

      </section>

    </main>
  )
}

export default Dashboard