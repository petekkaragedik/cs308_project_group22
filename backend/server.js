const express = require("express");

const app = express();
app.use(express.json());

// TEST ROUTE
app.get("/", (req, res) => {
  res.send("Server is running");
});

// LOGIN ROUTE
app.post("/api/login", (req, res) => {
  const { email, password } = req.body;

  if (email === "test@test.com" && password === "1234") {
    return res.json({ message: "Login successful" });
  } else {
    return res.status(401).json({ message: "Invalid credentials" });
  }
});

app.listen(3000, () => {
  console.log("Server running on port 3000");
});