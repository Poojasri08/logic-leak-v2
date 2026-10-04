const Database = require("better-sqlite3")
const path = require("path")

const dbPath = path.join(__dirname, "logic-leak.db")
const db = new Database(dbPath)

db.pragma("journal_mode = WAL")

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS progress (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    challenge_id INTEGER NOT NULL,
    score INTEGER DEFAULT 0,
    completed INTEGER DEFAULT 0,
    tier1_completed INTEGER DEFAULT 0,
    tier2_completed INTEGER DEFAULT 0,
    tier3_completed INTEGER DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(id),
    UNIQUE (user_id, challenge_id)
  );
`)

// Safe migration helper: adds a column only if it is missing,
// so existing users and progress are never touched.
// Table names are fixed here in the code, never taken from a request.
const MIGRATABLE_TABLES = ["users", "progress"]

function addColumnIfMissing(table, column, definition) {
  if (!MIGRATABLE_TABLES.includes(table)) {
    throw new Error(`Cannot migrate unknown table: ${table}`)
  }

  const columns = db
    .prepare(`PRAGMA table_info(${table})`)
    .all()

  const exists = columns.some(
    (item) => item.name === column
  )

  if (!exists) {
    db.exec(
      `ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`
    )
  }
}

// ---------- progress ----------

addColumnIfMissing(
  "progress",
  "tier1_completed",
  "INTEGER DEFAULT 0"
)

addColumnIfMissing(
  "progress",
  "tier2_completed",
  "INTEGER DEFAULT 0"
)

addColumnIfMissing(
  "progress",
  "tier3_completed",
  "INTEGER DEFAULT 0"
)

// Records that the learner passed the "explain" step of Tier 2,
// so the "fix" step cannot be submitted on its own.
addColumnIfMissing(
  "progress",
  "tier2_explained",
  "INTEGER DEFAULT 0"
)

// ---------- users (streaks) ----------
// Total XP is NOT stored here. It is always calculated from
// progress.score, so it can never drift out of sync.

addColumnIfMissing(
  "users",
  "current_streak",
  "INTEGER DEFAULT 0"
)

addColumnIfMissing(
  "users",
  "longest_streak",
  "INTEGER DEFAULT 0"
)

// Calendar date of the last XP-earning activity, "YYYY-MM-DD".
addColumnIfMissing(
  "users",
  "last_activity_date",
  "TEXT"
)

console.log("Database connected successfully")

module.exports = db
