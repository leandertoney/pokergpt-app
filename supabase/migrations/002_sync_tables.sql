-- PokerGPT Sync Tables Migration
-- Adds tables for sessions, chats, favorites, and user preferences to enable
-- cloud sync and guest-to-user data migration

-- Add local_id to existing hands table for deduplication during sync
ALTER TABLE hands ADD COLUMN IF NOT EXISTS local_id TEXT;
ALTER TABLE hands ADD COLUMN IF NOT EXISTS synced_at TIMESTAMPTZ DEFAULT NOW();
CREATE UNIQUE INDEX IF NOT EXISTS idx_hands_local_id ON hands(user_id, local_id) WHERE local_id IS NOT NULL;

-- Sessions table
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  local_id TEXT NOT NULL, -- Original client-side ID (e.g., "session-1234567890")
  name TEXT,
  start_time BIGINT NOT NULL, -- Unix timestamp in milliseconds
  end_time BIGINT,
  stakes TEXT CHECK (stakes IN ('$1/2', '$1/3', '$2/5', '$5/10', 'custom')),
  custom_stakes TEXT,
  buy_in INTEGER,
  cash_out INTEGER,
  result INTEGER, -- Profit/loss
  location TEXT,
  table_type TEXT CHECK (table_type IN ('1/2 NL', '1/3 NL', '2/5 NL', '5/10 NL', 'PLO', 'Tournament', 'Other')),
  notes TEXT,
  hand_ids TEXT[] DEFAULT '{}', -- Array of local hand IDs
  chat_ids TEXT[] DEFAULT '{}', -- Array of local chat IDs
  is_auto_suggested BOOLEAN DEFAULT FALSE,
  created_at BIGINT, -- Client timestamp
  updated_at BIGINT, -- Client timestamp
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, local_id)
);

-- Chats table
CREATE TABLE IF NOT EXISTS chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  local_id TEXT NOT NULL, -- Original client-side ID (e.g., "chat-1234567890")
  session_id TEXT, -- Local session ID reference
  title TEXT,
  messages JSONB NOT NULL DEFAULT '[]', -- Array of ChatMessage objects
  message_count INTEGER DEFAULT 0,
  preview TEXT, -- First ~100 chars for display
  created_at BIGINT, -- Client timestamp
  updated_at BIGINT, -- Client timestamp
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, local_id)
);

-- Favorites table
CREATE TABLE IF NOT EXISTS favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  item_id TEXT NOT NULL, -- Local ID of hand or chat
  item_type TEXT NOT NULL CHECK (item_type IN ('hand', 'chat')),
  favorited_at BIGINT NOT NULL, -- Client timestamp
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, item_id, item_type)
);

-- User preferences table (voice settings, daily review state)
CREATE TABLE IF NOT EXISTS user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  voice_settings JSONB DEFAULT '{}',
  daily_review_state JSONB DEFAULT '{}',
  session_preferences JSONB DEFAULT '{}',
  updated_at BIGINT, -- Client timestamp
  synced_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_local ON sessions(user_id, local_id);
CREATE INDEX IF NOT EXISTS idx_sessions_start ON sessions(user_id, start_time DESC);
CREATE INDEX IF NOT EXISTS idx_chats_user ON chats(user_id);
CREATE INDEX IF NOT EXISTS idx_chats_local ON chats(user_id, local_id);
CREATE INDEX IF NOT EXISTS idx_chats_updated ON chats(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_favorites_user ON favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_item ON favorites(user_id, item_id, item_type);
CREATE INDEX IF NOT EXISTS idx_preferences_user ON user_preferences(user_id);

-- Row Level Security
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- Sessions policies (allow all operations, app logic handles user scoping)
CREATE POLICY "Users can insert sessions" ON sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can view sessions" ON sessions FOR SELECT USING (true);
CREATE POLICY "Users can update sessions" ON sessions FOR UPDATE USING (true);
CREATE POLICY "Users can delete sessions" ON sessions FOR DELETE USING (true);

-- Chats policies
CREATE POLICY "Users can insert chats" ON chats FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can view chats" ON chats FOR SELECT USING (true);
CREATE POLICY "Users can update chats" ON chats FOR UPDATE USING (true);
CREATE POLICY "Users can delete chats" ON chats FOR DELETE USING (true);

-- Favorites policies
CREATE POLICY "Users can insert favorites" ON favorites FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can view favorites" ON favorites FOR SELECT USING (true);
CREATE POLICY "Users can delete favorites" ON favorites FOR DELETE USING (true);

-- Preferences policies
CREATE POLICY "Users can insert preferences" ON user_preferences FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can view preferences" ON user_preferences FOR SELECT USING (true);
CREATE POLICY "Users can update preferences" ON user_preferences FOR UPDATE USING (true);
