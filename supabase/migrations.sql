-- ============================================
-- PROFILES TABLE
-- Supplements auth.users with game-specific data.
-- Only registered (non-anonymous) users get a row.
-- ============================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  games_played INT DEFAULT 0,
  games_won INT DEFAULT 0
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read" ON profiles
  FOR SELECT USING (true);

CREATE POLICY "Owner update" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Owner insert" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- ============================================
-- MATCH RESULTS TABLE
-- One row per completed game.
-- ============================================
CREATE TABLE IF NOT EXISTS match_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID REFERENCES matches(id),
  winner_name TEXT NOT NULL,
  winner_id UUID,                -- NULL if winner was anonymous
  players JSONB NOT NULL,        -- Array of { id, name, points, cards, isRegistered }
  total_turns INT,
  finished_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE match_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read" ON match_results
  FOR SELECT USING (true);

CREATE POLICY "Authenticated insert" ON match_results
  FOR INSERT WITH CHECK (true);
