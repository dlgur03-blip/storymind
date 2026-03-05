-- StoryMind Database Schema for Supabase (PostgreSQL)

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Works (작품)
CREATE TABLE works (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  genre TEXT DEFAULT '',
  style_preset TEXT DEFAULT 'action',
  work_type TEXT DEFAULT 'novel' CHECK (work_type IN ('novel', 'webtoon')),
  vault_mode TEXT DEFAULT 'smart' CHECK (vault_mode IN ('manual', 'smart', 'auto')),
  daily_goal INTEGER DEFAULT 3000,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Chapters (화)
CREATE TABLE chapters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  work_id UUID REFERENCES works(id) ON DELETE CASCADE NOT NULL,
  number INTEGER NOT NULL,
  title TEXT DEFAULT '',
  content TEXT DEFAULT '',
  summary JSONB,
  word_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Chapter Versions (버전 히스토리)
CREATE TABLE chapter_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chapter_id UUID REFERENCES chapters(id) ON DELETE CASCADE NOT NULL,
  content TEXT,
  word_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vault: Characters (캐릭터)
CREATE TABLE vault_characters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  work_id UUID REFERENCES works(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  aliases JSONB DEFAULT '[]',
  appearance TEXT DEFAULT '',
  personality TEXT DEFAULT '',
  abilities JSONB DEFAULT '[]',
  relationships JSONB DEFAULT '[]',
  speech_pattern TEXT DEFAULT '',
  first_appearance INTEGER DEFAULT 1,
  is_alive BOOLEAN DEFAULT TRUE,
  state_log JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vault: Foreshadows (복선)
CREATE TABLE vault_foreshadows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  work_id UUID REFERENCES works(id) ON DELETE CASCADE NOT NULL,
  summary TEXT NOT NULL,
  planted_chapter INTEGER,
  resolved_chapter INTEGER,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'abandoned')),
  related_characters JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vault: World (세계관)
CREATE TABLE vault_world (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  work_id UUID REFERENCES works(id) ON DELETE CASCADE NOT NULL,
  category TEXT DEFAULT 'other',
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vault: Timeline (시간선)
CREATE TABLE vault_timeline (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  work_id UUID REFERENCES works(id) ON DELETE CASCADE NOT NULL,
  chapter INTEGER NOT NULL,
  event_summary TEXT NOT NULL,
  in_world_time TEXT DEFAULT '',
  season TEXT DEFAULT '미상',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Style Profiles (문체 프로필)
CREATE TABLE style_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  work_id UUID REFERENCES works(id) ON DELETE CASCADE UNIQUE NOT NULL,
  avg_sentence_length REAL DEFAULT 0,
  dialogue_ratio REAL DEFAULT 0,
  description_density REAL DEFAULT 0,
  vocab_diversity REAL DEFAULT 0,
  tone TEXT DEFAULT '',
  unique_patterns JSONB DEFAULT '[]',
  example_paragraphs JSONB DEFAULT '[]',
  analyzed_chapters INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Review History (검수 기록)
CREATE TABLE review_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  work_id UUID REFERENCES works(id) ON DELETE CASCADE NOT NULL,
  chapter_id UUID REFERENCES chapters(id) ON DELETE CASCADE NOT NULL,
  issues JSONB,
  tension_score INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Review Feedback (피드백)
CREATE TABLE review_feedback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  work_id UUID REFERENCES works(id) ON DELETE CASCADE NOT NULL,
  issue_type TEXT,
  issue_description TEXT,
  action TEXT DEFAULT 'reject',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Plans (사용자 플랜)
CREATE TABLE user_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  plan TEXT DEFAULT 'free',
  monthly_review_limit INTEGER DEFAULT 30,
  monthly_reviews_used INTEGER DEFAULT 0,
  reset_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '30 days',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Daily Stats (일일 통계)
CREATE TABLE daily_stats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date DATE DEFAULT CURRENT_DATE,
  word_count INTEGER DEFAULT 0,
  UNIQUE(user_id, date)
);

-- Row Level Security (RLS) Policies
ALTER TABLE works ENABLE ROW LEVEL SECURITY;
ALTER TABLE chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE chapter_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE vault_characters ENABLE ROW LEVEL SECURITY;
ALTER TABLE vault_foreshadows ENABLE ROW LEVEL SECURITY;
ALTER TABLE vault_world ENABLE ROW LEVEL SECURITY;
ALTER TABLE vault_timeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE style_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_stats ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access their own data
CREATE POLICY "Users can manage their own works" ON works
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage chapters of their works" ON chapters
  FOR ALL USING (work_id IN (SELECT id FROM works WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage chapter versions" ON chapter_versions
  FOR ALL USING (chapter_id IN (SELECT c.id FROM chapters c JOIN works w ON c.work_id = w.id WHERE w.user_id = auth.uid()));

CREATE POLICY "Users can manage their vault characters" ON vault_characters
  FOR ALL USING (work_id IN (SELECT id FROM works WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage their foreshadows" ON vault_foreshadows
  FOR ALL USING (work_id IN (SELECT id FROM works WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage their world elements" ON vault_world
  FOR ALL USING (work_id IN (SELECT id FROM works WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage their timeline" ON vault_timeline
  FOR ALL USING (work_id IN (SELECT id FROM works WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage their style profiles" ON style_profiles
  FOR ALL USING (work_id IN (SELECT id FROM works WHERE user_id = auth.uid()));

CREATE POLICY "Users can view their review history" ON review_history
  FOR ALL USING (work_id IN (SELECT id FROM works WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage their review feedback" ON review_feedback
  FOR ALL USING (work_id IN (SELECT id FROM works WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage their plan" ON user_plans
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their daily stats" ON daily_stats
  FOR ALL USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX idx_chapters_work_id ON chapters(work_id);
CREATE INDEX idx_chapters_number ON chapters(work_id, number);
CREATE INDEX idx_vault_characters_work_id ON vault_characters(work_id);
CREATE INDEX idx_vault_foreshadows_work_id ON vault_foreshadows(work_id);
CREATE INDEX idx_vault_world_work_id ON vault_world(work_id);
CREATE INDEX idx_vault_timeline_work_id ON vault_timeline(work_id);
CREATE INDEX idx_review_history_work_id ON review_history(work_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_works_updated_at BEFORE UPDATE ON works
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_chapters_updated_at BEFORE UPDATE ON chapters
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_vault_characters_updated_at BEFORE UPDATE ON vault_characters
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_vault_foreshadows_updated_at BEFORE UPDATE ON vault_foreshadows
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_style_profiles_updated_at BEFORE UPDATE ON style_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Function to auto-calculate word count
CREATE OR REPLACE FUNCTION calculate_word_count()
RETURNS TRIGGER AS $$
BEGIN
  -- Remove HTML tags and count characters (for Korean)
  NEW.word_count = LENGTH(REGEXP_REPLACE(COALESCE(NEW.content, ''), '<[^>]*>', '', 'g'));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_word_count BEFORE INSERT OR UPDATE ON chapters
  FOR EACH ROW EXECUTE FUNCTION calculate_word_count();
