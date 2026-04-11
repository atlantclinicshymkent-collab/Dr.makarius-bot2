import { sendMessage, editMessage } from "./telegram.js";
import {
  getLastHealth, getHealthRange, getWeekWorkouts,
  saveNutrition, getTodayCalories, saveWorkout,
} from "./supabase.js";
import { getWeather, getAirQuality } from "./weather.js";
import {
  saveExpense, getTodayExpenses, getMonthExpenses,
  formatTodayExpenses, formatMonthExpenses,
} from "./finance.js";
import { askMedical, askProtocol, askClinicalCase, askMedicalNews } from "./medical.js";

// ── МЕНЮ КНОПОК ──

const MAIN_MENU = [
  [{ text: "🏥 Здоров'я", callback_data: "menu_health" }, { text: "🩺 Медицина", callback_data: "menu_medical" }],
  [{ text: "🏃 Тренування", callback_data: "menu_training" }, { text: "🍽️ Калорії", callback_data: "menu_food" }],
  [{ text: "🌤️ Погода", callback_data: "menu_weather" }, { text: "💰 Фінанси", callback_data: "menu_finance" }],
  [{ text: "☀️ Брифінг дня", callback_data: "cmd_briefing" }],
];

const HEALTH_MENU = [
  [{ text: "❤️ Здоров'я", callback_data: "cmd_health" }, { text: "😴 Сон", callback_data: "cmd_sleep" }],
  [{ text: "💓 Кардіо", callback_data: "cmd_heart" }, { text: "📈 Тренди 7д", callback_data: "cmd_trends7" }],
  [{ text: "📊 Тижневий звіт", callback_data: "cmd_week" }],
  [{ text: "⬅️ Назад", callback_data: "menu_main" }],
];

const MEDICAL_MENU = [
  [{ text: "📋 Протоколи", callback_data: "info_protocols" }, { text: "📚 Клін. випадки", callback_data: "info_cases" }],
  [{ text: "📰 Новини", callback_data: "cmd_news" }, { text: "🧪 Аналізи", callback_data: "info_labs" }],
  [{ text: "⬅️ Назад", callback_data: "menu_main" }],
];

const TRAINING_MENU = [
  [{ text: "📊 Тижневий звіт", callback_data: "cmd_week" }],
  [{ text: "📈 Тренди 7д", callback_data: "cmd_trends7" }, { text: "📈 Тренди 30д", callback_data: "cmd_trends30" }],
  [{ text: "⬅️ Назад", callback_data: "menu_main" }],
];

const FOOD_MENU = [
  [{ text: "📊 Калорії сьогодні", callback_data: "cmd_calories" }],
  [{ text: "⬅️ Назад", callback_data: "menu_main" }],
];

const WEATHER_MENU = [
  [{ text: "🌡️ Погода", callback_data: "cmd_weather" }, { text: "🌬️ Повітря", callback_data: "cmd_air" }],
  [{ text: "⬅️ Назад", callback_data: "menu_main" }],
];

const FINANCE_MENU = [
  [{ text: "💸 Сьогодні", callback_data: "cmd_expenses" }, { text: "📊 Місяць", callback_data: "cmd_month" }],
  [{ text: "⬅️ Назад", callback_data: "menu_main" }],
];

// ── ОБРОБКА КОМАНД ──

export async function handleCommand(text, chatId) {
  const cmd = text.split(" ")[0].toLowerCase();
  const args = text.slice(cmd.length).trim();

  switch (cmd) {
    case "/start":
    case "/menu":
      return sendMessage(chatId, "👋 *Привіт, Макар!*\nОбери розділ:", MAIN_MENU);
    case "/help": return sendMessage(chatId, HELP);
    case "/health": return cmdHealth(chatId);
    case "/sleep": return cmdSleep(chatId);
    case "/heart": return cmdHeart(chatId);
    case "/week": return cmdWeek(chatId);
    case "/eat": return cmdEat(chatId, args);
    case "/calories": return cmdCalories(chatId);
    case "/train": return cmdTrain(chatId, args);
    case "/trends": return cmdTrends(chatId, args);
    case "/weather": return cmdWeather(chatId);
    case "/air": return cmdAir(chatId);
    case "/spend": return cmdSpend(chatId, args);
    case "/expenses": return cmdExpenses(chatId);
    case "/month": return cmdMonth(chatId);
    case "/briefing": return cmdBriefing(chatId);
    case "/ask": return cmdAsk(chatId, args);
    case "/protocols": return cmdProtocols(chatId, args);
    case "/cases": return cmdCases(chatId, args);
    case "/news": return cmdNews(chatId, args);
    default: return sendMessage(chatId, "🤔 Невідома команда.", MAIN_MENU);
  }
}

