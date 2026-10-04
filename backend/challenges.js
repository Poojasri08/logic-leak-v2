/* =========================================
   SHARED MATCHING DATA

   Answers are normalised before matching:
   lower-case, punctuation turned into spaces,
   extra spaces removed. So "SQL-Injection!"
   becomes "sql injection".

   This file is never sent to the browser as-is.
   server.js builds the public payload from an
   explicit list of safe fields.
========================================= */

const SQL_INJECTION_NAMES = [
  /\bsql injection\b/,
  /\bsqli\b/,
]

const TIER1_MISCONCEPTIONS = [
  {
    pattern: /\bxss\b|cross site/,
    message:
      "Cross-site scripting is about untrusted input appearing in a web page. This code builds a database query, so look at how that query text is put together.",
  },
  {
    pattern: /authenticat|authoriz|access control|\bidor\b|password/,
    message:
      "Access control matters in real systems, but the flaw here is in how the query text is built from its inputs. Read the string-building lines again.",
  },
  {
    pattern: /inject/,
    message:
      "You are close: this is an injection problem. Which kind? Think about what language the string being built is written in.",
  },
  {
    pattern: /input|validat|sanitiz/,
    message:
      "Input handling is part of the story. Name the specific attack that happens when untrusted input is joined into a database query.",
  },
]

const EXPLAIN_GROUPS = [
  {
    patterns: [
      /\bsql injection\b/,
      /\bsqli\b/,
      /\binject/,
    ],
    nudge:
      "Start by naming the weakness, then say what an attacker could achieve with it.",
  },
  {
    patterns: [
      /concatenat/,
      /\bstring\b/,
      /\binput\b/,
      /\buser\b/,
      /\bunsanitized\b/,
      /\buntrusted\b/,
      /\bdirectly\b/,
      /\bappend/,
      /\bjoin/,
      /\binterpolat/,
      /\bunescaped\b/,
      /\bvalues?\b/,
    ],
    nudge:
      "Good start. Now explain why it happens: how does the user's input end up inside the query text?",
  },
]

const EXPLAIN_TOO_SHORT =
  "Try explaining in a sentence or two, in your own words: what is the weakness, and why does the code allow it?"

const EXPLAIN_CORRECT = {
  message:
    "Good explanation. Because the input becomes part of the SQL text, an attacker can change what the query does. Now describe how you would fix it.",
}

const FIX_GROUPS = [
  {
    patterns: [
      /parameteri[sz]/,
      /prepared (statement|query|sql)/,
      /placeholder/,
      /\bbind/,
      /bound parameter/,
      /query parameter/,
    ],
    nudge:
      "Think about how to keep the SQL command and the user's values separate when they are sent to the database. Which feature of database libraries does that?",
  },
]

const FIX_MISCONCEPTIONS = [
  {
    pattern:
      /sanitiz|escap|filter|blacklist|black list|regex|strip|validat/,
    message:
      "Cleaning or checking input can help, but attackers often find ways around it. Look for a fix that stops user data from ever being treated as SQL.",
  },
]

const FIX_CORRECT = {
  message:
    "Parameterized queries (prepared statements) send the SQL structure and the values separately, so the database always treats input as data and never as SQL.",
  concept: "Parameterized queries",
  takeaway:
    "Keep code and data separate: never build SQL by joining strings with user input.",
}

const TIER3_TOO_SHORT =
  "Write a sentence or two so your reasoning is clear."

/* =========================================
   CHALLENGES
========================================= */

