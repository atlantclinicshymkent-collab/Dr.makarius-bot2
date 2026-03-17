import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export async function saveExpense(amount, category, description) {
  const today = new Date().toISOString().split("T")[0];
  const { error } = await supabase.from("expenses").insert({
    date: today,
    amount,
    category: category || "інше",
    description: description || null,
  });
  if (error) throw error;
}

export async function getTodayExpenses() {
  const today = new Date().toISOString().split("T")[0];
  const { data } = await supabase
    .from("expenses")
    .select("*")
    .eq("date", today)
    .order("created_at", { ascending: true });
  return data || [];
}

export async function getMonthExpenses() {
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString().split("T")[0];
  const { data } = await supabase
    .from("expenses")
    .select("*")
    .gte("date", firstDay)
    .order("date", { ascending: true });
  return data || [];
}

export function formatTodayExpenses(expenses) {
  if (!expenses.length) return "📭 Сьогодні витрат немає. /spend 5000 обід кафе";

  const total = expenses.reduce((s, e) => s + e.amount, 0);
  const lines = ["💰 *Витрати сьогодні*", ""];

  expenses.forEach((e, i) => {
    lines.push(
      `${i + 1}. *${e.amount.toLocaleString()} ₸* — ${e.category}${e.description ? ` (${e.description})` : ""}`
    );
  });

  lines.push("", `📊 *Всього: ${total.toLocaleString()} ₸*`);
  return lines.join("\n");
}

export function formatMonthExpenses(expenses) {
  if (!expenses.length) return "📭 Цього місяця витрат немає.";

  const total = expenses.reduce((s, e) => s + e.amount, 0);

  // Групування за категоріями
  const byCategory = {};
  expenses.forEach((e) => {
    byCategory[e.category] = (byCategory[e.category] || 0) + e.amount;
  });

  const sorted = Object.entries(byCategory).sort((a, b) => b[1] - a[1]);

  const monthNames = [
    "Січень", "Лютий", "Березень", "Квітень", "Травень", "Червень",
    "Липень", "Серпень", "Вересень", "Жовтень", "Листопад", "Грудень"
  ];
  const monthName = monthNames[new Date().getMonth()];

  const lines = [`📊 *Витрати за ${monthName}*`, ""];

  sorted.forEach(([cat, sum]) => {
    const pct = Math.round((sum / total) * 100);
    lines.push(`  ${cat}: *${sum.toLocaleString()} ₸* (${pct}%)`);
  });

  lines.push("");
  lines.push(`💰 *Всього: ${total.toLocaleString()} ₸*`);
  lines.push(`📝 Записів: ${expenses.length}`);

  return lines.join("\n");
}
