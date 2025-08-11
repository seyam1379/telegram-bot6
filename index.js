import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.json());

const TOKEN = process.env.BOT_TOKEN;
const TELEGRAM_API = `https://api.telegram.org/bot${TOKEN}`;

// Webhook endpoint
app.post("/webhook", async (req, res) => {
  console.log(req.body);

  const chatId = req.body.message?.chat.id;
  const text = req.body.message?.text;

  if (chatId && text) {
    await fetch(`${TELEGRAM_API}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: `You said: ${text}`
      }),
    });
  }

  res.sendStatus(200);
});

// Health check
app.get("/", (req, res) => {
  res.send("Bot is running.");
});

app.listen(3000, () => {
  console.log("Server running on port 3000");
});