// ── ОБРОБКА КНОПОК ──

export async function handleCallback(data, chatId, messageId) {
  switch (data) {
    case "menu_main":
      return editMessage(chatId, messageId, "🏠 *Головне меню*\nОбери розділ:", MAIN_MENU);
    case "menu_health":
      return editMessage(chatId, messageId, "🏥 *Здоров'я та COROS*\n📸 Надішли скріншот COROS або обери:", HEALTH_MENU);
    case "menu_medical":
      return editMessage(chatId, messageId, "🩺 *Медицина*\n💬 Напиши питання або обери:", MEDICAL_MENU);
    case "menu_training":
      return editMessage(chatId, messageId, "🏃 *Тренування*\nЗапис: /train біг 5км 28хв", TRAINING_MENU);
    case "menu_food":
      return editMessage(chatId, messageId, "🍽️ *Калорії*\nЗапис: /eat 350 обід курка", FOOD_MENU);
    case "menu_weather":
      return editMessage(chatId, messageId, "🌤️ *Погода та повітря — Шимкент*", WEATHER_MENU);
    case "menu_finance":
      return editMessage(chatId, messageId, "💰 *Фінанси*\nЗапис: /spend 5000 обід кафе", FINANCE_MENU);

    case "info_protocols":
      return sendMessage(chatId, "📋 *Пошук протоколів*\n\nНапиши:\n/protocols остеоартроз\n/protocols ревматоїдний артрит\n/protocols діабет 2 типу");
    case "info_cases":
      return sendMessage(chatId, "📚 *Клінічні випадки*\n\nНапиши:\n/cases грижа L5-S1\n/cases подагричний артрит\n/cases гонартроз 3 ст");
    case "info_labs":
      return sendMessage(chatId, "🧪 *Аналізи*\n\nНадішли:\n📸 Фото аналізу\n📄 PDF файл\n\nБот автоматично розпізнає та інтерпретує.");

    case "cmd_health": return cmdHealth(chatId);
    case "cmd_sleep": return cmdSleep(chatId);
    case "cmd_heart": return cmdHeart(chatId);
    case "cmd_week": return cmdWeek(chatId);
    case "cmd_trends7": return cmdTrends(chatId, "7");
    case "cmd_trends30": return cmdTrends(chatId, "30");
    case "cmd_calories": return cmdCalories(chatId);
    case "cmd_weather": return cmdWeather(chatId);
    case "cmd_air": return cmdAir(chatId);
    case "cmd_expenses": return cmdExpenses(chatId);
    case "cmd_month": return cmdMonth(chatId);
    case "cmd_briefing": return cmdBriefing(chatId);
    case "cmd_news": return cmdNews(chatId, "");
  }
}

// ── ФУНКЦІЇ КОМАНД ──

async function cmdHealth(chatId) {
  const h = await getLastHealth();
  if (!h) return sendMessage(chatId, "📭 Немає даних. Надішли скріншот COROS!", HEALTH_MENU);
  const lines = [`🏥 *Здоров'я* (${h.date})`, ""];
  if (h.resting_hr) lines.push(`❤️ Пульс: *${h.resting_hr}* уд/хв`);
  if (h.hrv) lines.push(`📊 HRV: *${h.hrv}* мс`);
  if (h.sleep_hours) lines.push(`😴 Сон: *${h.sleep_hours}* год`);
  if (h.sleep_score) lines.push(`⭐ Якість сну: *${h.sleep_score}*`);
  if (h.recovery_pct) lines.push(`🔋 Відновлення: *${h.recovery_pct}%*`);
  if (h.training_load) lines.push(`🏋️ Навантаження: *${h.training_load}*`);
  const week = await getHealthRange(7);
  if (week.length >= 2) {
    lines.push("", "*Тренд за тиждень:*");
    const a = avg(week, "hrv"); if (a) lines.push(`  HRV: ${a.toFixed(1)} мс`);
    const b = avg(week, "resting_hr"); if (b) lines.push(`  Пульс: ${b.toFixed(0)}`);
    const c = avg(week, "sleep_hours"); if (c) lines.push(`  Сон: ${c.toFixed(1)} год`);
  }
  return sendMessage(chatId, lines.join("\n"), [[{ text: "⬅️ Меню", callback_data: "menu_main" }]]);
}

