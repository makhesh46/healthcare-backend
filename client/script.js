let token = "";

async function login() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  const res = await fetch("http://localhost:5001/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });

  const data = await res.json();
  token = data.token;

  if (token) {
    alert("Login successful");
  } else {
    alert("Login failed");
  }
}

async function createTask() {
  if (!token) {
    alert("Please login first");
    return;
  }

  const title = document.getElementById("task").value;

  await fetch("http://localhost:5001/tasks", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + token
    },
    body: JSON.stringify({ title })
  });

  alert("Task created");
}

async function chat() {
  const msg = document.getElementById("chatInput").value;

  const res = await fetch("http://localhost:5001/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: msg })
  });

  const data = await res.json();
  document.getElementById("chatReply").innerText = data.reply;
}
