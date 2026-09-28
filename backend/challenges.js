const challenges = [
  {
    id: 1,
    title: "Bank Transfer",
    difficulty: "Easy",

    hints: [
      "Look at how user input is being added to the database query.",
      "The SQL query is being built by directly joining values into the string.",
      "Think about SQL Injection and why parameterized queries are safer."
    ],

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

    hints: [
      "Look at how the search term is used inside the SQL query.",
      "The user's search input is directly inserted into the SQL statement.",
      "Think about SQL Injection and how parameterized queries can separate data from SQL commands."
    ],

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
  },

  {
    id: 3,
    title: "E-commerce Checkout",
    difficulty: "Medium",

    hints: [
      "Look at how the checkout values are inserted into the SQL query.",
      "User-controlled values are being directly combined with the SQL statement.",
      "Think about SQL Injection, parameterized queries, and validating the price before creating an order."
    ],

    code: `function checkout(userId, productId, price) {
  const query =
    "INSERT INTO orders (user_id, product_id, price) VALUES (" +
    userId +
    ", " +
    productId +
    ", " +
    price +
    ")";

  return database.query(query);
}`,

    tier1: {
      question: "What security vulnerability exists in this code?",
      answer: "sql injection",
      points: 30
    },

    tier2: {
      question:
        "Explain why this checkout code is vulnerable and describe how you would fix it.",

      expectedKeywords: [
        "sql injection",
        "parameterized query",
        "prepared statement"
      ],

      points: 30
    },

    tier3: {
      question:
        "What validation should be applied to the price before creating the order?",

      expectedKeywords: [
        "price validation",
        "positive",
        "number"
      ],

      points: 40
    }
  }
]

module.exports = challenges