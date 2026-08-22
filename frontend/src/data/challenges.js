const challenges = [
  {
    id: 1,
    title: "Bank Transfer",
    difficulty: "Easy",

    code: `function transfer(userId, amount) {
  const query =
    "UPDATE accounts SET balance = balance - " +
    amount +
    " WHERE user_id = " +
    userId;

  return database.query(query);
}`,

    tier1: {
      question: "What security vulnerability exists in this code?",
      answer: "sql injection",
      points: 30
    },

    tier2: {
      question:
        "Explain why this code is vulnerable and describe how you would fix it.",

      expectedKeywords: [
        "sql injection",
        "parameterized query",
        "prepared statement"
      ],

      points: 30
    },

    tier3: {
      question:
        "An attacker provides a negative value for the transfer amount. What security problem could this cause, and what validation should be added?",

      expectedKeywords: [
        "negative",
        "amount validation"
      ],

      points: 40
    }
  },

  {
    id: 2,
    title: "Product Search",
    difficulty: "Easy",

    code: `function searchProducts(searchTerm) {
  const query =
    "SELECT * FROM products WHERE name LIKE '%" +
    searchTerm +
    "%'";

  return database.query(query);
}`,

    tier1: {
      question: "What security vulnerability exists in this code?",
      answer: "sql injection",
      points: 30
    },

    tier2: {
      question:
        "Explain why this code is vulnerable and describe how you would fix it.",

      expectedKeywords: [
        "sql injection",
        "parameterized query",
        "prepared statement"
      ],

      points: 30
    },

    tier3: {
      question:
        "What should happen if a user enters unexpected characters into the search field?",

      expectedKeywords: [
        "validation",
        "parameterized"
      ],

      points: 40
    }
  }
]

export default challenges