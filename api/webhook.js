import { handlePhoto, handleDocument } from "../lib/vision.js";
import { handleCommand, handleCallback } from "../lib/commands.js";
import { sendMessage, answerCallback } from "../lib/telegram.js";
import { askMedical } from "../lib/medical.js";

const ALLOWED_ID = process.env.TELEGRAM_CHAT_ID;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(200).json({ ok: true });
  }

  const body = req.body || {};

  // Обробка натискання кнопки
  if (body.callback_query) {
    const cb = body.callback_query;
    const chatId = cb.message.chat.id;
    if (String(chatId) !== String(ALLOWED_ID)) return res.status(200).end();

    try {
      await answerCallback(cb.id);
      await handleCallback(cb.data, chatId, cb.message.message_id);
    } catch (err) {
      console.error("Callback error:", err.message);
    }
    return res.status(200).json({ ok: true });
  }

  // Обробка повідомлення
  const { message } = body;
  if (!message) return res.status(200).json({ ok: true });

  const chatId = message.chat.id;
  if (String(chatId) !== String(ALLOWED_ID)) return res.status(200).end();

  try {
    if (message.photo && message.photo.length > 0) {
      await handlePhoto(message, chatId);
    }
    else if (message.document) {
      await handleDocument(message, chatId);
    }
    else if (message.text?.startsWith("/")) {
      await handleCommand(message.text, chatId);
    }
    else if (message.text) {
      await sendMessage(chatId, "🩺 Аналізую...");
      const answer = await askMedical(message.text);
      await sendLong(chatId, answer);
    }
  } catch (err) {
    console.error("Webhook error:", err.message || err);
    try {
      await sendMessage(chatId, "⚠️ Щось пішло не так. Спробуй ще раз.");
    } catch (_) {}
  }

  return res.status(200).json({ ok: true });
}

async function sendLong(chatId, text) {
  if (text.length > 4000) {
    const parts = [];
    let current = "";
    for (const line of text.split("\n")) {
      if ((current + "\n" + line).length > 4000) {
        if (current) parts.push(current.trim());
        current = line;
      } else {
        current += (current ? "\n" : "") + line;
      }
    }
    if (current) parts.push(current.trim());
    for (const part of parts) {
      await sendMessage(chatId, part);
    }
  } else {
    await sendMessage(chatId, text);
  }
}