async function cmdSleep(chatId) {
  const h = await getLastHealth();
  if (!h) return sendMessage(chatId, "📭 Немає даних про сон.");
  const lines = [`😴 *Сон* (${h.date})`, ""];
  if (h.sleep_hours) lines.push(`⏱️ Тривалість: *${h.sleep_hours}* год`);
  if (h.sleep_score) lines.push(`⭐ Якість: *${h.sleep_score}*`);
  if (h.deep_sleep_min) lines.push(`🌊 Глибокий: *${h.deep_sleep_min}* хв`);
  if (h.rem_sleep_min) lines.push(`💭 REM: *${h.rem_sleep_min}* хв`);
  return sendMessage(chatId, lines.join("\n"), [[{ text: "⬅️ Меню", callback_data: "menu_main" }]]);
}

async function cmdHeart(chatId) {
  const h = await getLastHealth();
  if (!h) return sendMessage(chatId, "📭 Немає кардіо-даних.");
  const lines = [`❤️ *Кардіо* (${h.date})`, ""];
  if (h.resting_hr) lines.push(`💓 Пульс спокою: *${h.resting_hr}* уд/хв`);
  if (h.hrv) lines.push(`📊 HRV: *${h.hrv}* мс`);
  if (h.hrv) {
    if (h.hrv >= 60) lines.push("  🟢 Відмінно");
    else if (h.hrv >= 40) lines.push("  🟡 Норма");
    else lines.push("  🔴 Низький — відпочинок");
  }
  return sendMessage(chatId, lines.join("\n"), [[{ text: "⬅️ Меню", callback_data: "menu_main" }]]);
}

async function cmdWeek(chatId) {
  const health = await getHealthRange(7);
  const workouts = await getWeekWorkouts();
  const lines = ["📊 *Тижневий звіт*", ""];
  if (workouts.length > 0) {
    lines.push(`🏃 Тренувань: *${workouts.length}*`);
    const km = workouts.reduce((s, w) => s + (Number(w.distance_km) || 0), 0);
    const cal = workouts.reduce((s, w) => s + (w.calories || 0), 0);
    if (km > 0) lines.push(`📏 Дистанція: *${km.toFixed(1)}* км`);
    if (cal > 0) lines.push(`🔥 Калорії: *${cal}* ккал`);
  } else {
    lines.push("🏃 Тренувань: немає");
  }
  if (health.length > 0) {
    lines.push("", "*Середні:*");
    const a = avg(health, "hrv"); if (a) lines.push(`  📊 HRV: ${a.toFixed(1)} мс`);
    const b = avg(health, "resting_hr"); if (b) lines.push(`  ❤️ Пульс: ${b.toFixed(0)}`);
    const c = avg(health, "sleep_hours"); if (c) lines.push(`  😴 Сон: ${c.toFixed(1)} год`);
  }
  return sendMessage(chatId, lines.join("\n"), [[{ text: "⬅️ Меню", callback_data: "menu_main" }]]);
}

async function cmdEat(chatId, args) {
  if (!args) return sendMessage(chatId, "🍽️ Формат: /eat 350 обід курка рис");
  const match = args.match(/^(\d+)\s*(.*)?$/);
  if (!match) return sendMessage(chatId, "⚠️ Формат: /eat 350 обід курка");
  const cal = parseInt(match[1], 10);
  const desc = match[2] || "";
  let meal = null;
  const l = desc.toLowerCase();
  if (l.includes("сніданок") || l.includes("ранок")) meal = "сніданок";
  else if (l.includes("обід")) meal = "обід";
  else if (l.includes("вечер")) meal = "вечеря";
  else if (l.includes("перекус")) meal = "перекус";
  await saveNutrition(cal, desc, meal);
  const today = await getTodayCalories();
  const total = today.reduce((s, n) => s + n.calories, 0);
  return sendMessage(chatId, `✅ *${cal}* ккал${desc ? ` (${desc})` : ""}\n📊 Всього: *${total}* ккал`);
}

