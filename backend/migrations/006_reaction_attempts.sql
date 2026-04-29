-- F1 Reaction Time Test — reaction_attempts table
CREATE TABLE IF NOT EXISTS reaction_attempts (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id       UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  reaction_time_ms INTEGER NOT NULL,
  is_false_start  BOOLEAN DEFAULT false,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- Index for leaderboard queries (only valid attempts)
CREATE INDEX IF NOT EXISTS idx_reaction_leaderboard
  ON reaction_attempts(reaction_time_ms ASC)
  WHERE NOT is_false_start;

-- Index for per-member queries
CREATE INDEX IF NOT EXISTS idx_reaction_member
  ON reaction_attempts(member_id, created_at DESC);
