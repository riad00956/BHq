require("dotenv").config();
const TelegramBot = require("node-telegram-bot-api");
const express = require("express");
const fs = require("fs");

const token = process.env.BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });
const app = express();
const PORT = process.env.PORT || 5000;
const ADMIN_ID = process.env.ADMIN_ID;

app.get("/", (req, res) => {
  res.send("✅ FX TOP UP BOT 💎 is running!");
});
app.listen(PORT, () => console.log("Server running on port", PORT));

const plans = JSON.parse(fs.readFileSync("Plans.json"));
const ordersFile = "orders.json";
if (!fs.existsSync(ordersFile)) fs.writeFileSync(ordersFile, "[]");

// /start
bot.onText(/\/start/, (msg) => {
  const welcome = `🎮 স্বাগতম ${msg.from.first_name}!\n\nএই বটের মাধ্যমে আপনি সহজেই Free Fire Diamond অর্ডার করতে পারবেন।

💎 প্যাকেজ দেখতে /plans
💰 পেমেন্ট নিয়ম জানতে /payment
📝 অর্ডার করতে /order
❓ সাহায্য পেতে /help`;
  bot.sendMessage(msg.chat.id, welcome);
});

// /plans (inline keyboard)
bot.onText(/\/plans/, (msg) => {
  const keyboard = plans.map(plan => [
    { text: `${plan.code} - ${plan.name} (${plan.price})`, callback_data: plan.code }
  ]);
  bot.sendMessage(msg.chat.id, "💎 প্যাকেজ সিলেক্ট করুন:", {
    reply_markup: {
      inline_keyboard: keyboard
    }
  });
});

bot.on("callback_query", (query) => {
  const chatId = query.message.chat.id;
  const plan = plans.find(p => p.code === query.data);
  if (plan) {
    bot.sendMessage(chatId, `✅ আপনি ${plan.name} (${plan.price}) প্ল্যান সিলেক্ট করেছেন।\n👉 এখন /order দিয়ে অর্ডার করুন।`);
  }
});

// /payment
bot.onText(/\/payment/, (msg) => {
  const text = `💳 পেমেন্ট করুন:\n📌 bKash: ${process.env.BKASH_NUMBER}\n📌 Nagad: ${process.env.NAGAD_NUMBER}\n\nপেমেন্ট শেষে /order দিন।`;
  bot.sendMessage(msg.chat.id, text);
});

// /order
bot.onText(/\/order/, (msg) => {
  const instruction = `📝 নিচের তথ্যগুলো লিখুন:\n\n1. Free Fire ID:\n2. প্যাকেজ কোড (যেমন FX1):\n3. পেমেন্ট মাধ্যম (bKash/Nagad):\n4. Sender Number:\n5. TXN ID:\n\n👉 উদাহরণ:\nFree Fire ID: 123456789\nPackage: FX2\nPayment: bKash\nSender: 01XXXXXXXXX\nTXN ID: XXXXXX`;
  bot.sendMessage(msg.chat.id, instruction);
});

bot.on("message", (msg) => {
  if (msg.text && msg.text.includes("Free Fire ID")) {
    const order = {
      user: msg.from.username || msg.from.first_name,
      id: msg.chat.id,
      text: msg.text,
      time: new Date().toISOString()
    };
    const orders = JSON.parse(fs.readFileSync(ordersFile));
    orders.push(order);
    fs.writeFileSync(ordersFile, JSON.stringify(orders, null, 2));

    bot.sendMessage(msg.chat.id, "✅ অর্ডার গ্রহণ করা হয়েছে। ৫-১০ মিনিটের মধ্যে ডেলিভারি পাবেন।");
    bot.sendMessage(ADMIN_ID, `📥 নতুন অর্ডার:\n\n${msg.text}\nFrom: @${msg.from.username || "NoUsername"}`);
  }
});

// /orders (admin only)
bot.onText(/\/orders/, (msg) => {
  if (msg.from.id.toString() !== ADMIN_ID) return;
  const orders = JSON.parse(fs.readFileSync(ordersFile));
  let text = "📦 সর্বশেষ অর্ডারসমূহ:\n\n";
  orders.slice(-5).forEach((o, i) => {
    text += `${i + 1}. ${o.text}\n— ${o.user}\n\n`;
  });
  bot.sendMessage(msg.chat.id, text || "❌ কোন অর্ডার পাওয়া যায়নি।");
});

// /help
bot.onText(/\/help/, (msg) => {
  bot.sendMessage(msg.chat.id, "❓ সাহায্য দরকার হলে /order বা /plans লিখুন, অথবা আমাদের সাথে যোগাযোগ করুন " + process.env.ADMIN_CONTACT);
});
