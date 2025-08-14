import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.json());

const TOKEN = process.env.BOT_TOKEN;
const TELEGRAM_API = `https://api.telegram.org/bot${TOKEN}`;
const ADMIN_ID = "5365915138"; // Your Telegram ID

const userState = {};

async function sendMessage(chatId, text, reply_markup = null) {
  await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      reply_markup
    }),
  });
}

app.post("/webhook", async (req, res) => {
  const message = req.body.message;
  if (!message) return res.sendStatus(200);

  const chatId = message.chat.id;
  const text = message.text?.trim();

  // Allow restart anytime
  if (text === "/start") {
    userState[chatId] = { step: "name" };
    await sendMessage(chatId, "👋 Добро пожаловать! Пожалуйста, введите ваше полное имя:");
    return res.sendStatus(200);
  }

  const state = userState[chatId] || {};

  if (state.step === "name") {
    state.name = text;
    state.step = "phone";
    await sendMessage(chatId, "📱 Введите ваш номер телефона:");
  } 
  else if (state.step === "phone") {
    state.phone = text;
    state.step = "marketplace";
    await sendMessage(chatId, "Выберите маркетплейс:", {
      keyboard: [["Wildberries"], ["Yandex"], ["Ozon"]],
      resize_keyboard: true,
      one_time_keyboard: true
    });
  }
  else if (state.step === "marketplace") {
    state.marketplace = text;
    if (text === "Wildberries") {
      state.step = "wb-type";
      await sendMessage(chatId, "Выберите тип:", {
        keyboard: [["FBS"], ["FBW"]],
        resize_keyboard: true,
        one_time_keyboard: true
      });
    } else if (text === "Yandex") {
      state.step = "warehouse";
      await sendMessage(chatId, "Выберите склад:", {
        keyboard: [["Yandex Market-Южный ворота"]],
        resize_keyboard: true,
        one_time_keyboard: true
      });
    } else if (text === "Ozon") {
      state.step = "warehouse";
      await sendMessage(chatId, "Выберите склад:", {
        keyboard: [["OZON-Южный ворота"]],
        resize_keyboard: true,
        one_time_keyboard: true
      });
    }
  }
  else if (state.step === "wb-type") {
    state.type = text;
    state.step = "warehouse";
    if (text === "FBS") {
      await sendMessage(chatId, "Выберите склад:", {
        keyboard: [["Белая дача"], ["Видное"], ["Обухово"]],
        resize_keyboard: true,
        one_time_keyboard: true
      });
    } else if (text === "FBW") {
      await sendMessage(chatId, "Выберите склад:", {
        keyboard: [["Екатеринбург"], ["Казань"], ["Коледино"], ["Краснодар"], ["Невинномысск"], ["Новосемейкино"], ["Подольск"], ["Тула"], ["Электросталь"]],
        resize_keyboard: true,
        one_time_keyboard: true
      });
    }
  }
  else if (state.step === "warehouse") {
    state.warehouse = text;
    state.step = "measurements";
    await sendMessage(chatId, "📦 Введите количество, вес и размеры (высота, ширина, длина):");
  }
  else if (state.step === "measurements") {
    state.measurements = text;

    // Send order to admin
    const orderText = `
🆕 Новый заказ:
Имя: ${state.name}
Телефон: ${state.phone}
Маркетплейс: ${state.marketplace}
Тип: ${state.type || "FBS"}
Склад: ${state.warehouse}
Детали: ${state.measurements}
    `;
    await sendMessage(ADMIN_ID, orderText);

    await sendMessage(chatId, "✅ Спасибо! Мы свяжемся с вами в ближайшее время для уточнения цены.");
    delete userState[chatId];
  }

  userState[chatId] = state;
  res.sendStatus(200);
});

app.get("/", (req, res) => {
  res.send("Bot is running.");
});

app.listen(3000, () => {
  console.log("Server running on port 3000");
});
