const Database = require("./backend/node_modules/better-sqlite3");

const db = new Database("./backend/logic-leak.db");

console.log(
  db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all()
);

db.close();