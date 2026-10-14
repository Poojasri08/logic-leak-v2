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

  useEffect(() => {
    let cancelled = false

    async function loadChallenges() {
      setLoading(true)
      setApiError("")

      try {
        const data = await apiRequest(
          "/api/challenges"
        )

        if (cancelled) {
          return
        }

        const challenges = Array.isArray(data)
          ? data
          : Array.isArray(data.challenges)
            ? data.challenges
            : []

        setApiChallenges(challenges)
      } catch (error) {
        if (cancelled) {
          return
        }

        if (
          error instanceof ApiError &&
          error.status === 401
        ) {
          onLogout()
          return
        }

        setApiError(
          error.message ||
            "Unable to load challenges."
        )
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadChallenges()

    return () => {
      cancelled = true
    }
  }, [onLogout])

  useEffect(() => {
    if (apiChallenges.length === 0) {
      return
    }

    let cancelled = false

    async function loadProgress() {
      try {
        const data = await apiRequest(
          "/api/progress"
        )

        if (cancelled) {
          return
        }

        const progress =
          data?.progress || data

        const challengeProgress =
          progress?.challenges ||
          progress?.challengeProgress ||
          []

        let totalScore = 0

        challengeProgress.forEach((item) => {
          totalScore += Number(
            item?.xp ??
              item?.score ??
              item?.points ??
              0
          )
        })

        setScore(totalScore)

        let nextIndex = 0
        let nextTier = 1

        for (
          let index = 0;
          index < apiChallenges.length;
          index += 1
        ) {
          const challenge = apiChallenges[index]

          const progressItem =
            challengeProgress.find(
              (item) =>
                String(
                  item?.challengeId ??
                    item?.challenge_id ??
                    item?.id
                ) ===
                String(
                  challenge?.id
                )
            )

          const tier1Complete = Boolean(
            progressItem?.tier1 ??
              progressItem?.tier1Completed ??
              progressItem?.completedTier1
          )

          const tier2Complete = Boolean(
            progressItem?.tier2 ??
              progressItem?.tier2Completed ??
              progressItem?.completedTier2
          )

          const tier3Complete = Boolean(
            progressItem?.tier3 ??
              progressItem?.tier3Completed ??
              progressItem?.completedTier3
          )

          if (!tier1Complete) {
            nextIndex = index
            nextTier = 1
            break
          }

          if (!tier2Complete) {
            nextIndex = index
            nextTier = 2
            break
          }

          if (!tier3Complete) {
            nextIndex = index
            nextTier = 3
            break
          }

          if (index === apiChallenges.length - 1) {
            nextIndex = index
            nextTier = 4
          }
        }

        setChallengeIndex(nextIndex)
        setTier(nextTier)

        if (nextTier === 2) {
          setTier2Step(1)
        }

        setAnswer("")
        setTier2Explanation("")
        setTier2Fix("")
        setTier3Answer("")
        setHintLevel(0)
        setResult(null)
        setResultType("")
      } catch (error) {
        if (cancelled) {
          return
        }

        if (
          error instanceof ApiError &&
          error.status === 401
        ) {
          onLogout()
          return
        }

        setApiError(
          error.message ||
            "Unable to load your progress."
        )
      }
    }

    loadProgress()

    return () => {
      cancelled = true
    }
  }, [apiChallenges, onLogout])

  function showResult(type, message) {
    setResultType(type)
    setResult(message)
  }

  function getHint() {
    const nextLevel = Math.min(
      hintLevel + 1,
      3
    )

    setHintLevel(nextLevel)

    if (nextLevel === 1) {
      showResult(
        "hint",
        "Start by identifying where user-controlled input reaches a sensitive operation."
      )
      return
    }

    if (nextLevel === 2) {
      showResult(
        "hint",
        "Look closely at how the application builds or executes its database query."
      )
      return
    }

    showResult(
      "hint",
      "The secure fix should prevent attacker-controlled input from changing the structure of the database query."
    )
  }

  function handleAuthError(error) {
    if (
      error instanceof ApiError &&
      error.status === 401
    ) {
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

      const progress =
        data?.progress || data

      const challengeProgress =
        progress?.challenges ||
        progress?.challengeProgress ||
        []

      let totalScore = 0

      challengeProgress.forEach((item) => {
        totalScore += Number(
          item?.xp ??
            item?.score ??
            item?.points ??
            0
        )
      })

      setScore(totalScore)
    } catch (error) {
      if (handleAuthError(error)) {
        return
      }

      setApiError(
        error.message ||
          "Unable to refresh your progress."
      )
    }
  }

  async function handleTier1Submit(event) {
    event.preventDefault()

    if (!answer.trim()) {
      showResult(
        "error",
        "Enter an answer before submitting."
      )
      return
    }

    const challenge =
      apiChallenges[challengeIndex]

    if (!challenge) {
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

      if (data?.correct) {
        showResult(
          "success",
          data.message ||
            `Correct. You earned ${
              data.points ?? 30
            } XP.`
        )

        setTier(2)
        setTier2Step(1)
        setAnswer("")
        setHintLevel(0)

        await loadProgress()
      } else {
        showResult(
          "error",
          data?.message ||
            "Not quite. Identify how user input reaches the SQL query."
        )
      }
    } catch (error) {
      if (handleAuthError(error)) {
        return
      }

      showResult(
        "error",
        error.message ||
          "Unable to submit your answer."
      )
    }
  }

  async function handleTier2Submit(event) {
    event.preventDefault()

    const currentAnswer =
      tier2Step === 1
        ? tier2Explanation
        : tier2Fix

    if (!currentAnswer.trim()) {
      showResult(
        "error",
        "Enter an answer before submitting."
      )
      return
    }

    const challenge =
      apiChallenges[challengeIndex]

    if (!challenge) {
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
            answer: currentAnswer.trim(),
          },
        }
      )

      if (data?.correct) {
        if (tier2Step === 1) {
          showResult(
            "success",
            data.message ||
              "Correct. Now explain how to fix the vulnerability."
          )

          setTier2Step(2)
          setTier2Explanation(
            currentAnswer
          )
          setTier2Fix("")
          setHintLevel(0)

          await loadProgress()
          return
        }

        showResult(
          "success",
          data.message ||
            `Correct. You earned ${
              data.points ?? 30
            } XP.`
        )

        setTier(3)
        setTier2Step(1)
        setTier2Explanation("")
        setTier2Fix("")
        setHintLevel(0)

        await loadProgress()
      } else {
        showResult(
          "error",
          data?.message ||
            (tier2Step === 1
              ? "Explain the vulnerability and why attacker-controlled input is dangerous."
              : "Use parameterized queries or prepared statements so user input cannot alter SQL structure.")
        )
      }
    } catch (error) {
      if (handleAuthError(error)) {
        return
      }

      showResult(
        "error",
        error.message ||
          "Unable to submit your answer."
      )
    }
  }

  async function handleTier3Submit(event) {
    event.preventDefault()

    if (!tier3Answer.trim()) {
      showResult(
        "error",
        "Enter an answer before submitting."
      )
      return
    }

    const challenge =
      apiChallenges[challengeIndex]

    if (!challenge) {
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

      if (data?.correct) {
        showResult(
          "success",
          data.message ||
            `Challenge complete. You earned ${
              data.points ?? 40
            } XP.`
        )

        setTier(4)
        setHintLevel(0)

        await loadProgress()
      } else {
        showResult(
          "error",
          data?.message ||
            "Think about the edge case and the validation the application should enforce."
        )
      }
    } catch (error) {
      if (handleAuthError(error)) {
        return
      }

      showResult(
        "error",
        error.message ||
          "Unable to submit your answer."
      )
    }
  }

  function handleNextChallenge() {
    if (
      challengeIndex >=
      apiChallenges.length - 1
    ) {
      return
    }

    setChallengeIndex(
      challengeIndex + 1
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
  }

  if (loading) {
    return (
      <main className="challenge-page">
        <div className="challenge-shell">
          <div className="challenge-loading">
            <span className="challenge-loading-dot">
              •
            </span>
            Loading challenges...
          </div>
        </div>
      </main>
    )
  }

  if (apiError && apiChallenges.length === 0) {
    return (
      <main className="challenge-page">
        <div className="challenge-shell">
          <section className="challenge-error">
            <span className="challenge-eyebrow">
              LOGIC LEAK
            </span>

            <h1>Unable to load challenges</h1>

            <p>{apiError}</p>

            <button
              type="button"
              className="challenge-button"
              onClick={() =>
                window.location.reload()
              }
            >
              Retry
            </button>
          </section>
        </div>
      </main>
    )
  }

  if (apiChallenges.length === 0) {
    return (
      <main className="challenge-page">
        <div className="challenge-shell">
          <section className="challenge-empty">
            <span className="challenge-eyebrow">
              LOGIC LEAK
            </span>

            <h1>No challenges available</h1>

            <p>
              The backend returned no learning
              challenges.
            </p>
          </section>
        </div>
      </main>
    )
  }

  const challenge =
    apiChallenges[challengeIndex]

  if (!challenge) {
    return null
  }

  const challengeTitle =
    challenge.title ||
    challenge.name ||
    `Challenge ${challengeIndex + 1}`

  const challengeDescription =
    challenge.description ||
    challenge.summary ||
    ""

  const challengeCategory =
    challenge.category ||
    challenge.type ||
    "Web Security"

  const challengeCode =
    challenge.vulnerableCode ||
    challenge.code ||
    challenge.snippet ||
    ""

  const isComplete = tier >= 4

  return (
    <main className="challenge-page">
      <div className="challenge-shell">
        <header className="challenge-topbar">
          <div className="challenge-brand">
            <div className="challenge-logo-mark">
              L
            </div>

            <div>
              <strong>LOGIC LEAK</strong>
              <span>
                INTERACTIVE SECURITY LEARNING
              </span>
            </div>
          </div>

          <div className="challenge-topbar-actions">
            <div className="challenge-score">
              <span>XP</span>
              <strong>{score}</strong>
            </div>

            <button
              type="button"
              className="challenge-logout"
              onClick={onLogout}
            >
              Log out
            </button>
          </div>
        </header>

        <section className="challenge-hero">
          <div>
            <span className="challenge-eyebrow">
              CHALLENGE{" "}
              {challengeIndex + 1}{" "}
              / {apiChallenges.length}
            </span>

            <h1>{challengeTitle}</h1>

            <p>{challengeDescription}</p>
          </div>

          <div className="challenge-category">
            {challengeCategory}
          </div>
        </section>

        <section className="challenge-progress">
          <div className="challenge-progress-header">
            <span>LEARNING PATH</span>

            <span>
              {isComplete
                ? "Complete"
                : `Tier ${Math.min(
                    tier,
                    3
                  )} of 3`}
            </span>
          </div>

          <div className="challenge-progress-track">
            <div
              className="challenge-progress-fill"
              style={{
                width: `${
                  Math.min(tier, 4) * 25
                }%`,
              }}
            />
          </div>

          <div className="challenge-tier-list">
            <div
              className={`challenge-tier ${
                tier >= 1
                  ? "active"
                  : ""
              } ${
                tier > 1
                  ? "completed"
                  : ""
              }`}
            >
              <span className="challenge-tier-number">
                {tier > 1 ? "✓" : "01"}
              </span>

              <div>
                <strong>Find</strong>
                <span>
                  Spot the vulnerability
                </span>
              </div>
            </div>

            <div
              className={`challenge-tier ${
                tier >= 2
                  ? "active"
                  : ""
              } ${
                tier > 2
                  ? "completed"
                  : ""
              }`}
            >
              <span className="challenge-tier-number">
                {tier > 2 ? "✓" : "02"}
              </span>

              <div>
                <strong>
                  Understand
                </strong>
                <span>
                  Explain the weakness
                </span>
              </div>
            </div>

            <div
              className={`challenge-tier ${
                tier >= 3
                  ? "active"
                  : ""
              } ${
                tier > 3
                  ? "completed"
                  : ""
              }`}
            >
              <span className="challenge-tier-number">
                {tier > 3 ? "✓" : "03"}
              </span>

              <div>
                <strong>Fix</strong>
                <span>
                  Apply the secure solution
                </span>
              </div>
            </div>
          </div>
        </section>

        <section className="challenge-content">
          {!isComplete && (
            <div className="challenge-code-card">
              <div className="challenge-card-header">
                <div>
                  <span>
                    VULNERABLE CODE
                  </span>

                  <strong>
                    Identify the logic leak
                  </strong>
                </div>

                <span className="challenge-code-badge">
                  SECURITY REVIEW
                </span>
              </div>

              <pre className="challenge-code">
                <code>
                  {challengeCode ||
                    "// Code snippet provided by the challenge"}
                </code>
              </pre>
            </div>
          )}

          <div className="challenge-learning-card">
            {!isComplete && tier === 1 && (
              <>
                <div className="challenge-card-header">
                  <div>
                    <span>
                      TIER 01 · FIND
                    </span>

                    <strong>
                      Where is the vulnerability?
                    </strong>
                  </div>

                  <span className="challenge-xp-badge">
                    +30 XP
                  </span>
                </div>

                <p className="challenge-instruction">
                  Identify the security
                  vulnerability in the code.
                  Be specific about what makes
                  the code unsafe.
                </p>

                <form
                  onSubmit={
                    handleTier1Submit
                  }
                  className="challenge-form"
                >
                  <textarea
                    value={answer}
                    onChange={(event) =>
                      setAnswer(
                        event.target.value
                      )
                    }
                    placeholder="Describe the vulnerability..."
                    rows={5}
                  />

                  <div className="challenge-form-actions">
                    <button
                      type="button"
                      className="challenge-secondary-button"
                      onClick={getHint}
                      disabled={
                        hintLevel >= 3
                      }
                    >
                      Hint{" "}
                      {hintLevel > 0
                        ? `(${hintLevel}/3)`
                        : ""}
                    </button>

                    <button
                      type="submit"
                      className="challenge-button"
                    >
                      Submit answer
                      <span aria-hidden="true">
                        →
                      </span>
                    </button>
                  </div>
                </form>
              </>
            )}

            {!isComplete && tier === 2 && (
              <>
                <div className="challenge-card-header">
                  <div>
                    <span>
                      TIER 02 · UNDERSTAND
                    </span>

                    <strong>
                      Explain the vulnerability
                    </strong>
                  </div>

                  <span className="challenge-xp-badge">
                    +30 XP
                  </span>
                </div>

                {tier2Step === 1 && (
                  <>
                    <p className="challenge-instruction">
                      Explain what the
                      vulnerability is and why
                      attacker-controlled input
                      is dangerous here.
                    </p>

                    <form
                      onSubmit={
                        handleTier2Submit
                      }
                      className="challenge-form"
                    >
                      <textarea
                        value={
                          tier2Explanation
                        }
                        onChange={(event) =>
                          setTier2Explanation(
                            event.target.value
                          )
                        }
                        placeholder="Explain the vulnerability and its impact..."
                        rows={6}
                      />

                      <div className="challenge-form-actions">
                        <button
                          type="button"
                          className="challenge-secondary-button"
                          onClick={getHint}
                          disabled={
                            hintLevel >= 3
                          }
                        >
                          Hint{" "}
                          {hintLevel > 0
                            ? `(${hintLevel}/3)`
                            : ""}
                        </button>

                        <button
                          type="submit"
                          className="challenge-button"
                        >
                          Check explanation
                          <span aria-hidden="true">
                            →
                          </span>
                        </button>
                      </div>
                    </form>
                  </>
                )}

                {tier2Step === 2 && (
                  <>
                    <div className="challenge-step-complete">
                      <span>✓</span>

                      <div>
                        <strong>
                          Vulnerability identified
                        </strong>

                        <p>
                          Now describe the
                          secure fix.
                        </p>
                      </div>
                    </div>

                    <p className="challenge-instruction">
                      Explain how you would
                      prevent attacker-controlled
                      input from changing the
                      structure of the SQL query.
                    </p>

                    <form
                      onSubmit={
                        handleTier2Submit
                      }
                      className="challenge-form"
                    >
                      <textarea
                        value={tier2Fix}
                        onChange={(event) =>
                          setTier2Fix(
                            event.target.value
                          )
                        }
                        placeholder="Describe the secure coding fix..."
                        rows={6}
                      />

                      <div className="challenge-form-actions">
                        <button
                          type="button"
                          className="challenge-secondary-button"
                          onClick={getHint}
                          disabled={
                            hintLevel >= 3
                          }
                        >
                          Hint{" "}
                          {hintLevel > 0
                            ? `(${hintLevel}/3)`
                            : ""}
                        </button>

                        <button
                          type="submit"
                          className="challenge-button"
                        >
                          Check fix
                          <span aria-hidden="true">
                            →
                          </span>
                        </button>
                      </div>
                    </form>
                  </>
                )}
              </>
            )}

            {!isComplete && tier === 3 && (
              <>
                <div className="challenge-card-header">
                  <div>
                    <span>
                      TIER 03 · FIX
                    </span>

                    <strong>
                      Apply the secure solution
                    </strong>
                  </div>

                  <span className="challenge-xp-badge">
                    +40 XP
                  </span>
                </div>

                <p className="challenge-instruction">
                  Provide the final secure
                  implementation or describe
                  the exact change required to
                  prevent the vulnerability.
                </p>

                <form
                  onSubmit={
                    handleTier3Submit
                  }
                  className="challenge-form"
                >
                  <textarea
                    value={tier3Answer}
                    onChange={(event) =>
                      setTier3Answer(
                        event.target.value
                      )
                    }
                    placeholder="Describe or provide the secure fix..."
                    rows={7}
                  />

                  <div className="challenge-form-actions">
                    <button
                      type="button"
                      className="challenge-secondary-button"
                      onClick={getHint}
                      disabled={
                        hintLevel >= 3
                      }
                    >
                      Hint{" "}
                      {hintLevel > 0
                        ? `(${hintLevel}/3)`
                        : ""}
                    </button>

                    <button
                      type="submit"
                      className="challenge-button"
                    >
                      Complete challenge
                      <span aria-hidden="true">
                        →
                      </span>
                    </button>
                  </div>
                </form>
              </>
            )}

            {isComplete && (
              <div className="challenge-complete">
                <div className="challenge-complete-icon">
                  ✓
                </div>

                <span className="challenge-eyebrow">
                  CHALLENGE COMPLETE
                </span>

                <h2>
                  Security issue understood.
                </h2>

                <p>
                  You identified the
                  vulnerability, explained why
                  it matters, and applied the
                  secure solution.
                </p>

                <div className="challenge-complete-stats">
                  <div>
                    <span>XP EARNED</span>
                    <strong>100</strong>
                  </div>

                  <div>
                    <span>PROGRESS</span>
                    <strong>
                      {challengeIndex + 1}/
                      {apiChallenges.length}
                    </strong>
                  </div>
                </div>

                {challengeIndex <
                  apiChallenges.length - 1 && (
                  <button
                    type="button"
                    className="challenge-button challenge-next-button"
                    onClick={
                      handleNextChallenge
                    }
                  >
                    Next challenge
                    <span aria-hidden="true">
                      →
                    </span>
                  </button>
                )}

                {challengeIndex >=
                  apiChallenges.length - 1 && (
                  <div className="challenge-all-complete">
                    <strong>
                      All challenges complete
                    </strong>

                    <p>
                      You have completed every
                      challenge currently available
                      in Logic Leak.
                    </p>
                  </div>
                )}
              </div>
            )}

            {result && (
              <div
                className={`challenge-result ${
                  resultType
                    ? `challenge-result-${resultType}`
                    : ""
                }`}
                role={
                  resultType === "error"
                    ? "alert"
                    : "status"
                }
              >
                {resultType ===
                  "success" && (
                  <span
                    aria-hidden="true"
                  >
                    ✓
                  </span>
                )}

                {resultType ===
                  "hint" && (
                  <span
                    aria-hidden="true"
                  >
                    ?
                  </span>
                )}

                {resultType ===
                  "error" && (
                  <span
                    aria-hidden="true"
                  >
                    !
                  </span>
                )}

                <span>{result}</span>
              </div>
            )}
          </div>
        </section>

        <footer className="challenge-footer">
          <span>
            LOGIC LEAK
          </span>

          <span aria-hidden="true">
            ·
          </span>

          <span>
            LEARN SECURITY BY FIXING IT
          </span>
        </footer>
      </div>
    </main>
  )
}

export default Challenge