async function cmdCalories(chatId) {
  const today = await getTodayCalories();
  if (!today.length) return sendMessage(chatId, "📭 Немає записів. /eat 350 опис");
  const total = today.reduce((s, n) => s + n.calories, 0);
  const lines = ["🍽️ *Калорії сьогодні*", ""];
  today.forEach((n, i) => {
    lines.push(`${i + 1}. *${n.calories}* ккал${n.description ? ` (${n.description})` : ""}`);
  });
  lines.push("", `📊 *Всього: ${total} ккал*`);
  return sendMessage(chatId, lines.join("\n"), [[{ text: "⬅️ Меню", callback_data: "menu_main" }]]);
}

async function cmdTrain(chatId, args) {
  if (!args) return sendMessage(chatId, "🏃 Формат: /train біг 5км 28хв");
  const parts = args.toLowerCase().split(/\s+/);
  const data = { workout_type: parts[0] };
  for (const p of parts) {
    const km = p.match(/^([\d.]+)км$/);
    const min = p.match(/^(\d+)хв$/);
    if (km) data.distance_km = parseFloat(km[1]);
    if (min) data.duration_min = parseInt(min[1], 10);
  }
  if (!data.calories && data.distance_km && data.workout_type === "біг") {
    data.calories = Math.round(data.distance_km * 70);
  }
  await saveWorkout(data);
  let r = `✅ *${data.workout_type}*`;
  if (data.distance_km) r += ` ${data.distance_km} км`;
  if (data.duration_min) r += ` ${data.duration_min} хв`;
  if (data.calories) r += ` 🔥 ${data.calories} ккал`;
  return sendMessage(chatId, r);
}

async function cmdTrends(chatId, args) {
  const days = parseInt(args, 10) || 7;
  const health = await getHealthRange(days);
  if (health.length < 2) return sendMessage(chatId, `📭 Мало даних за ${days} днів.`);
  const lines = [`📈 *Тренди за ${days} днів*`, ""];
  const hrvs = health.filter(h => h.hrv).map(h => Number(h.hrv));
  if (hrvs.length >= 2) {
    lines.push(`📊 HRV: ${Math.min(...hrvs)}–${Math.max(...hrvs)} мс`);
    const trend = hrvs[hrvs.length - 1] - hrvs[0];
    lines.push(`  ${trend > 0 ? "📈 +" : "📉 "}${trend.toFixed(1)} мс`);
  }
  const rhrs = health.filter(h => h.resting_hr).map(h => h.resting_hr);
  if (rhrs.length >= 2) {
    lines.push(`❤️ Пульс: ${Math.min(...rhrs)}–${Math.max(...rhrs)} уд/хв`);
  }
  return sendMessage(chatId, lines.join("\n"), [[{ text: "⬅️ Меню", callback_data: "menu_main" }]]);
}

async function cmdWeather(chatId) {
  const text = await getWeather();
  return sendMessage(chatId, text, [[{ text: "🌬️ Повітря", callback_data: "cmd_air" }, { text: "⬅️ Меню", callback_data: "menu_main" }]]);
}

async function cmdAir(chatId) {
  const text = await getAirQuality();
  return sendMessage(chatId, text, [[{ text: "🌡️ Погода", callback_data: "cmd_weather" }, { text: "⬅️ Меню", callback_data: "menu_main" }]]);
}

async function cmdSpend(chatId, args) {
  if (!args) return sendMessage(chatId, "💰 Формат: /spend 5000 обід кафе");
  const match = args.match(/^(\d+)\s*(.*)?$/);
  if (!match) return sendMessage(chatId, "⚠️ Формат: /spend 5000 обід кафе");
  const amount = parseInt(match[1], 10);
  const desc = match[2] || "";
  const category = detectCategory(desc);
  await saveExpense(amount, category, desc);
  const today = await getTodayExpenses();
  const total = today.reduce((s, e) => s + e.amount, 0);
  return sendMessage(chatId, `✅ *${amount.toLocaleString()} ₸* — ${category}${desc ? ` (${desc})` : ""}\n📊 Сьогодні: *${total.toLocaleString()} ₸*`);
}

async function cmdExpenses(chatId) {
  const text = formatTodayExpenses(await getTodayExpenses());
  return sendMessage(chatId, text, [[{ text: "📊 Місяць", callback_data: "cmd_month" }, { text: "⬅️ Меню", callback_data: "menu_main" }]]);
}

async function cmdMonth(chatId) {
  const text = formatMonthExpenses(await getMonthExpenses());
  return sendMessage(chatId, text, [[{ text: "💸 Сьогодні", callback_data: "cmd_expenses" }, { text: "⬅️ Меню", callback_data: "menu_main" }]]);
}

