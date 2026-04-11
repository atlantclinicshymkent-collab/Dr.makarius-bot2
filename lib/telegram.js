const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const API = `https://api.telegram.org/bot${TOKEN}`;

export async function sendMessage(chatId, text, keyboard) {
  const body = {
    chat_id: chatId,
    text,
    parse_mode: "Markdown",
  };
  if (keyboard) {
    body.reply_markup = JSON.stringify({
      inline_keyboard: keyboard,
    });
  }
  await fetch(`${API}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function answerCallback(callbackId, text) {
  await fetch(`${API}/answerCallbackQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      callback_query_id: callbackId,
      text: text || "",
    }),
  });
}

export async function editMessage(chatId, messageId, text, keyboard) {
  const body = {
    chat_id: chatId,
    message_id: messageId,
    text,
    parse_mode: "Markdown",
  };
  if (keyboard) {
    body.reply_markup = JSON.stringify({
      inline_keyboard: keyboard,
    });
  }
  await fetch(`${API}/editMessageText`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function getFileUrl(fileId) {
  const res = await fetch(`${API}/getFile?file_id=${fileId}`);
  const { result } = await res.json();
  return `https://api.telegram.org/file/bot${TOKEN}/${result.file_path}`;
}
