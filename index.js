import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.json());

const TOKEN = process.env.BOT_TOKEN;
const ADMIN_ID = "5365915138";
const TELEGRAM_API = `https://api.telegram.org/bot${TOKEN}`;

// Store user states in memory
const userStates = {};

// Helper to send messages
async function sendMessage(chatId, text, keyboard = null) {
  const body = {
    chat_id: chatId,
    text: text,
  };
  if (keyboard) {
    body.reply_markup = keyboard;
  }

  await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// Webhook endpoint
app.post("/webhook", async (req, res) => {
  const message = req.body.message;
  if (!message) return res.sendStatus(200);

  const chatId = message.chat.id;
  const text = message.text;

  if (!userStates[chatId]) {
    userStates[chatId] = { step: 0, data: {} };
  }

  const user = userStates[chatId];

  // Step 0: Start
  if (text === "/start") {
    user.step = 1;
    await sendMessage(chatId, "Welcome! Please enter your full name:");
    return res.sendStatus(200);
  }

  // Step 1: Ask name
  if (user.step === 1) {
    user.data.name = text;
    user.step = 2;
    await sendMessage(chatId, "Thanks! Now please enter your phone number:");
    return res.sendStatus(200);
  }

  // Step 2: Ask phone
  if (user.step === 2) {
    user.data.phone = text;
    user.step = 3;
    await sendMessage(chatId, "Choose your marketplace:", {
      inline_keyboard: [
        [{ text: "Wildberries", callback_data: "wildberries" }],
        [{ text: "Yandex", callback_data: "yandex" }],
        [{ text: "Ozon", callback_data: "ozon" }],
      ],
    });
    return res.sendStatus(200);
  }

  res.sendStatus(200);
});

// Handle callback buttons
app.post("/webhook", async (req, res) => {
  const callback = req.body.callback_query;
  if (!callback) return res.sendStatus(200);

  const chatId = callback.message.chat.id;
  const data = callback.data;

  if (!userStates[chatId]) return res.sendStatus(200);
  const user = userStates[chatId];

  // Marketplace selection
  if (user.step === 3) {
    user.data.marketplace = data;
    if (data === "wildberries") {
      user.step = 4;
      await sendMessage(chatId, "Choose mode:", {
        inline_keyboard: [
          [{ text: "FBS", callback_data: "wb_fbs" }],
          [{ text: "FBW", callback_data: "wb_fbw" }],
        ],
      });
    } else if (data === "yandex") {
      user.step = 5;
      user.data.mode = "FBS";
      await sendMessage(chatId, "Choose warehouse:", {
        inline_keyboard: [
          [{ text: "Yandex Market-Южный ворота", callback_data: "yandex_fbs" }],
        ],
      });
    } else if (data === "ozon") {
      user.step = 5;
      user.data.mode = "FBS";
      await sendMessage(chatId, "Choose warehouse:", {
        inline_keyboard: [
          [{ text: "OZON-Южный ворота", callback_data: "ozon_fbs" }],
        ],
      });
    }
    return res.sendStatus(200);
  }

  // Wildberries mode selection
  if (user.step === 4) {
    user.data.mode = data === "wb_fbs" ? "FBS" : "FBW";
    user.step = 5;
    if (data === "wb_fbs") {
      await sendMessage(chatId, "Choose warehouse:", {
        inline_keyboard: [
          [{ text: "Белая дача", callback_data: "wb_belaya" }],
          [{ text: "Видное", callback_data: "wb_vidnoe" }],
          [{ text: "Обухово", callback_data: "wb_obukhovo" }],
        ],
      });
    } else {
      await sendMessage(chatId, "Choose warehouse:", {
        inline_keyboard: [
          [{ text: "Екатеринбург", callback_data: "wb_ekb" }],
          [{ text: "Казань", callback_data: "wb_kazan" }],
          [{ text: "Коледино", callback_data: "wb_koledino" }],
          [{ text: "Краснодар", callback_data: "wb_krasnodar" }],
          [{ text: "Невинномысск", callback_data: "wb_nevinnomyssk" }],
          [{ text: "Новосемейкино", callback_data: "wb_novosemeykino" }],
          [{ text: "Подольск", callback_data: "wb_podolsk" }],
          [{ text: "Тула", callback_data: "wb_tula" }],
          [{ text: "Электросталь", callback_data: "wb_elektrostal" }],
        ],
      });
    }
    return res.sendStatus(200);
  }

  // Warehouse selection
  if (user.step === 5) {
    user.data.warehouse = data;
    user.step = 6;
    await sendMessage(chatId, "Please send product dimensions and weight (e.g., 30x20x15 cm, 2 kg):");
    return res.sendStatus(200);
  }

  res.sendStatus(200);
});

// Handle text after warehouse selection
app.post("/webhook", async (req, res) => {
  const message = req.body.message;
  if (!message) return res.sendStatus(200);

  const chatId = message.chat.id;
  const text = message.text;

  if (!userStates[chatId]) return res.sendStatus(200);
  const user = userStates[chatId];

  if (user.step === 6) {
    user.data.dimensions = text;
    user.step = 7;

    // Send confirmation to client
    await sendMessage(chatId, "Thank you! We’ll get back to you with a price soon.");

    // Send all info to admin
    await sendMessage(ADMIN_ID, `New order:\nName: ${user.data.name}\nPhone: ${user.data.phone}\nMarketplace: ${user.data.marketplace}\nMode: ${user.data.mode}\nWarehouse: ${user.data.warehouse}\nDimensions: ${user.data.dimensions}`);

    delete userStates[chatId]; // Reset
  }

  res.sendStatus(200);
});

app.get("/", (req, res) => {
  res.send("Bot is running.");
});

app.listen(3000, () => {
  console.log("Server running on port 3000");
});
