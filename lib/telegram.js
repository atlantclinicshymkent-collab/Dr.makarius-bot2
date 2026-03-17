const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const API = `https://api.telegram.org/bot${TOKEN}`;

export async function sendMessage(chatId, text) {
  await fetch(`${API}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "Markdown",
    }),
  });
}

export async function getFileUrl(fileId) {
  const res = await fetch(`${API}/getFile?file_id=${fileId}`);
  const { result } = await res.json();
  return `https://api.telegram.org/file/bot${TOKEN}/${result.file_path}`;
}