const challenges = [
  /* ---------------------------------------
     1. BANK TRANSFER
  --------------------------------------- */
  {
    id: 1,
    title: "Bank Transfer",
    difficulty: "Easy",
    category: "Injection and business logic",

    description:
      "A money-transfer function that builds its database query from raw values.",

    scenario:
      "You work on the backend of a small online bank. A teammate wrote this function to move money out of a customer's account. It is already live, and a security review has flagged it.",

    investigation: [
      "Read the function line by line.",
      "Find every value that comes from the caller (amount and userId).",
      "Trace where each value ends up inside the query string.",
      "Ask yourself: what if a value was something other than a normal, sensible number?",
    ],

    hints: [
      "Start with the two parameters, userId and amount. Where do they end up?",
      "Look at how the query text is built: pieces of text are joined with + around the values.",
      "What happens if a value contains SQL syntax instead of a plain number? Attacks that exploit this are called injection attacks.",
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
      points: 30,
      maxWords: 10,
      accept: SQL_INJECTION_NAMES,
      incorrect:
        "Not quite. Look at how amount and userId reach the query: they are joined straight into the SQL text. Ask what happens if a value contains SQL syntax instead of a plain number, then name the attack that makes possible.",
      misconceptions: TIER1_MISCONCEPTIONS,
      correct: {
        message:
          "amount and userId are joined directly into the SQL string, so a crafted value can change the meaning of the query instead of being treated as plain data.",
        concept: "SQL injection",
        takeaway:
          "Whenever user input is joined into a query string, an attacker may be able to rewrite the query.",
      },
    },

    tier2: {
      question:
        "Explain why this code is vulnerable and describe how you would fix it.",
      points: 30,
      explainPrompt:
        "Explain what is wrong: what is the weakness, and why does this code allow it?",
      fixPrompt:
        "Describe the secure approach you would use to build this query.",
      hints: [
        "Explain in two parts: what is the weakness, and why does the code allow it?",
        "For the fix, think about sending the query structure and the values to the database separately.",
        "Database libraries offer placeholders (like ?) that are filled in safely. This feature has two common names.",
      ],
      explain: {
        minWords: 6,
        tooShort: EXPLAIN_TOO_SHORT,
        groups: EXPLAIN_GROUPS,
        correct: EXPLAIN_CORRECT,
      },
      fix: {
        groups: FIX_GROUPS,
        misconceptions: FIX_MISCONCEPTIONS,
        correct: FIX_CORRECT,
        secureCode: `function transfer(userId, amount) {
  const query =
    "UPDATE accounts SET balance = balance - ? WHERE user_id = ?";

  return database.query(query, [amount, userId]);
}`,
      },
    },

    tier3: {
      question:
        "An attacker provides a negative value for the transfer amount. What security problem could this cause, and what validation should be added?",
      points: 40,
      minWords: 4,
      tooShort: TIER3_TOO_SHORT,
      hints: [
        "Look at the arithmetic: balance - amount. What if amount is not a normal positive number?",
        "What does subtracting a negative number do?",
        "The server should refuse values that make no sense for a transfer. What check would do that?",
      ],
      groups: [
        {
          patterns: [
            /negative/,
            /minus/,
            /less than (zero|0)/,
            /below (zero|0)/,
            /reverse/,
          ],
          nudge:
            "Think about what a transfer with a value below zero would actually do to the balances.",
        },
        {
          patterns: [
            /validat/,
            /check/,
            /positive/,
            /greater than (zero|0)/,
            /reject/,
            /\bzero\b/,
            /minimum/,
            /at least/,
            /verify/,
            /ensure/,
            /sanitiz/,
            /restrict/,
            /limit/,
          ],
          nudge:
            "You have spotted the risky value. Now say what the server should check before it moves any money.",
        },
      ],
      correct: {
        message:
          "With a negative amount, balance - amount becomes an addition, so a transfer could add money instead of taking it. Checking that amount is a number greater than zero prevents this.",
        concept: "Business-logic validation",
        takeaway:
          "A value can be safe from injection and still break your rules. Validate what a value means, not just its format.",
      },
      secureCode: `function transfer(userId, amount) {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Invalid amount");
  }

  const query =
    "UPDATE accounts SET balance = balance - ? WHERE user_id = ?";

  return database.query(query, [amount, userId]);
}`,
    },
  },

  /* ---------------------------------------
     2. PRODUCT SEARCH
  --------------------------------------- */
  {
    id: 2,
    title: "Product Search",
    difficulty: "Easy",
    category: "Injection",

    description:
      "A shop search bar that inserts the customer's search text into a query.",

    scenario:
      "An online shop has a search bar. Customers type a product name and this function looks it up in the database. Support has noticed strange results when people search for words containing quote marks.",

    investigation: [
      "Find the one value that comes from the customer.",
      "Follow it into the query string and note what surrounds it.",
      "Think about what could happen if the search text contained a quote mark or other special characters.",
    ],

    hints: [
      "Find the one value that comes from the user. Where does it end up?",
      "The search term sits between quote marks inside the query string. What if the term itself contained a quote mark?",
      "Attacker-controlled text that changes the meaning of a query is a classic injection problem.",
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
      points: 30,
      maxWords: 10,
      accept: SQL_INJECTION_NAMES,
      incorrect:
        "Not quite. Look at the search term: it is placed straight into the query text between quote marks. Ask what happens if it contains SQL syntax, then name the attack that makes possible.",
      misconceptions: TIER1_MISCONCEPTIONS,
      correct: {
        message:
          "The search term is pasted directly into the SQL text, so a customer can type characters that end the search string and add their own SQL.",
        concept: "SQL injection",
        takeaway:
          "A search box is user input like any other. Treat it as untrusted.",
      },
    },

    tier2: {
      question:
        "Explain why this code is vulnerable and describe how you would fix it.",
      points: 30,
      explainPrompt:
        "Explain what is wrong: what is the weakness, and why does this code allow it?",
      fixPrompt:
        "Describe the secure approach you would use to build this query.",
      hints: [
        "Explain in two parts: what is the weakness, and why does the code allow it?",
        "For the fix, think about sending the query structure and the search text to the database separately.",
        "Database libraries offer placeholders (like ?) that are filled in safely. This feature has two common names.",
      ],
      explain: {
        minWords: 6,
        tooShort: EXPLAIN_TOO_SHORT,
        groups: EXPLAIN_GROUPS,
        correct: EXPLAIN_CORRECT,
      },
      fix: {
        groups: FIX_GROUPS,
        misconceptions: FIX_MISCONCEPTIONS,
        correct: FIX_CORRECT,
        secureCode: `function searchProducts(searchTerm) {
  const query = "SELECT * FROM products WHERE name LIKE ?";

  return database.query(query, ["%" + searchTerm + "%"]);
}`,
      },
    },

    tier3: {
      question:
        "What should happen if a user enters unexpected characters into the search field?",
      points: 40,
      minWords: 4,
      tooShort: TIER3_TOO_SHORT,
      hints: [
        "Think about two layers of defence: how the query is built, and what the app accepts as a search term.",
        "Which layer makes sure unusual characters are only ever treated as text?",
        "The other layer can limit things like length or allowed characters.",
      ],
      groups: [
        {
          patterns: [
            /parameteri[sz]/,
            /prepared statement/,
            /placeholder/,
            /\bbind/,
            /as data/,
            /plain text/,
            /literal/,
            /treated as (text|data|plain)/,
            /not (be )?(treated|run|executed|interpreted)/,
            /not (as )?(sql|code|a command|commands|an instruction)/,
            /search text/,
          ],
          nudge:
            "Think about whether the database should treat unusual characters as part of the search text or as SQL. How do you guarantee that?",
        },
        {
          patterns: [
            /validat/,
            /sanitiz/,
            /length/,
            /limit/,
            /reject/,
            /allow ?list/,
            /whitelist/,
            /error/,
            /trim/,
            /restrict/,
            /escape/,
          ],
          nudge:
            "Good. Also consider what extra checks the app can apply to the search term itself, such as its length or allowed characters.",
        },
      ],
      correct: {
        message:
          "Unexpected characters should be handled as plain search text through a parameterized query, and the app can add validation such as a length limit as a second layer of defence.",
        concept: "Defence in depth",
        takeaway:
          "Parameterized queries stop injection; validation adds a second layer and keeps bad data out.",
      },
      secureCode: `function searchProducts(searchTerm) {
  if (typeof searchTerm !== "string" || searchTerm.length > 100) {
    throw new Error("Invalid search term");
  }

  const query = "SELECT * FROM products WHERE name LIKE ?";

  return database.query(query, ["%" + searchTerm + "%"]);
}`,
    },
  },

  /* ---------------------------------------
     3. E-COMMERCE CHECKOUT
  --------------------------------------- */
  {
    id: 3,
    title: "E-commerce Checkout",
    difficulty: "Medium",
    category: "Injection and business logic",

    description:
      "A checkout function that saves an order using values sent from the browser.",

    scenario:
      "A shop's checkout endpoint receives the user, product and price from the browser and saves the order. Finance has noticed an order whose price does not look right, and you have been asked to review the code.",

    investigation: [
      "List every parameter of checkout() and decide which ones a customer could control.",
      "Follow each value into the query string.",
      "Ask whether the server should trust each value it receives, especially price.",
    ],

    hints: [
      "List every parameter of checkout(). Which of them could a customer control from their browser?",
      "Each value is joined into the SQL text with +. Nothing separates the data from the command.",
      "What happens if one of those values contains SQL syntax? This is an injection problem.",
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
      points: 30,
      maxWords: 10,
      accept: SQL_INJECTION_NAMES,
      incorrect:
        "Not quite. Look at how userId, productId and price are placed into the query text. Ask what happens if one of them contains SQL syntax, then name the attack that makes possible.",
      misconceptions: TIER1_MISCONCEPTIONS,
      correct: {
        message:
          "All three values are joined directly into the INSERT statement, so a crafted value can change what the database is told to do.",
        concept: "SQL injection",
        takeaway:
          "Every value from a request is untrusted, even ones that look like numbers.",
      },
    },

    tier2: {
      question:
        "Explain why this checkout code is vulnerable and describe how you would fix it.",
      points: 30,
      explainPrompt:
        "Explain what is wrong: what is the weakness, and why does this code allow it?",
      fixPrompt:
        "Describe the secure approach you would use to build this query.",
      hints: [
        "Explain in two parts: what is the weakness, and why does the code allow it?",
        "For the fix, think about sending the query structure and the values to the database separately.",
        "Database libraries offer placeholders (like ?) that are filled in safely. This feature has two common names.",
      ],
      explain: {
        minWords: 6,
        tooShort: EXPLAIN_TOO_SHORT,
        groups: EXPLAIN_GROUPS,
        correct: EXPLAIN_CORRECT,
      },
      fix: {
        groups: FIX_GROUPS,
        misconceptions: FIX_MISCONCEPTIONS,
        correct: FIX_CORRECT,
        secureCode: `function checkout(userId, productId, price) {
  const query =
    "INSERT INTO orders (user_id, product_id, price) VALUES (?, ?, ?)";

  return database.query(query, [userId, productId, price]);
}`,
      },
    },

    tier3: {
      question:
        "What validation should be applied to the price before creating the order?",
      points: 40,
      minWords: 4,
      tooShort: TIER3_TOO_SHORT,
      hints: [
        "Who controls the price value in this function?",
        "Think about what a customer could send instead of the real price.",
        "The safest design does not rely on the browser's price at all. At minimum, what must be true about the value?",
      ],
      groups: [
        {
          patterns: [
            /validat/,
            /check/,
            /verify/,
            /reject/,
            /ensure/,
            /sanitiz/,
            /server/,
            /enforce/,
          ],
          nudge:
            "Say what the application should do with the price before it creates the order.",
        },
        {
          patterns: [
            /positive/,
            /greater than (zero|0)/,
            /negative/,
            /\bzero\b/,
            /number/,
            /numeric/,
            /integer/,
            /decimal/,
            /range/,
            /\btype\b/,
            /database/,
            /catalog/,
            /real price/,
            /actual price/,
            /look ?up/,
            /product price/,
          ],
          nudge:
            "Be specific: what makes a price acceptable, and where should the trusted price come from?",
        },
      ],
      correct: {
        message:
          "The browser controls whatever it sends, including the price. The server must at least check that it is a positive number, and ideally ignore it and look up the real price from its own product data.",
        concept: "Never trust client-side values",
        takeaway:
          "Decide prices, discounts and permissions on the server. The client only asks; the server decides.",
      },
      secureCode: `function checkout(userId, productId) {
  const product = database.query(
    "SELECT price FROM products WHERE id = ?",
    [productId]
  );

  if (!product || !(product.price > 0)) {
    throw new Error("Invalid product");
  }

  const query =
    "INSERT INTO orders (user_id, product_id, price) VALUES (?, ?, ?)";

  return database.query(query, [userId, productId, product.price]);
}`,
    },
  },
]

module.exports = challenges