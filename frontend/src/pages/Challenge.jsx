import { useEffect, useState } from "react"

function containsKeyword(text, keywords) {
  const normalizedText = text.trim().toLowerCase()

  return keywords.some((keyword) =>
    normalizedText.includes(keyword.toLowerCase())
  )
}

function Challenge() {
  const [challengeIndex, setChallengeIndex] = useState(0)
  const [answer, setAnswer] = useState("")
  const [result, setResult] = useState(null)
  const [resultType, setResultType] = useState("")
  const [tier, setTier] = useState(1)
  const [score, setScore] = useState(0)
  const [apiChallenges, setApiChallenges] = useState([])

  const [loading, setLoading] = useState(true)
  const [apiError, setApiError] = useState("")

  const [tier2Explanation, setTier2Explanation] = useState("")
  const [tier2Fix, setTier2Fix] = useState("")
  const [tier2Step, setTier2Step] = useState(1)
  const [tier3Answer, setTier3Answer] = useState("")

  useEffect(() => {
    fetch("http://localhost:5000/api/challenges")
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to fetch challenges")
        }

        return response.json()
      })
      .then((data) => {
        setApiChallenges(data)
        setLoading(false)
      })
      .catch((error) => {
        console.error("API error:", error)
        setApiError(
          "Unable to load challenges. Please check the server."
        )
        setLoading(false)
      })
  }, [])

  if (loading) {
    return <div>Loading challenges...</div>
  }

  if (apiError) {
    return <div>{apiError}</div>
  }

  const challenge = apiChallenges[challengeIndex]

  function showResult(message, type) {
    setResult(message)
    setResultType(type)
  }

  function handleSubmit(event) {
    event.preventDefault()

    const normalizedAnswer = answer.trim().toLowerCase()

    if (!normalizedAnswer) {
      showResult("Please enter your finding.", "error")
      return
    }

    if (
      normalizedAnswer ===
      challenge.tier1.answer.trim().toLowerCase()
    ) {
      setScore(
        (previousScore) =>
          previousScore + challenge.tier1.points
      )

      showResult("Correct. Tier 2 unlocked.", "success")
      setTier(2)
      setTier2Step(1)
    } else {
      showResult(
        "Not quite. Review the code and try again.",
        "error"
      )
    }
  }

  function handleTier2Submit(event) {
    event.preventDefault()

    if (tier2Step === 1) {
      const explanation = tier2Explanation.trim()

      if (!explanation) {
        showResult(
          "Please explain why the code is vulnerable.",
          "error"
        )
        return
      }

      const vulnerabilityKeyword =
        challenge.tier2.expectedKeywords[0]

      const knowsVulnerability = containsKeyword(
        explanation,
        [vulnerabilityKeyword]
      )

      if (!knowsVulnerability) {
        showResult(
          "Your explanation does not identify the vulnerability correctly.",
          "error"
        )
        return
      }

      showResult(
        "Correct. Now explain how you would fix it.",
        "success"
      )

      setTier2Step(2)

      return
    }

    const fix = tier2Fix.trim()

    if (!fix) {
      showResult(
        "Please describe how you would fix it.",
        "error"
      )
      return
    }

    const fixKeywords =
      challenge.tier2.expectedKeywords.slice(1)

    const knowsSecureFix = containsKeyword(
      fix,
      fixKeywords
    )

    if (!knowsSecureFix) {
      showResult(
        "Your fix is incomplete. Use a secure database query approach.",
        "error"
      )
      return
    }

    setScore(
      (previousScore) =>
        previousScore + challenge.tier2.points
    )

    showResult("Correct. Tier 3 unlocked.", "success")
    setTier(3)
  }

  function handleTier3Submit(event) {
    event.preventDefault()

    const normalizedAnswer = tier3Answer.trim()

    if (!normalizedAnswer) {
      showResult("Please enter your answer.", "error")
      return
    }

    const hasRequiredKeywords =
      challenge.tier3.expectedKeywords.every(
        (keyword) =>
          normalizedAnswer
            .toLowerCase()
            .includes(keyword.toLowerCase())
      )

    if (hasRequiredKeywords) {
      setScore(
        (previousScore) =>
          previousScore + challenge.tier3.points
      )

      showResult(
        "Excellent. Challenge completed!",
        "success"
      )

      setTier(4)
    } else {
      showResult(
        "Your answer is incomplete. Think about the edge case and validation.",
        "error"
      )
    }
  }

  function handleNextChallenge() {
    if (challengeIndex < apiChallenges.length - 1) {
      setChallengeIndex(
        (previousIndex) => previousIndex + 1
      )

      setTier(1)
      setAnswer("")
      setTier2Explanation("")
      setTier2Fix("")
      setTier2Step(1)
      setTier3Answer("")
      setResult(null)
      setResultType("")
    }
  }

  return (
    <div className="challenge-page">
      <header className="brand-header">
        <div className="brand-text">
          <span className="brand-dot" />

          <div>
            <strong>LOGIC LEAK</strong>
            <small>2.0</small>
          </div>
        </div>
      </header>

      <div className="top-bar">
        <div>
          <span className="label">CHALLENGE</span>

          <h1>
            {String(challenge.id).padStart(2, "0")}
            <span>
              {" "}
              / {String(apiChallenges.length).padStart(2, "0")}
            </span>
          </h1>
        </div>

        <div className="score-panel">
          <span className="label">SCORE</span>

          <strong>
            {score}
            <small> / 300</small>
          </strong>
        </div>
      </div>

      <section className="challenge-intro">
        <span className="difficulty">
          {challenge.difficulty}
        </span>

        <h2>{challenge.title}</h2>

        {challenge.description && (
          <p>{challenge.description}</p>
        )}
      </section>

      <div className="tier-progress">
        <div
          className={
            tier >= 1 ? "tier active" : "tier"
          }
        >
          <span>01</span>

          <div>
            <strong>Find</strong>
            <small>Identify the flaw</small>
          </div>
        </div>

        <div className="progress-line" />

        <div
          className={
            tier >= 2 ? "tier active" : "tier"
          }
        >
          <span>02</span>

          <div>
            <strong>Explain + Fix</strong>
            <small>Understand the risk</small>
          </div>
        </div>

        <div className="progress-line" />

        <div
          className={
            tier >= 3 ? "tier active" : "tier"
          }
        >
          <span>03</span>

          <div>
            <strong>Edge Case</strong>
            <small>Think deeper</small>
          </div>
        </div>
      </div>

      <section className="code-section">
        <div className="code-header">
          <div>
            <span className="code-label">
              VULNERABLE CODE
            </span>

            <strong>challenge.js</strong>
          </div>

          <span className="code-language">
            JAVASCRIPT
          </span>
        </div>

        <div className="code-editor">
          <div className="line-numbers">
            {challenge.code
              .split("\n")
              .map((_, index) => (
                <span key={index}>
                  {String(index + 1).padStart(2, "0")}
                </span>
              ))}
          </div>

          <pre>
            <code>{challenge.code}</code>
          </pre>
        </div>
      </section>

      <section className="answer-section">
        {tier === 1 && (
          <form onSubmit={handleSubmit}>
            <span className="question-number">
              TIER 01
            </span>

            <h3>
              Identify the vulnerability
            </h3>

            <p className="hint">
              What security flaw is present in this code?
            </p>

            <input
              type="text"
              value={answer}
              onChange={(event) =>
                setAnswer(event.target.value)
              }
              placeholder="Enter vulnerability..."
              autoComplete="off"
            />

            <button type="submit">
              <span>Submit Finding</span>
              <span>→</span>
            </button>
          </form>
        )}

        {tier === 2 && (
          <form onSubmit={handleTier2Submit}>
            <span className="question-number">
              TIER 02
            </span>

            {tier2Step === 1 && (
              <>
                <h3>
                  Explain the vulnerability
                </h3>

                <p className="hint">
                  Explain why this code is vulnerable.
                </p>

                <label>
                  Why is this code vulnerable?
                </label>

                <textarea
                  value={tier2Explanation}
                  onChange={(event) =>
                    setTier2Explanation(
                      event.target.value
                    )
                  }
                  placeholder="Explain the vulnerability..."
                  rows="6"
                />

                <button type="submit">
                  <span>Continue</span>
                  <span>→</span>
                </button>
              </>
            )}

            {tier2Step === 2 && (
              <>
                <h3>
                  Explain the secure fix
                </h3>

                <p className="hint">
                  Describe how you would fix this
                  vulnerability securely.
                </p>

                <label>
                  How would you fix it?
                </label>

                <textarea
                  value={tier2Fix}
                  onChange={(event) =>
                    setTier2Fix(
                      event.target.value
                    )
                  }
                  placeholder="Describe the secure fix..."
                  rows="6"
                />

                <button type="submit">
                  <span>Submit Fix</span>
                  <span>→</span>
                </button>
              </>
            )}
          </form>
        )}

        {tier === 3 && (
          <form onSubmit={handleTier3Submit}>
            <span className="question-number">
              TIER 03
            </span>

            <h3>
              Think about the edge case
            </h3>

            <p className="hint">
              Security problems often hide in
              unexpected input and boundary conditions.
            </p>

            <div className="tier-question">
              {challenge.tier3.question}
            </div>

            <textarea
              value={tier3Answer}
              onChange={(event) =>
                setTier3Answer(
                  event.target.value
                )
              }
              placeholder="Explain the edge case and validation..."
              rows="6"
            />

            <button type="submit">
              <span>Submit Tier 3</span>
              <span>→</span>
            </button>
          </form>
        )}

        {tier === 4 && (
          <div className="completion">
            <div className="completion-icon">
              ✓
            </div>

            <span className="question-number">
              COMPLETE
            </span>

            <h3>
              Vulnerability identified.
            </h3>

            <p>
              You completed all three tiers of this
              challenge.
            </p>

            <div className="final-score">
              <span>CURRENT SCORE</span>

              <strong>
                {score}
                <small> / 300</small>
              </strong>
            </div>

            {challengeIndex <
              apiChallenges.length - 1 && (
              <button
                type="button"
                onClick={handleNextChallenge}
              >
                <span>Next Challenge</span>
                <span>→</span>
              </button>
            )}

            {challengeIndex ===
              apiChallenges.length - 1 && (
              <div className="all-complete">
                <strong>
                  All challenges completed.
                </strong>

                <span>
                  {apiChallenges.length} /{" "}
                  {apiChallenges.length} challenges
                  completed
                </span>

                <span>
                  Final Score: {score} / 300
                </span>
              </div>
            )}
          </div>
        )}

        {result && (
          <div className={`result ${resultType}`}>
            <span>●</span>
            {result}
          </div>
        )}
      </section>

      <footer>
        <span>LOGIC LEAK 2.0</span>
        <span>
          SECURE CODE REVIEW TRAINING
        </span>
      </footer>
    </div>
  )
}

export default Challenge