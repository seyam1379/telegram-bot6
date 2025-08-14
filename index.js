import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.json());

const TOKEN = process.env.BOT_TOKEN;
const ADMIN_CHAT_ID = "5365915138";
const TELEGRAM_API = `https://api.telegram.org/bot${TOKEN}`;

const userStates = {};

app.post("/webhook", async (req, res) => {
  const message = req.body.message;
  if (!message || !message.chat || !message.chat.id) {
    return res.sendStatus(200);
  }

  const chatId = message.chat.id;
  const text = message.text?.trim();

  // Always allow /start to restart
  if (text === "/start") {
    userStates[chatId] = { step: "name" };
    await sendMessage(chatId, "👋 Добро пожаловать! Пожалуйста, введите ваше полное имя:");
    return res.sendStatus(200);
  }

  const state = userStates[chatId];

  if (!state) {
    await sendMessage(chatId, "Отправьте /start для начала.");
    return res.sendStatus(200);
  }

  switch (state.step) {
    case "name":
      state.name = text;
      state.step = "phone";
      await sendMessage(chatId, "📱 Пожалуйста, введите ваш номер телефона:");
      break;

    case "phone":
      state.phone = text;
      state.step = "marketplace";
      await sendKeyboard(chatId, "Выберите маркетплейс:", [
        ["Wildberries", "Yandex", "Ozon"]
      ]);
      break;

    case "marketplace":
      state.marketplace = text;
      if (text === "Wildberries") {
        state.step = "wildberries-type";
        await sendKeyboard(chatId, "Выберите тип:", [["FBS", "FBW"]]);
      } else if (text === "Yandex" || text === "Ozon") {
        state.step = "warehouse";
        if (text === "Yandex") {
          await sendKeyboard(chatId, "Выберите склад:", [["Yandex Market-Южный ворота"]]);
        } else {
          await sendKeyboard(chatId, "Выберите склад:", [["OZON-Южный ворота"]]);
        }
      } else {
        await sendMessage(chatId, "Пожалуйста, выберите из предложенных вариантов.");
      }
      break;

    case "wildberries-type":
      state.type = text;
      state.step = "warehouse";
      if (text === "FBS") {
        await sendKeyboard(chatId, "Выберите склад:", [["Белая дача", "Видное", "Обухово"]]);
      } else if (text === "FBW") {
        await sendKeyboard(chatId, "Выберите склад:", [
          ["Екатеринбург", "Казань", "Коледино"],
          ["Краснодар", "Невинномысск", "Новосемейкино"],
          ["Подольск", "Тула", "Электросталь"]
        ]);
      } else {
        await sendMessage(chatId, "Пожалуйста, выберите FBS или FBW.");
      }
      break;

    case "warehouse":
      state.warehouse = text;
      state.step = "dimensions";
      await sendMessage(chatId, "📦 Введите габариты (ДxШxВ в см):");
      break;

    case "dimensions":
      state.dimensions = text;
      state.step = "weight";
      await sendMessage(chatId, "⚖️ Введите вес в кг:");
      break;

    case "weight":
      state.weight = text;

      // Send all info to admin
      await sendMessage(ADMIN_CHAT_ID, 
        `📦 Новый заказ:\n\nИмя: ${state.name}\nТелефон: ${state.phone}\nМаркетплейс: ${state.marketplace}\nТип: ${state.type || "-"}\nСклад: ${state.warehouse}\nГабариты: ${state.dimensions}\nВес: ${state.weight}`
      );

      await sendMessage(chatId, "✅ Спасибо! Мы свяжемся с вами в ближайшее время для уточнения цены.");
      delete userStates[chatId];
      break;

    default:
      await sendMessage(chatId, "Отправьте /start для начала.");
  }

  res.sendStatus(200);
});

async function sendMessage(chatId, text) {
  await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text })
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
    })
  });
}

app.get("/", (req, res) => {
  res.send("Bot is running.");
});

app.listen(3000, () => {
  console.log("Server running on port 3000");
});
