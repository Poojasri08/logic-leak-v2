# Logic Leak 2.0

A hands-on cybersecurity challenge platform for practicing secure code review.

## 🎯 What is Logic Leak?

Logic Leak presents vulnerable code and challenges users to identify security issues, explain the vulnerability, suggest a fix, and handle security edge cases.

## 🧩 Challenge Structure

Each challenge contains three tiers:

### Tier 1: Find

Identify the security vulnerability.

30 points

### Tier 2: Explain + Fix

Explain why the code is vulnerable and describe a secure fix.

30 points

### Tier 3: Edge Case

Identify a security edge case and explain the required validation.

40 points

Maximum score: 100 points per challenge.

## 🚀 Current Challenges

1. Bank Transfer
2. Product Search
3. E-commerce Checkout

## 🛠️ Tech Stack

* React
* Vite
* JavaScript
* ESLint
* Git & GitHub

## ✨ Current Features

* Three cybersecurity challenges
* Three-tier challenge system
* Data-driven challenge configuration
* Keyword-based answer validation
* Score tracking
* Challenge progression
* Next Challenge navigation
* Input validation
* Responsive development foundation

## 📁 Project Structure

frontend/
├── src/
│   ├── data/
│   │   └── challenges.js
│   ├── pages/
│   │   └── Challenge.jsx
│   ├── App.jsx
│   └── main.jsx
├── public/
├── package.json
└── README.md

## 💻 Run Locally

#### Clone the repository:

    git clone https://github.com/Poojasri08/logic-leak-v2.git

#### Move into the frontend directory:

    cd logic-leak-v2/frontend

#### Install dependencies:

    npm install

#### Start the development server:

    npm run dev

#### Run the linter:

    npm run lint

## 🔐 Security Focus

The current challenges focus on identifying common application security problems such as:

* SQL Injection
* Unsafe input handling
* Missing validation
* Secure database query practices

## 📌 Current Status

Logic Leak 2.0 MVP - In Development

The current version focuses on the core challenge gameplay and validation system.

Future development will include backend integration, authentication, persistent progress, submission history, and additional security testing.

## 👤 Author

### Poojasri

GitHub: https://github.com/Poojasri08
