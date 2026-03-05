CREATE TABLE story_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT DEFAULT '',
  idea_text TEXT DEFAULT '',
  status TEXT DEFAULT 'step1',
  current_step INTEGER DEFAULT 1,
  analysis JSONB DEFAULT '{}',
  arcs JSONB DEFAULT '{}',
  characters JSONB DEFAULT '[]',
  world JSONB DEFAULT '[]',
  conti JSONB DEFAULT '[]',
  foreshadows JSONB DEFAULT '[]',
  conversation JSONB DEFAULT '[]',
  genre TEXT DEFAULT '',
  selected_arc TEXT DEFAULT '',
  work_id UUID REFERENCES works(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE story_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own plans" ON story_plans FOR ALL USING (user_id = auth.uid());
CREATE INDEX idx_story_plans_user ON story_plans(user_id);
