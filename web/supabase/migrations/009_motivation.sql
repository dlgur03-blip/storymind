-- 009: 동기부여 시스템 (스트릭 + 뱃지)

CREATE TABLE life_streaks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  current_streak INT DEFAULT 0,
  longest_streak INT DEFAULT 0,
  last_write_date DATE,
  total_write_days INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE life_badges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  badge_type TEXT NOT NULL,
  earned_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_life_badges_unique ON life_badges(user_id, badge_type);

-- RLS
ALTER TABLE life_streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE life_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own streaks" ON life_streaks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own streaks" ON life_streaks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own streaks" ON life_streaks FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own badges" ON life_badges FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own badges" ON life_badges FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Public badge viewing (for profiles)
CREATE POLICY "Anyone can view badges" ON life_badges FOR SELECT USING (true);
CREATE POLICY "Anyone can view streaks" ON life_streaks FOR SELECT USING (true);
