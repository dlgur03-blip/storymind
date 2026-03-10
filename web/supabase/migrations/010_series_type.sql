-- Add series_type column to life_stories for 단편/장편 분류
ALTER TABLE life_stories ADD COLUMN IF NOT EXISTS series_type TEXT DEFAULT 'short' CHECK (series_type IN ('short', 'long'));

-- Add index for filtering by series_type
CREATE INDEX IF NOT EXISTS idx_life_stories_series_type ON life_stories(series_type);
