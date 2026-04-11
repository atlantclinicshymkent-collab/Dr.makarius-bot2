import { handlePhoto, handleDocument } from "../lib/vision.js";
import { handleCommand } from "../lib/commands.js";
import { sendMessage } from "../lib/telegram.js";
import { askMedical } from "../lib/medical.js";

const ALLOWED_ID = process.env.TELEGRAM_CHAT_ID;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(200).json({ ok: true, method: req.method });
  }

  const { message } = req.body || {};
  if (!message) {
    return res.status(200).json({ ok: true, note: "no message" });
  }

  const chatId = message.chat.id;
  if (String(chatId) !== String(ALLOWED_ID)) {
    return res.status(200).end();
  }

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
      await sendMessage(chatId, "🩺 Аналізую за міжнародними протоколами...");
      const answer = await askMedical(message.text);
      await sendMessage(chatId, answer);
    }
  } catch (err) {
    console.error("Webhook error:", err.message || err);
    try {
      await sendMessage(chatId, "⚠️ Щось пішло не так. Спробуй ще раз.");
    } catch (_) {}
  }

  return res.status(200).json({ ok: true });
}
