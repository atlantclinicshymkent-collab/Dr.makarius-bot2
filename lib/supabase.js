import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export async function saveHealthMetrics(data) {
  const today = new Date().toISOString().split("T")[0];
  const { error } = await supabase
    .from("health_metrics")
    .upsert({
      date: today,
      resting_hr: data.resting_hr ?? null,
      hrv: data.hrv ?? null,
      sleep_hours: data.sleep_hours ?? null,
      sleep_score: data.sleep_score ?? null,
      deep_sleep_min: data.deep_sleep_min ?? null,
      rem_sleep_min: data.rem_sleep_min ?? null,
      recovery_pct: data.recovery_pct ?? null,
      training_load: data.training_load ?? null,
      raw_data: data,
    }, { onConflict: "date" });
  if (error) throw error;
}

export async function getLastHealth() {
  const { data } = await supabase
    .from("health_metrics")
    .select("*")
    .order("date", { ascending: false })
    .limit(1)
    .single();
  return data;
}

export async function getHealthRange(days) {
  const from = new Date();
  from.setDate(from.getDate() - days);
  const { data } = await supabase
    .from("health_metrics")
    .select("*")
    .gte("date", from.toISOString().split("T")[0])
    .order("date", { ascending: true });
  return data || [];
}

export async function saveWorkout(data) {
  const today = new Date().toISOString().split("T")[0];
  const { error } = await supabase.from("workouts").insert({
    date: today,
    type: data.workout_type || "unknown",
    duration_min: data.duration_min ?? null,
    distance_km: data.distance_km ?? null,
    avg_hr: data.avg_hr ?? null,
    max_hr: data.max_hr ?? null,
    calories: data.calories ?? null,
    avg_pace: data.avg_pace ?? null,
    training_effect: data.training_effect ?? null,
    raw_data: data,
  });
  if (error) throw error;
}

export async function getWeekWorkouts() {
  const from = new Date();
  from.setDate(from.getDate() - 7);
  const { data } = await supabase
    .from("workouts")
    .select("*")
    .gte("date", from.toISOString().split("T")[0])
    .order("date", { ascending: true });
  return data || [];
}

export async function saveNutrition(calories, description, mealType) {
  const today = new Date().toISOString().split("T")[0];
  const { error } = await supabase.from("nutrition").insert({
    date: today,
    calories,
    description: description || null,
    meal_type: mealType || null,
  });
  if (error) throw error;
}

export async function getTodayCalories() {
  const today = new Date().toISOString().split("T")[0];
  const { data } = await supabase
    .from("nutrition")
    .select("*")
    .eq("date", today)
    .order("created_at", { ascending: true });
  return data || [];
}

export async function saveScreenshot(fileId, parsedType, parsedData, confidence) {
  const { error } = await supabase.from("screenshots").insert({
    telegram_file_id: fileId,
    parsed_type: parsedType,
    parsed_data: parsedData,
    confidence,
  });
  if (error) throw error;
}

export async function ping() {
  const { data } = await supabase
    .from("health_metrics")
    .select("id")
    .limit(1);
  return !!data;
}