async function cmdBriefing(chatId) {
  const lines = ["☀️ *Доброго дня, Макар!*", ""];
  lines.push(await getWeather(), "");
  lines.push(await getAirQuality(), "");
  const h = await getLastHealth();
  if (h) {
    lines.push("🏥 *Здоров'я:*");
    if (h.resting_hr) lines.push(`  ❤️ Пульс: ${h.resting_hr}`);
    if (h.hrv) lines.push(`  📊 HRV: ${h.hrv} мс`);
    if (h.sleep_hours) lines.push(`  😴 Сон: ${h.sleep_hours} год`);
    lines.push("");
  }
  const expenses = await getTodayExpenses();
  if (expenses.length > 0) {
    const total = expenses.reduce((s, e) => s + e.amount, 0);
    lines.push(`💰 Витрати: *${total.toLocaleString()} ₸*`);
  }
  return sendMessage(chatId, lines.join("\n"), MAIN_MENU);
}

async function cmdAsk(chatId, question) {
  if (!question) return sendMessage(chatId, "🩺 Напиши питання або обери:", MEDICAL_MENU);
  await sendMessage(chatId, "🩺 Аналізую...");
  return sendLong(chatId, await askMedical(question));
}

async function cmdProtocols(chatId, args) {
  if (!args) return sendMessage(chatId, "📋 Формат: /protocols діагноз\n\nНапр: /protocols остеоартроз");
  await sendMessage(chatId, "📋 Шукаю протоколи...");
  return sendLong(chatId, await askProtocol(args));
}

async function cmdCases(chatId, args) {
  if (!args) return sendMessage(chatId, "📚 Формат: /cases тема\n\nНапр: /cases грижа L5-S1");
  await sendMessage(chatId, "📚 Створюю клінічний випадок...");
  return sendLong(chatId, await askClinicalCase(args));
}

async function cmdNews(chatId, args) {
  await sendMessage(chatId, "📰 Збираю новини...");
  return sendLong(chatId, await askMedicalNews(args));
}

// ── HELPERS ──

async function sendLong(chatId, text) {
  if (text.length > 4000) {
    const parts = splitMessage(text, 4000);
    for (let i = 0; i < parts.length; i++) {
      if (i === parts.length - 1) {
        await sendMessage(chatId, parts[i], [[{ text: "⬅️ Меню", callback_data: "menu_main" }]]);
      } else {
        await sendMessage(chatId, parts[i]);
      }
    }
  } else {
    await sendMessage(chatId, text, [[{ text: "⬅️ Меню", callback_data: "menu_main" }]]);
  }
}

function splitMessage(text, maxLength) {
  const parts = [];
  let current = "";
  for (const line of text.split("\n")) {
    if ((current + "\n" + line).length > maxLength) {
      if (current) parts.push(current.trim());
      current = line;
    } else {
      current += (current ? "\n" : "") + line;
    }
  }
  if (current) parts.push(current.trim());
  return parts;
}

function detectCategory(text) {
  const l = text.toLowerCase();
  if (l.includes("їжа") || l.includes("обід") || l.includes("кафе") || l.includes("ресторан") || l.includes("продукт") || l.includes("сніданок") || l.includes("вечер")) return "🍽️ їжа";
  if (l.includes("таксі") || l.includes("бензин") || l.includes("транспорт") || l.includes("авто")) return "🚗 транспорт";
  if (l.includes("аптека") || l.includes("лік") || l.includes("здоров") || l.includes("клінік")) return "💊 здоров'я";
  if (l.includes("одяг") || l.includes("взуття")) return "👕 одяг";
  if (l.includes("дім") || l.includes("оренда") || l.includes("комунал")) return "🏠 дім";
  if (l.includes("розваг") || l.includes("кіно") || l.includes("підписк")) return "🎮 розваги";
  return "📦 інше";
}

function avg(arr, field) {
  const v = arr.filter(d => d[field] != null).map(d => Number(d[field]));
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
}

const HELP = `📋 *Усі команди:*

📸 Фото — COROS або аналізи
📄 PDF — аналізи
💬 Текст — медичний AI
/menu — головне меню з кнопками

/health /sleep /heart /week /trends
/eat /calories /train
/weather /air
/spend /expenses /month
/protocols /cases /news /ask
/briefing — звіт дня`;
