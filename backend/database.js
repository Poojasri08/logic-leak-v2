const Database = require("better-sqlite3")
const db = new Database("logic-leak.db")
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
function addColumnIfMissing(column, definition) {
  const columns = db
    .prepare("PRAGMA table_info(progress)")
    .all()
  const exists = columns.some(
    (item) => item.name === column
  )
  if (!exists) {
    db.exec(
      `ALTER TABLE progress ADD COLUMN ${column} ${definition}`
    )
  }
}
addColumnIfMissing(
  "tier1_completed",
  "INTEGER DEFAULT 0"
)
addColumnIfMissing(
  "tier2_completed",
  "INTEGER DEFAULT 0"
)
addColumnIfMissing(
  "tier3_completed",
  "INTEGER DEFAULT 0"
)
console.log("Database connected successfully")
module.exports = db