import { useState } from "react"

function Challenge() {
  const [answer, setAnswer] = useState("")
  const [result, setResult] = useState(null)

  const correctAnswers = [
    "sql injection",
    "sql injection vulnerability",
    "injection",
  ]

  function handleSubmit(event) {
    event.preventDefault()

    const normalizedAnswer = answer.trim().toLowerCase()

    if (!normalizedAnswer) {
      setResult("Please enter your finding.")
      return
    }

    if (correctAnswers.includes(normalizedAnswer)) {
      setResult("Correct. You spotted the vulnerability.")
    } else {
      setResult("Not quite. Review the code and try again.")
    }
  }

  return (
    <main>
      <h1>Challenge 01</h1>
      <p>Can You Spot the Leak?</p>

      <section>
        <h2>Bank Transfer</h2>

        <p>
          Review the code and identify the security vulnerability.
        </p>

        <pre>
{`function transfer(userId, amount) {
  const query =
    "UPDATE accounts SET balance = balance - " +
    amount +
    " WHERE user_id = " +
    userId;

  return database.execute(query);
}`}
        </pre>

        <form onSubmit={handleSubmit}>
          <label htmlFor="answer">
            What vulnerability do you see?
          </label>

          <input
            id="answer"
            type="text"
            value={answer}
            onChange={(event) => setAnswer(event.target.value)}
            placeholder="Enter your answer..."
          />

          <button type="submit">Submit Finding</button>
        </form>

        {result && <p>{result}</p>}
      </section>
    </main>
  )
}

export default Challenge