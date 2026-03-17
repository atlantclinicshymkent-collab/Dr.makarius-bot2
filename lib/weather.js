const CITY = "Shymkent";
const WEATHER_URL = "https://wttr.in";

export async function getWeather() {
  try {
    const res = await fetch(
      `${WEATHER_URL}/${CITY}?format=j1`,
      { headers: { "User-Agent": "DrMakariusBot/1.0" } }
    );
    const data = await res.json();
    const current = data.current_condition[0];
    const today = data.weather[0];

    const temp = current.temp_C;
    const feelsLike = current.FeelsLikeC;
    const humidity = current.humidity;
    const wind = current.windspeedKmph;
    const desc = current.lang_uk?.[0]?.value || current.weatherDesc[0].value;
    const maxTemp = today.maxtempC;
    const minTemp = today.mintempC;
    const uvIndex = today.uvIndex;

    const lines = [
      `🌤️ *Погода — Шимкент*`,
      "",
      `🌡️ Зараз: *${temp}°C* (відчувається ${feelsLike}°C)`,
      `📝 ${desc}`,
      `⬆️ Макс: ${maxTemp}°C | ⬇️ Мін: ${minTemp}°C`,
      `💧 Вологість: ${humidity}%`,
      `💨 Вітер: ${wind} км/год`,
      `☀️ UV індекс: ${uvIndex}`,
    ];

    return lines.join("\n");
  } catch (err) {
    console.error("Weather error:", err);
    return "⚠️ Не вдалося отримати погоду.";
  }
}

export async function getAirQuality() {
  try {
    const res = await fetch(
      `https://api.waqi.info/feed/shymkent/?token=demo`
    );
    const data = await res.json();

    if (data.status !== "ok") {
      return "⚠️ Дані про якість повітря недоступні.";
    }

    const aqi = data.data.aqi;
    let level, emoji;
    if (aqi <= 50) { level = "Добре"; emoji = "🟢"; }
    else if (aqi <= 100) { level = "Помірно"; emoji = "🟡"; }
    else if (aqi <= 150) { level = "Нездорово для чутливих"; emoji = "🟠"; }
    else if (aqi <= 200) { level = "Нездорово"; emoji = "🔴"; }
    else { level = "Небезпечно"; emoji = "🟣"; }

    const lines = [
      `🌬️ *Якість повітря — Шимкент*`,
      "",
      `${emoji} AQI: *${aqi}* — ${level}`,
    ];

    if (aqi > 100) {
      lines.push("", "⚠️ _Краще тренуватися в приміщенні_");
    } else if (aqi <= 50) {
      lines.push("", "✅ _Можна тренуватися на вулиці_");
    }

    return lines.join("\n");
  } catch (err) {
    console.error("AQI error:", err);
    return "⚠️ Не вдалося отримати якість повітря.";
  }
}
