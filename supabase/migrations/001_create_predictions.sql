-- Futurizzm Predictions Schema
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/ybnmhpxchuxbgpmpqaxv/sql

-- 1. Create predictions table
CREATE TABLE predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  model TEXT NOT NULL,              -- 'grok', 'claude', 'gpt', 'gemini'
  category TEXT NOT NULL,           -- Single trending word (e.g., "Politics")
  predictions JSONB NOT NULL,       -- [{title, chance, chanceColor, content}]
  likes_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(date, model, category)
);

-- 2. Index for fast date lookups
CREATE INDEX idx_predictions_date ON predictions(date);

-- 3. Enable pg_cron extension for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 4. Enable pg_net for HTTP requests from database
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 5. RPC function to increment likes
CREATE OR REPLACE FUNCTION increment_likes(prediction_id UUID)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE predictions 
  SET likes_count = likes_count + 1 
  WHERE id = prediction_id;
$$;

-- 6. RPC function to decrement likes
CREATE OR REPLACE FUNCTION decrement_likes(prediction_id UUID)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE predictions 
  SET likes_count = GREATEST(0, likes_count - 1) 
  WHERE id = prediction_id;
$$;

-- 7. Enable Row Level Security
ALTER TABLE predictions ENABLE ROW LEVEL SECURITY;

-- 8. Policy: Allow anyone to read predictions
CREATE POLICY "Anyone can read predictions" 
  ON predictions FOR SELECT 
  USING (true);

-- 9. Policy: Allow service role to insert/update
CREATE POLICY "Service role can insert predictions" 
  ON predictions FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Service role can update predictions" 
  ON predictions FOR UPDATE 
  USING (true);
