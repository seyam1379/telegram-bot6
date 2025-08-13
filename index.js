import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.json());

const TOKEN = process.env.BOT_TOKEN;
const TELEGRAM_API = `https://api.telegram.org/bot${TOKEN}`;
const ADMIN_ID = "5365915138";

// Store user steps
const userStates = {};

// Helper to send messages
async function sendMessage(chatId, text, keyboard = null) {
  const payload = {
    chat_id: chatId,
    text,
  };
  if (keyboard) {
    payload.reply_markup = {
      keyboard: keyboard.map(row => row.map(button => ({ text: button }))),
      resize_keyboard: true,
      one_time_keyboard: true,
    };
  }
  await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

// Handle webhook
app.post("/webhook", async (req, res) => {
  const message = req.body.message;
  if (!message || !message.chat) return res.sendStatus(200);

  const chatId = message.chat.id;
  const text = message.text?.trim();

  if (text === "/start") {
    userStates[chatId] = { step: "getName" };
    await sendMessage(
      chatId,
      "Добро пожаловать! Пожалуйста, введите ваше полное имя и номер телефона в одном сообщении:\nПример: Иван Иванов, +79990000000"
    );
    return res.sendStatus(200);
  }

  const state = userStates[chatId];

  if (!state) {
    await sendMessage(chatId, "Пожалуйста, введите /start, чтобы начать.");
    return res.sendStatus(200);
  }

  switch (state.step) {
    case "getName":
      state.namePhone = text;
      state.step = "chooseMarketplace";
      await sendMessage(chatId, "Выберите маркетплейс:", [
        ["Wildberries", "Yandex", "Ozon"]
      ]);
      break;

    case "chooseMarketplace":
      state.marketplace = text;
      if (text === "Wildberries") {
        state.step = "chooseWBType";
        await sendMessage(chatId, "Выберите тип:", [
          ["FBS", "FBW"]
        ]);
      } else if (text === "Yandex") {
        state.step = "chooseWarehouse";
        state.type = "FBS";
        await sendMessage(chatId, "Выберите склад:", [
          ["Yandex Market-Южный ворота"]
        ]);
      } else if (text === "Ozon") {
        state.step = "chooseWarehouse";
        state.type = "FBS";
        await sendMessage(chatId, "Выберите склад:", [
          ["OZON-Южный ворота"]
        ]);
      } else {
        await sendMessage(chatId, "Пожалуйста, выберите один из предложенных вариантов.");
      }
      break;

    case "chooseWBType":
      state.type = text;
      state.step = "chooseWarehouse";
      if (text === "FBS") {
        await sendMessage(chatId, "Выберите склад:", [
          ["Белая дача", "Видное", "Обухово"]
        ]);
      } else if (text === "FBW") {
        await sendMessage(chatId, "Выберите склад:", [
          ["Екатеринбург", "Казань", "Коледино"],
          ["Краснодар", "Невинномысск", "Новосемейкино"],
          ["Подольск", "Тула", "Электросталь"]
        ]);
      } else {
        await sendMessage(chatId, "Пожалуйста, выберите FBS или FBW.");
      }
      break;

    case "chooseWarehouse":
      state.warehouse = text;
      state.step = "getQuantity";
      await sendMessage(
        chatId,
        "Пожалуйста, укажите количество и габариты (высота, вес, длина):\nПример: 100 шт, 10 кг, 50x40x30 см"
      );
      break;

    case "getQuantity":
      state.quantityMeasurements = text;

      // Send details to admin
      const adminMessage = `📦 Новый заказ:
👤 Клиент: ${state.namePhone}
🏬 Маркетплейс: ${state.marketplace}
📦 Тип: ${state.type || "N/A"}
📍 Склад: ${state.warehouse}
📏 Кол-во и размеры: ${state.quantityMeasurements}`;
      await sendMessage(ADMIN_ID, adminMessage);

      await sendMessage(chatId, "✅ Спасибо! Мы свяжемся с вами в ближайшее время для уточнения цены.");
      delete userStates[chatId];
      break;
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
