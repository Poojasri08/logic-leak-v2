import { useEffect, useState } from "react"
import {
  ApiError,
  apiRequest,
} from "../api"

function Challenge({ onLogout }) {
  const [challengeIndex, setChallengeIndex] =
    useState(0)
  const [answer, setAnswer] = useState("")
  const [result, setResult] = useState(null)
  const [resultType, setResultType] =
    useState("")
  const [tier, setTier] = useState(1)

  const [score, setScore] = useState(0)

  const [apiChallenges, setApiChallenges] =
    useState([])
  const [loading, setLoading] =
    useState(true)
  const [apiError, setApiError] =
    useState("")

  const [tier2Explanation, setTier2Explanation] =
    useState("")
  const [tier2Fix, setTier2Fix] =
    useState("")
  const [tier2Step, setTier2Step] =
    useState(1)
  const [tier3Answer, setTier3Answer] =
    useState("")

  const [hintLevel, setHintLevel] =
    useState(0)

  /* =========================================
     LOAD CHALLENGES
  ========================================= */

  useEffect(() => {
    async function loadChallenges() {
      try {
        const data = await apiRequest(
          "/api/challenges"
        )

        setApiChallenges(data)
        setLoading(false)
      } catch (error) {
        console.error(error)

        setApiError(
          error.message ||
            "Failed to load challenges."
        )

        setLoading(false)
      }
    }

    loadChallenges()
  }, [])

  /* =========================================
     LOAD PROGRESS
  ========================================= */

  useEffect(() => {
    if (apiChallenges.length === 0) {
      return
    }

    async function loadInitialProgress() {
      try {
        const data = await apiRequest(
          "/api/progress"
        )

        const progress =
          data.progress || []

        const total = progress.reduce(
          (sum, item) =>
            sum + Number(item.score || 0),
          0
        )

        setScore(total)

        const firstIncompleteIndex =
          apiChallenges.findIndex(
            (challenge) => {
              const item =
                progress.find(
                  (entry) =>
                    Number(
                      entry.challenge_id
                    ) ===
                    Number(challenge.id)
                )

              return (
                !item ||
                Number(item.completed) !== 1
              )
            }
          )

        if (firstIncompleteIndex !== -1) {
          setChallengeIndex(
            firstIncompleteIndex
          )

          const currentProgress =
            progress.find(
              (entry) =>
                Number(
                  entry.challenge_id
                ) ===
                Number(
                  apiChallenges[
                    firstIncompleteIndex
                  ].id
                )
            )

          if (!currentProgress) {
            setTier(1)
          } else if (
            Number(
              currentProgress.tier1_completed
            ) !== 1
          ) {
            setTier(1)
          } else if (
            Number(
              currentProgress.tier2_completed
            ) !== 1
          ) {
            setTier(2)
          } else if (
            Number(
              currentProgress.tier3_completed
            ) !== 1
          ) {
            setTier(3)
          }
        } else {
          setChallengeIndex(
            apiChallenges.length - 1
          )

          setTier(4)
        }
      } catch (error) {
        console.error(error)

        if (
          error instanceof ApiError &&
          error.status === 401
        ) {
          return
        }

        setApiError(
          error.message ||
            "Failed to load progress."
        )
      }
    }

    loadInitialProgress()
  }, [apiChallenges])

  /* =========================================
     STATES
  ========================================= */

  if (loading) {
    return (
      <main className="learning-page">
        <div className="learning-loading">
          Preparing your lesson...
        </div>
      </main>
    )
  }

  if (apiError) {
    return (
      <main className="learning-page">
        <div className="learning-error">
          {apiError}
        </div>
      </main>
    )
  }

  if (apiChallenges.length === 0) {
    return (
      <main className="learning-page">
        <div className="learning-error">
          No lessons are available right now.
        </div>
      </main>
    )
  }

  const challenge =
    apiChallenges[challengeIndex]

  const totalChallenges =
    apiChallenges.length

  /* =========================================
     HELPERS
  ========================================= */

  function showResult(message, type) {
    setResult(message)
    setResultType(type)
  }

  function handleShowHint() {
    if (
      !challenge.hints ||
      challenge.hints.length === 0
    ) {
      return
    }

    if (
      hintLevel < challenge.hints.length
    ) {
      setHintLevel(
        (previous) => previous + 1
      )
    }
  }

  function handleAuthError(error) {
    if (
      error instanceof ApiError &&
      error.status === 401
    ) {
      showResult(
        "Your session has expired. Please log in again.",
        "error"
      )

      onLogout()

      return true
    }

    return false
  }

  async function loadProgress() {
    try {
      const data = await apiRequest(
        "/api/progress"
      )

      const total = (
        data.progress || []
      ).reduce(
        (sum, item) =>
          sum + Number(item.score || 0),
        0
      )

      setScore(total)
    } catch (error) {
      console.error(error)

      handleAuthError(error)
    }
  }

  /* =========================================
     TIER 1
  ========================================= */

  async function handleSubmit(event) {
    event.preventDefault()

    if (!answer.trim()) {
      showResult(
        "Enter the vulnerability you found.",
        "error"
      )
      return
    }

    try {
      const data = await apiRequest(
        `/api/challenges/${challenge.id}/answer`,
        {
          method: "POST",
          body: {
            tier: 1,
            answer: answer.trim(),
          },
        }
      )

      if (data.correct) {
        showResult(
          `Correct. You earned ${data.points} XP.`,
          "success"
        )

        setTier(2)
        setTier2Step(1)

        loadProgress()
      } else {
        showResult(
          "Not quite. Look carefully at how user input reaches the SQL query.",
          "error"
        )
      }
    } catch (error) {
      console.error(error)

      if (handleAuthError(error)) {
        return
      }

      showResult(
        error.message ||
          "Unable to validate your answer.",
        "error"
      )
    }
  }

  /* =========================================
     TIER 2
  ========================================= */

  async function handleTier2Submit(event) {
    event.preventDefault()

    const currentAnswer =
      tier2Step === 1
        ? tier2Explanation.trim()
        : tier2Fix.trim()

    if (!currentAnswer) {
      showResult(
        tier2Step === 1
          ? "Explain why the code is vulnerable."
          : "Describe how you would fix it.",
        "error"
      )

      return
    }

    try {
      const data = await apiRequest(
        `/api/challenges/${challenge.id}/answer`,
        {
          method: "POST",
          body: {
            tier: 2,
            step: tier2Step,
            answer: currentAnswer,
          },
        }
      )

      if (!data.correct) {
        showResult(
          tier2Step === 1
            ? "Your explanation needs to identify the vulnerability and its cause."
            : "Your fix should mention parameterized queries or prepared statements.",
          "error"
        )

        return
      }

      if (tier2Step === 1) {
        showResult(
          "Good explanation. Now apply the secure fix.",
          "success"
        )

        setTier2Step(2)
        return
      }

      showResult(
        `Correct. You earned ${data.points} XP.`,
        "success"
      )

      setTier(3)

      loadProgress()
    } catch (error) {
      console.error(error)

      if (handleAuthError(error)) {
        return
      }

      showResult(
        error.message ||
          "Unable to validate your answer.",
        "error"
      )
    }
  }

  /* =========================================
     TIER 3
  ========================================= */

  async function handleTier3Submit(event) {
    event.preventDefault()

    if (!tier3Answer.trim()) {
      showResult(
        "Enter your answer before continuing.",
        "error"
      )

      return
    }

    try {
      const data = await apiRequest(
        `/api/challenges/${challenge.id}/answer`,
        {
          method: "POST",
          body: {
            tier: 3,
            answer: tier3Answer.trim(),
          },
        }
      )

      if (data.correct) {
        showResult(
          `Challenge complete. You earned ${data.points} XP.`,
          "success"
        )

        setTier(4)

        loadProgress()
      } else {
        showResult(
          "Think about the edge case and the validation the application needs.",
          "error"
        )
      }
    } catch (error) {
      console.error(error)

      if (handleAuthError(error)) {
        return
      }

      showResult(
        error.message ||
          "Unable to validate your answer.",
        "error"
      )
    }
  }

  /* =========================================
     NEXT CHALLENGE
  ========================================= */

  function handleNextChallenge() {
    if (
      challengeIndex >=
      totalChallenges - 1
    ) {
      return
    }

    setChallengeIndex(
      (previous) => previous + 1
    )

    setTier(1)
    setAnswer("")
    setTier2Explanation("")
    setTier2Fix("")
    setTier2Step(1)
    setTier3Answer("")
    setHintLevel(0)
    setResult(null)
    setResultType("")

    loadProgress()
  }

  /* =========================================
     RENDER
  ========================================= */

  return (
    <main className="learning-page">

      {/* Navigation */}

      <header className="learning-nav">

        <div className="learning-brand">
          <div className="learning-brand-mark">
            L
          </div>

          <span>LOGIC LEAK</span>
        </div>

        <div className="learning-nav-right">

          <div className="learning-xp">
            <span>XP</span>
            <strong>{score}</strong>
          </div>

          <button
            type="button"
            onClick={onLogout}
            className="learning-logout"
          >
            Log out
          </button>

        </div>

      </header>

      {/* Lesson header */}

      <section className="lesson-header">

        <div className="lesson-header-inner">

          <div>
            <span className="lesson-label">
              WEB SECURITY
            </span>

            <div className="lesson-meta">
              Lesson {challenge.id} of{" "}
              {totalChallenges}
              <span>Â·</span>
              {challenge.difficulty}
            </div>

            <h1>
              {challenge.title}
            </h1>

            <p>
              Learn to identify, explain,
              and fix a security vulnerability.
            </p>
          </div>

          <div className="lesson-progress">

            <span>
              {tier >= 4
                ? "Complete"
                : `Step ${tier} of 3`}
            </span>

            <div className="lesson-progress-track">
              <div
                className="lesson-progress-fill"
                style={{
                  width:
                    tier >= 4
                      ? "100%"
                      : `${(tier / 3) * 100}%`,
                }}
              />
            </div>

          </div>

        </div>

      </section>

      {/* Learning path */}

      <section className="learning-path">

        <div
          className={
            tier >= 1
              ? "path-step active"
              : "path-step"
          }
        >
          <span>1</span>
          <div>
            <strong>Find</strong>
            <small>
              Spot the vulnerability
            </small>
          </div>
        </div>

        <div className="path-connector" />

        <div
          className={
            tier >= 2
              ? "path-step active"
              : "path-step"
          }
        >
          <span>2</span>
          <div>
            <strong>Explain & Fix</strong>
            <small>
              Understand the cause
            </small>
          </div>
        </div>

        <div className="path-connector" />

        <div
          className={
            tier >= 3
              ? "path-step active"
              : "path-step"
          }
        >
          <span>3</span>
          <div>
            <strong>Think deeper</strong>
            <small>
              Handle the edge case
            </small>
          </div>
        </div>

      </section>

      {/* Main lesson */}

      <section className="lesson-content">

        {/* Code */}

        <div className="lesson-code-card">

          <div className="lesson-card-header">

            <div>
              <span>THE CODE</span>
              <strong>challenge.js</strong>
            </div>

            <span className="language-tag">
              JavaScript
            </span>

          </div>

          <div className="code-window">

            <div className="code-lines">

              {challenge.code
                .split("\n")
                .map((_, index) => (
                  <span key={index}>
                    {index + 1}
                  </span>
                ))}

            </div>

            <pre>
              <code>
                {challenge.code}
              </code>
            </pre>

          </div>

        </div>

        {/* Task */}

        <div className="lesson-task-card">

          {tier === 1 && (
            <form onSubmit={handleSubmit}>

              <span className="task-step">
                STEP 1 Â· FIND
              </span>

              <h2>
                What is wrong with this code?
              </h2>

              <p className="task-description">
                Identify the security vulnerability
                you can see in the code above.
              </p>

              <input
                type="text"
                value={answer}
                onChange={(event) =>
                  setAnswer(event.target.value)
                }
                placeholder="Type the vulnerability..."
                autoComplete="off"
              />

              <div className="task-actions">

                <button
                  type="submit"
                  className="primary-action"
                >
                  Check answer
                  <span>â†’</span>
                </button>

              </div>

              {challenge.hints &&
                challenge.hints.length > 0 && (
                  <div className="learning-hint">

                    <div>
                      <strong>
                        Need a hint?
                      </strong>

                      <span>
                        {hintLevel > 0
                          ? `Hint ${hintLevel} of ${challenge.hints.length}`
                          : "Try solving it first"}
                      </span>
                    </div>

                    {hintLevel > 0 && (
                      <p>
                        {
                          challenge.hints[
                            hintLevel - 1
                          ]
                        }
                      </p>
                    )}

                    {hintLevel <
                      challenge.hints.length && (
                      <button
                        type="button"
                        onClick={handleShowHint}
                        className="hint-action"
                      >
                        {hintLevel === 0
                          ? "Show hint"
                          : "Show next hint"}
                        {" â†’"}
                      </button>
                    )}

                  </div>
                )}

            </form>
          )}

          {tier === 2 && (
            <form
              onSubmit={
                handleTier2Submit
              }
            >

              <span className="task-step">
                STEP 2 Â·{" "}
                {tier2Step === 1
                  ? "EXPLAIN"
                  : "FIX"}
              </span>

              <h2>
                {tier2Step === 1
                  ? "Why is this vulnerable?"
                  : "How would you fix it?"}
              </h2>

              <p className="task-description">
                {tier2Step === 1
                  ? "Explain what happens when user-controlled input reaches the database query."
                  : "Describe the secure approach you would use to prevent the vulnerability."}
              </p>

              {tier2Step === 1 ? (
                <textarea
                  value={tier2Explanation}
                  onChange={(event) =>
                    setTier2Explanation(
                      event.target.value
                    )
                  }
                  placeholder="Explain the vulnerability in your own words..."
                  rows="7"
                />
              ) : (
                <textarea
                  value={tier2Fix}
                  onChange={(event) =>
                    setTier2Fix(
                      event.target.value
                    )
                  }
                  placeholder="Describe the secure fix..."
                  rows="7"
                />
              )}

              <div className="task-actions">

                <button
                  type="submit"
                  className="primary-action"
                >
                  {tier2Step === 1
                    ? "Continue"
                    : "Check fix"}

                  <span>â†’</span>
                </button>

              </div>

            </form>
          )}

          {tier === 3 && (
            <form
              onSubmit={
                handleTier3Submit
              }
            >

              <span className="task-step">
                STEP 3 Â· THINK DEEPER
              </span>

              <h2>
                Test the edge case.
              </h2>

              <p className="task-description">
                {challenge.tier3.question}
              </p>

              <textarea
                value={tier3Answer}
                onChange={(event) =>
                  setTier3Answer(
                    event.target.value
                  )
                }
                placeholder="Explain what should happen and what validation is needed..."
                rows="7"
              />

              <div className="task-actions">

                <button
                  type="submit"
                  className="primary-action"
                >
                  Complete challenge
                  <span>â†’</span>
                </button>

              </div>

            </form>
          )}

          {tier === 4 && (
            <div className="lesson-complete">

              <div className="complete-mark">
                ✓
              </div>

              <span className="task-step">
                LESSON COMPLETE
              </span>

              <h2>
                You found the flaw.
              </h2>

              <p>
                You identified the vulnerability,
                explained the risk, and worked
                through the secure fix.
              </p>

              <div className="earned-xp">
                <span>YOUR XP</span>
                <strong>{score}</strong>
              </div>

              {challengeIndex <
                totalChallenges - 1 ? (
                <button
                  type="button"
                  className="primary-action"
                  onClick={
                    handleNextChallenge
                  }
                >
                  Next lesson
                  <span>→</span>
                </button>
              ) : (
                <div className="course-complete">
                  <strong>
                    Learning path complete
                  </strong>

                  <span>
                    You completed all{" "}
                    {totalChallenges} lessons.
                  </span>
                </div>
              )}

            </div>
          )}

          {result && (
            <div
              className={`learning-result ${resultType}`}
            >
              <span>
                {resultType === "success"
                  ? "✓"
                  : "!"}
              </span>

              <p>{result}</p>
            </div>
          )}

        </div>

      </section>

    </main>
  )
}

export default Challenge