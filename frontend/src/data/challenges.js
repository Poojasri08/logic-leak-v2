const challenges = [
  {
    id: 1,
    title: "Bank Transfer",
    difficulty: "Easy",
    description:
      "Review the code and identify the security vulnerability.",

    code: `function transfer(userId, amount) {
  const query =
    "UPDATE accounts SET balance = balance - " +
    amount +
    " WHERE user_id = " +
    userId;

  return database.execute(query);
}`,

    correctAnswers: [
      "sql injection",
      "sql injection vulnerability",
      "injection",
    ],
  },
]

export default challenges