-- 호칭 매트릭스
CREATE TABLE IF NOT EXISTS vault_address_matrix (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  work_id UUID REFERENCES works(id) ON DELETE CASCADE,
  from_character TEXT NOT NULL,
  to_character TEXT NOT NULL,
  address TEXT NOT NULL,
  context TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE vault_address_matrix ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their address matrix" ON vault_address_matrix
  FOR ALL USING (
    work_id IN (SELECT id FROM works WHERE user_id = auth.uid())
  );

-- API 사용량 추적
CREATE TABLE IF NOT EXISTS api_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  model TEXT DEFAULT '',
  tokens_in INTEGER DEFAULT 0,
  tokens_out INTEGER DEFAULT 0,
  cost_estimate REAL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE api_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own usage" ON api_usage
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert their own usage" ON api_usage
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Indexes
CREATE INDEX IF NOT EXISTS idx_address_matrix_work ON vault_address_matrix(work_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_user ON api_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_created ON api_usage(created_at);
