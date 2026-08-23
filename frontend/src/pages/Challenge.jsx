import { useState } from "react"
import challenges from "../data/challenges"

function containsKeyword(text, keywords) {
  const normalizedText = text.trim().toLowerCase()

  return keywords.some((keyword) =>
    normalizedText.includes(keyword.toLowerCase())
  )
}

function Challenge() {
  const [challengeIndex, setChallengeIndex] = useState(0)

  const challenge = challenges[challengeIndex]

  const [answer, setAnswer] = useState("")
  const [result, setResult] = useState(null)
  const [tier, setTier] = useState(1)
  const [score, setScore] = useState(0)

  const [tier2Explanation, setTier2Explanation] = useState("")
  const [tier2Fix, setTier2Fix] = useState("")
  const [tier3Answer, setTier3Answer] = useState("")

  function handleSubmit(event) {
    event.preventDefault()

    const normalizedAnswer = answer.trim().toLowerCase()

    if (!normalizedAnswer) {
      setResult("Please enter your finding.")
      return
    }

    if (normalizedAnswer === challenge.tier1.answer) {
      setScore(challenge.tier1.points)
      setResult("Correct. Tier 2 unlocked.")
      setTier(2)
    } else {
      setResult("Not quite. Review the code and try again.")
    }
  }

  function handleTier2Submit(event) {
    event.preventDefault()

    const explanation = tier2Explanation.trim()
    const fix = tier2Fix.trim()

    if (!explanation || !fix) {
      setResult("Please complete both answers.")
      return
    }

    const vulnerabilityKeyword = challenge.tier2.expectedKeywords[0]
    const fixKeywords = challenge.tier2.expectedKeywords.slice(1)

    const knowsVulnerability = containsKeyword(
      explanation,
      [vulnerabilityKeyword]
    )

    const knowsSecureFix = containsKeyword(
      fix,
      fixKeywords
    )

    if (knowsVulnerability && knowsSecureFix) {
      setScore(
        (previousScore) =>
          previousScore + challenge.tier2.points
      )

      setResult("Correct. Tier 3 unlocked.")
      setTier(3)
    } else {
      setResult(
        "Your explanation or fix is incomplete. Try again."
      )
    }
  }

  function handleTier3Submit(event) {
    event.preventDefault()

    const normalizedAnswer = tier3Answer.trim()

    if (!normalizedAnswer) {
      setResult("Please enter your answer.")
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

      setResult("Excellent. Challenge completed!")
      setTier(4)
    } else {
      setResult(
        "Your answer is incomplete. Think about the edge case and validation."
      )
    }
  }

  function handleNextChallenge() {
    if (challengeIndex < challenges.length - 1) {
      setChallengeIndex(
        (previousIndex) => previousIndex + 1
      )

      setTier(1)
      setAnswer("")
      setTier2Explanation("")
      setTier2Fix("")
      setTier3Answer("")
      setResult(null)
      setScore(0)
    }
  }

  const displayedTier = tier > 3 ? 3 : tier
  const progressWidth = `${(displayedTier / 3) * 100}%`

  return (
    <main className="challenge-page">
      <div className="challenge-card">
        <div className="challenge-header">
          <div>
            <p className="hero-badge">
              Challenge {challenge.id}
            </p>

            <h1 className="challenge-title">
              {challenge.title}
            </h1>
          </div>

          <span className="difficulty-badge">
            {challenge.difficulty}
          </span>
        </div>

        <div className="progress-section">
          <div className="progress-info">
            <span>
              Tier {displayedTier} / 3
            </span>

            <span className="score-display">
              Score: {score} / 100
            </span>
          </div>

          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: progressWidth }}
            />
          </div>
        </div>

        <p className="hero-description">
          Can you spot the security leak?
        </p>

        {challenge.description && (
          <p className="hero-description">
            {challenge.description}
          </p>
        )}

        <pre className="code-block">
          {challenge.code}
        </pre>

        {tier === 1 && (
          <section>
            <h2>Tier 1: Find</h2>

            <p>
              What security vulnerability do you see?
            </p>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label
                  className="form-label"
                  htmlFor="answer"
                >
                  Your finding
                </label>

                <input
                  className="input"
                  id="answer"
                  type="text"
                  value={answer}
                  onChange={(event) =>
                    setAnswer(event.target.value)
                  }
                  placeholder="Enter the vulnerability..."
                />
              </div>

              <button
                className="primary-button"
                type="submit"
              >
                Submit Finding
              </button>
            </form>
          </section>
        )}

        {tier === 2 && (
          <section>
            <h2>Tier 2: Explain + Fix</h2>

            <p>{challenge.tier2.question}</p>

            <form onSubmit={handleTier2Submit}>
              <div className="form-group">
                <label
                  className="form-label"
                  htmlFor="explanation"
                >
                  Why is this code vulnerable?
                </label>

                <textarea
                  className="textarea"
                  id="explanation"
                  value={tier2Explanation}
                  onChange={(event) =>
                    setTier2Explanation(
                      event.target.value
                    )
                  }
                  placeholder="Explain the vulnerability..."
                  rows="5"
                />
              </div>

              <div className="form-group">
                <label
                  className="form-label"
                  htmlFor="fix"
                >
                  How would you fix it?
                </label>

                <textarea
                  className="textarea"
                  id="fix"
                  value={tier2Fix}
                  onChange={(event) =>
                    setTier2Fix(event.target.value)
                  }
                  placeholder="Describe the secure fix..."
                  rows="5"
                />
              </div>

              <button
                className="primary-button"
                type="submit"
              >
                Submit Tier 2
              </button>
            </form>
          </section>
        )}

        {tier === 3 && (
          <section>
            <h2>Tier 3: Edge Case</h2>

            <p>{challenge.tier3.question}</p>

            <form onSubmit={handleTier3Submit}>
              <div className="form-group">
                <label
                  className="form-label"
                  htmlFor="tier3Answer"
                >
                  Your answer
                </label>

                <textarea
                  className="textarea"
                  id="tier3Answer"
                  value={tier3Answer}
                  onChange={(event) =>
                    setTier3Answer(event.target.value)
                  }
                  placeholder="Explain the edge case and how to handle it..."
                  rows="6"
                />
              </div>

              <button
                className="primary-button"
                type="submit"
              >
                Submit Tier 3
              </button>
            </form>
          </section>
        )}

        {tier === 4 && (
          <section>
            <h2>Challenge Complete!</h2>

            <p>
              You completed all three tiers.
            </p>

            <p className="score-display">
              Final Score: {score} / 100
            </p>

            {challengeIndex < challenges.length - 1 && (
              <button
                className="primary-button"
                onClick={handleNextChallenge}
              >
                Next Challenge
              </button>
            )}

            {challengeIndex === challenges.length - 1 && (
              <p>
                You completed all available challenges.
              </p>
            )}
          </section>
        )}

        {result && (
          <div className="feedback">
            {result}
          </div>
        )}
      </div>
    </main>
  )
}

export default Challenge