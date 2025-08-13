import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.json());

const TOKEN = process.env.BOT_TOKEN;
const ADMIN_ID = "5365915138"; // Your Telegram ID to receive submissions
const TELEGRAM_API = `https://api.telegram.org/bot${TOKEN}`;

const userState = {};

app.post("/webhook", async (req, res) => {
  const message = req.body.message;
  if (!message) return res.sendStatus(200);

  const chatId = message.chat.id;
  const text = message.text?.trim();

  if (!userState[chatId]) {
    userState[chatId] = { step: 0, data: {} };
  }

  const state = userState[chatId];

  // START
  if (text === "/start") {
    state.step = 1;
    return sendMessage(chatId, "Welcome! Please enter your full name:");
  }

  // STEP 1: Name
  if (state.step === 1) {
    state.data.name = text;
    state.step = 2;
    return sendMessage(chatId, "Please enter your phone number:");
  }

  // STEP 2: Phone
  if (state.step === 2) {
    state.data.phone = text;
    state.step = 3;
    return sendKeyboard(chatId, "Choose your marketplace:", [
      ["Wildberries"], ["Yandex"], ["Ozon"]
    ]);
  }

  // STEP 3: Marketplace
  if (state.step === 3) {
    state.data.marketplace = text;
    if (text === "Wildberries") {
      state.step = 4;
      return sendKeyboard(chatId, "Choose type:", [["FBS"], ["FBW"]]);
    }
    if (text === "Yandex") {
      state.step = 6;
      state.data.type = "FBS";
      return sendKeyboard(chatId, "Choose warehouse:", [["Yandex Market-Южный ворота"]]);
    }
    if (text === "Ozon") {
      state.step = 6;
      state.data.type = "FBS";
      return sendKeyboard(chatId, "Choose warehouse:", [["OZON-Южный ворота"]]);
    }
  }

  // STEP 4: Wildberries type
  if (state.step === 4) {
    state.data.type = text;
    state.step = 6;
    if (text === "FBS") {
      return sendKeyboard(chatId, "Choose warehouse:", [
        ["Белая дача"], ["Видное"], ["Обухово"]
      ]);
    } else if (text === "FBW") {
      return sendKeyboard(chatId, "Choose warehouse:", [
        ["Екатеринбург"], ["Казань"], ["Коледино"], ["Краснодар"],
        ["Невинномысск"], ["Новосемейкино"], ["Подольск"],
        ["Тула"], ["Электросталь"]
      ]);
    }
  }

  // STEP 6: Warehouse
  if (state.step === 6) {
    state.data.warehouse = text;
    state.step = 7;
    return sendMessage(chatId, "Enter quantity of items:");
  }

  // STEP 7: Quantity
  if (state.step === 7) {
    state.data.quantity = text;
    state.step = 8;
    return sendMessage(chatId, "Please send height, width, length (cm) and weight (kg) in one message like:\n`50x40x30 cm, 10 kg`");
  }

  // STEP 8: Measurements
  if (state.step === 8) {
    state.data.measurements = text;
    state.step = 0; // reset after finish

    // Send data to admin
    const summary = `
📦 New Request:
Name: ${state.data.name}
Phone: ${state.data.phone}
Marketplace: ${state.data.marketplace}
Type: ${state.data.type}
Warehouse: ${state.data.warehouse}
Quantity: ${state.data.quantity}
Measurements: ${state.data.measurements}
    `;

    await sendMessage(ADMIN_ID, summary);
    return sendMessage(chatId, "Thank you! We will respond as soon as possible with the price.");
  }

  res.sendStatus(200);
});

app.get("/", (req, res) => {
  res.send("Bot is running.");
});

app.listen(3000, () => console.log("Server running on port 3000"));

// Helper functions
async function sendMessage(chatId, text) {
  await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "Markdown" }),
  });
}

async function sendKeyboard(chatId, text, keyboard) {
  await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      reply_markup: { keyboard, resize_keyboard: true, one_time_keyboard: true }
    }),
  });
}
