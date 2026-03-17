-- Dr. Makarius Bot — Supabase Schema
-- Скопіюй все це в SQL Editor → Run

CREATE TABLE health_metrics (
  id BIGSERIAL PRIMARY KEY,
  date DATE NOT NULL,
  resting_hr INTEGER,
  hrv NUMERIC(5,1),
  sleep_hours NUMERIC(3,1),
  sleep_score INTEGER,
  deep_sleep_min INTEGER,
  rem_sleep_min INTEGER,
  recovery_pct INTEGER,
  training_load INTEGER,
  source TEXT DEFAULT 'screenshot',
  raw_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(date)
);

CREATE TABLE workouts (
  id BIGSERIAL PRIMARY KEY,
  date DATE NOT NULL,
  type TEXT NOT NULL,
  duration_min INTEGER,
  distance_km NUMERIC(5,2),
  avg_hr INTEGER,
  max_hr INTEGER,
  calories INTEGER,
  avg_pace TEXT,
  training_effect NUMERIC(2,1),
  notes TEXT,
  source TEXT DEFAULT 'screenshot',
  raw_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE nutrition (
  id BIGSERIAL PRIMARY KEY,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  meal_type TEXT,
  calories INTEGER NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE screenshots (
  id BIGSERIAL PRIMARY KEY,
  telegram_file_id TEXT NOT NULL,
  parsed_type TEXT,
  parsed_data JSONB,
  confidence NUMERIC(3,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
