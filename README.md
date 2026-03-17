# 🤖 Dr. Makarius — Telegram Health Bot

Персональний бот для аналітики здоров'я та тренувань.
COROS VERTIX → Скріншот → Claude Vision → Supabase → Telegram

## 🚀 Швидкий старт

### 1. Supabase
- Створи проєкт на [supabase.com](https://supabase.com)
- Відкрий SQL Editor → виконай SQL з файлу `schema.sql` (нижче)
- Збережи **Project URL** та **anon key** (Settings → API)

### 2. Vercel
- Імпортуй цей репо на [vercel.com](https://vercel.com)
- Додай Environment Variables:

| Змінна | Звідки |
|--------|--------|
| `TELEGRAM_BOT_TOKEN` | @BotFather |
| `TELEGRAM_CHAT_ID` | @userinfobot |
| `SUPABASE_URL` | Supabase Settings → API |
| `SUPABASE_ANON_KEY` | Supabase Settings → API |
| `ANTHROPIC_API_KEY` | console.anthropic.com |
| `CRON_SECRET` | Будь-який рядок 16+ символів |

- Натисни Deploy

### 3. Webhook
Після деплою відкрий в браузері:
```
https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://<YOUR-APP>.vercel.app/api/webhook
```

### 4. GitHub Secrets
Додай в Settings → Secrets → Actions:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

---

## 📋 Команди бота

| Команда | Опис |
|---------|------|
| 📸 Фото | Скріншот COROS → авторозпізнавання |
| `/health` | HRV, пульс, сон, відновлення |
| `/sleep` | Деталі сну |
| `/heart` | Кардіо + тренд HRV |
| `/week` | Тижневий звіт |
| `/eat 350 обід` | Записати калорії |
| `/calories` | Баланс калорій |
| `/train біг 5км 28хв` | Записати тренування |
| `/trends 30` | Тренди за N днів |

---

## 💰 Вартість

- Vercel Hobby: **$0**
- Supabase Free: **$0**
- GitHub Free: **$0**
- Claude API: **~$1-3/міс** (за скріншоти)
