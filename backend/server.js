const express = require("express");
const cors = require("cors");
const challenges = require("./challenges");

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    message: "Logic Leak API is running",
  });
});

app.get("/api/challenges", (req, res) => {
  res.json(challenges);
});

      
      

app.listen(PORT, () => {
  console.log(`Logic Leak API running on http://localhost:${PORT}`);
});