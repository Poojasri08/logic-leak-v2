import { useState } from "react"

function Challenge() {
  const [answer, setAnswer] = useState("")
  const [submitted, setSubmitted] = useState(false)

  function handleSubmit(event) {
    event.preventDefault()
    setSubmitted(true)
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

        {submitted && (
          <p>
            Answer submitted: <strong>{answer}</strong>
          </p>
        )}
      </section>
    </main>
  )
}

export default Challenge