console.log("Index.js started");

require("dotenv").config();

const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

const PORT = process.env.PORT || 5000;
const SECRET = process.env.JWT_SECRET;

// ================= OPENAI =================


// ================= TEMP DATABASE =================
let users = [];
let tasks = [];

// ================= AUTH MIDDLEWARE =================
function auth(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "No token provided" });

  try {
    req.user = jwt.verify(token, SECRET);
    next();
  } catch {
    res.status(403).json({ message: "Invalid token" });
  }
}

// ================= SEED ADMIN =================
async function seedAdmin() {
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;

  if (!email || !password) return;

  const exists = users.find(u => u.email === email);
  if (exists) return;

  const hash = await bcrypt.hash(password, 10);
  users.push({ email, password: hash, role: "admin" });

  console.log("✅ Admin account seeded");
}

// ================= REGISTER =================


// ================= LOGIN =================
app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const user = users.find(u => u.email === email);
  if (!user) return res.status(404).json({ message: "User not found" });

  const ok = await bcrypt.compare(password, user.password);
  if (!ok) return res.status(401).json({ message: "Wrong password" });

  const token = jwt.sign(
    { email: user.email, role: user.role },
    SECRET,
    { expiresIn: "1h" }
  );

  res.json({ token });
});

// ================= CREATE TASK =================
app.post("/tasks", auth, (req, res) => {
  const task = {
    id: Date.now(),
    title: req.body.title,
    status: "Pending"
  };

  tasks.push(task);
  io.emit("notify", "New task created");
  res.json(task);
});

// ================= GET TASKS =================
app.get("/tasks", auth, (req, res) => {
  res.json(tasks);
});

// ================= AI CHATBOT =================
app.post("/chat", async (req, res) => {
  const { message } = req.body;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are an AI project assistant." },
        { role: "user", content: message }
      ]
    });

    res.json({ reply: response.choices[0].message.content });
  } catch {
    res.json({
      reply: "AI unavailable (demo mode). This can be connected using OpenAI API key."
    });
  }
});

// ================= SOCKET =================
io.on("connection", () => {
  console.log("Client connected");
});

// ================= START SERVER =================
seedAdmin();

server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
