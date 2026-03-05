-- Read Request System: users request access to read stories

CREATE TABLE life_read_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  requester_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  story_id UUID REFERENCES life_stories(id) ON DELETE CASCADE NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- One request per user per story
CREATE UNIQUE INDEX idx_life_read_requests_unique ON life_read_requests(requester_id, story_id);
-- Fast lookup by story + status
CREATE INDEX idx_life_read_requests_story ON life_read_requests(story_id, status);
-- Fast lookup by requester
CREATE INDEX idx_life_read_requests_requester ON life_read_requests(requester_id, status);

-- updated_at trigger
CREATE TRIGGER life_read_requests_updated_at
  BEFORE UPDATE ON life_read_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE life_read_requests ENABLE ROW LEVEL SECURITY;

-- Anyone can see requests (needed for checking status)
CREATE POLICY "life_read_requests_select" ON life_read_requests
  FOR SELECT USING (
    auth.uid() = requester_id
    OR EXISTS (SELECT 1 FROM life_stories WHERE id = story_id AND user_id = auth.uid())
  );

-- Users can create requests
CREATE POLICY "life_read_requests_insert" ON life_read_requests
  FOR INSERT WITH CHECK (auth.uid() = requester_id);

-- Story owners can update (accept/reject)
CREATE POLICY "life_read_requests_update" ON life_read_requests
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM life_stories WHERE id = story_id AND user_id = auth.uid())
  );

-- Requesters can delete their own pending requests
CREATE POLICY "life_read_requests_delete" ON life_read_requests
  FOR DELETE USING (auth.uid() = requester_id AND status = 'pending');
