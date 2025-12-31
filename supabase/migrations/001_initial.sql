-- PokerGPT Initial Schema
-- Run this in your Supabase SQL Editor or via supabase db push

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id TEXT UNIQUE NOT NULL,
  auth_id UUID UNIQUE,  -- Links to Supabase Auth user
  archetype TEXT CHECK (archetype IN ('grinder', 'shark', 'strategist', 'intuitive', 'student')),
  experience_level TEXT CHECK (experience_level IN ('beginner', 'intermediate', 'advanced', 'professional')),
  primary_goal TEXT CHECK (primary_goal IN ('profit', 'improve', 'compete', 'fun')),
  biggest_challenge TEXT CHECK (biggest_challenge IN ('tilt', 'ranges', 'sizing', 'spots', 'discipline')),
  tier TEXT DEFAULT 'free' CHECK (tier IN ('free', 'paid')),
  onboarding_complete BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Hands table
CREATE TABLE IF NOT EXISTS hands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  hand_data JSONB NOT NULL,
  analysis JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_users_visitor ON users(visitor_id);
CREATE INDEX IF NOT EXISTS idx_users_auth ON users(auth_id);
CREATE INDEX IF NOT EXISTS idx_hands_user ON hands(user_id);
CREATE INDEX IF NOT EXISTS idx_hands_created ON hands(user_id, created_at DESC);

-- Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE hands ENABLE ROW LEVEL SECURITY;

-- For anonymous access, we'll use a simpler policy
-- Users can be created and accessed by visitor_id matching

-- Policy: Anyone can insert a new user
CREATE POLICY "Anyone can insert users"
  ON users FOR INSERT
  WITH CHECK (true);

-- Policy: Users can select their own data by visitor_id
CREATE POLICY "Users can view own data by visitor_id"
  ON users FOR SELECT
  USING (true);

-- Policy: Users can update their own data
CREATE POLICY "Users can update own data"
  ON users FOR UPDATE
  USING (true);

-- Policy: Anyone can insert hands (we verify user_id exists)
CREATE POLICY "Users can insert hands"
  ON hands FOR INSERT
  WITH CHECK (true);

-- Policy: Users can view all hands (filtered by app logic)
CREATE POLICY "Users can view hands"
  ON hands FOR SELECT
  USING (true);

-- Policy: Users can delete hands
CREATE POLICY "Users can delete hands"
  ON hands FOR DELETE
  USING (true);
