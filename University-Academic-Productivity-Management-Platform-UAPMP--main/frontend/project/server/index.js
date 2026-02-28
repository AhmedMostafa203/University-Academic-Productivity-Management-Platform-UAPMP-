import express from "express";
import cors from "cors";

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

let users = []; // لتخزين بيانات التسجيل مؤقتًا

// Signup
app.post("/api/signup", (req, res) => {
  const { fullName, email, password } = req.body;
  const exists = users.find(u => u.email === email);
  if (exists) return res.status(400).json({ message: "Email already exists" });

  users.push({ fullName, email, password });
  res.json({ message: "Account created successfully!" });
});

// Signin
app.post("/api/signin", (req, res) => {
  const { email, password } = req.body;
  const user = users.find(u => u.email === email && u.password === password);
  if (!user) return res.status(400).json({ message: "Invalid email or password" });

  res.json({ message: "Login successful" });
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));