console.log("Index.js started");
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const http = require("http");
const { Server } = require("socket.io");
const OpenAI = require("openai").default;
const fs = require("fs");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

const PORT = process.env.PORT || 5001;
const SECRET = process.env.JWT_SECRET;

// ================= OPENAI SAFE INIT =================
let openai = null;
if (
  process.env.OPENAI_API_KEY &&
  process.env.OPENAI_API_KEY !== "dummy_key"
) {
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });
}

// ================= LOAD RAG DATA =================
const knowledgeBase = fs.readFileSync(
  path.join(__dirname, "data", "healthcare.txt"),
  "utf-8"
);

// ================= TEMP DATABASE =================
let users = [];
let tasks = [];

// ================= AUTH =================
function auth(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "No token" });

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
  if (users.find(u => u.email === email)) return;

  const hash = await bcrypt.hash(password, 10);
  users.push({ email, password: hash, role: "admin" });
  console.log("✅ Admin seeded");
}

// ================= REGISTER =================
app.post("/register", async (req, res) => {
  const hash = await bcrypt.hash(req.body.password, 10);
  users.push({ email: req.body.email, password: hash, role: "user" });
  res.json({ message: "User registered" });
});

// ================= LOGIN =================
app.post("/login", async (req, res) => {
  const user = users.find(u => u.email === req.body.email);
  if (!user) return res.status(404).json({ message: "User not found" });

  const ok = await bcrypt.compare(req.body.password, user.password);
  if (!ok) return res.status(401).json({ message: "Wrong password" });

  const token = jwt.sign(
    { email: user.email, role: user.role },
    SECRET,
    { expiresIn: "1h" }
  );

  res.json({ token });
});

// ================= CREATE TASK (AUTO MODE) =================
app.post("/tasks", auth, (req, res) => {
  const task = {
    id: Date.now(),
    title: req.body?.title || "Healthcare Demo Task",
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

// ================= AI CHAT + RAG =================
app.post("/chat", async (req, res) => {
  const { message } = req.body;

  if (!openai) {
    return res.json({
      reply: "RAG Demo 🤖\n\n" + knowledgeBase
    });
  }

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          "Answer ONLY using this healthcare data:\n\n" + knowledgeBase
      },
      { role: "user", content: message }
    ]
  });

  res.json({ reply: completion.choices[0].message.content });
});

// ================= SOCKET =================
io.on("connection", () => {
  console.log("Client connected");
});

// ================= START =================
seedAdmin();
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
