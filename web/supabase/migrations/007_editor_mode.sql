-- Editor Mode: B2B writer management system
-- 3 tables with RLS, indexes, and triggers

-- 1. work_collaborators: editor-writer relationship per work
CREATE TABLE work_collaborators (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  work_id UUID REFERENCES works(id) ON DELETE CASCADE NOT NULL,
  editor_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL DEFAULT 'editor' CHECK (role IN ('editor','viewer')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','revoked')),
  invited_by TEXT NOT NULL DEFAULT 'writer' CHECK (invited_by IN ('writer','editor')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(work_id, editor_id)
);

-- 2. chapter_comments: inline comments on chapters (with text position)
CREATE TABLE chapter_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chapter_id UUID REFERENCES chapters(id) ON DELETE CASCADE NOT NULL,
  work_id UUID REFERENCES works(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  parent_id UUID REFERENCES chapter_comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  selection_start INTEGER,
  selection_end INTEGER,
  selected_text TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','resolved')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. editor_messages: 1:1 messaging
CREATE TABLE editor_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  work_id UUID REFERENCES works(id) ON DELETE SET NULL,
  sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  receiver_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_work_collaborators_work ON work_collaborators(work_id);
CREATE INDEX idx_work_collaborators_editor ON work_collaborators(editor_id);
CREATE INDEX idx_work_collaborators_status ON work_collaborators(status);
CREATE INDEX idx_chapter_comments_chapter ON chapter_comments(chapter_id);
CREATE INDEX idx_chapter_comments_work ON chapter_comments(work_id);
CREATE INDEX idx_chapter_comments_user ON chapter_comments(user_id);
CREATE INDEX idx_chapter_comments_status ON chapter_comments(status);
CREATE INDEX idx_editor_messages_sender ON editor_messages(sender_id, created_at DESC);
CREATE INDEX idx_editor_messages_receiver ON editor_messages(receiver_id, created_at DESC);
CREATE INDEX idx_editor_messages_work ON editor_messages(work_id);

-- Triggers
CREATE TRIGGER work_collaborators_updated_at BEFORE UPDATE ON work_collaborators FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER chapter_comments_updated_at BEFORE UPDATE ON chapter_comments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE work_collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE chapter_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE editor_messages ENABLE ROW LEVEL SECURITY;

-- work_collaborators: work owner or the editor themselves can read
CREATE POLICY "wc_select" ON work_collaborators FOR SELECT USING (
  auth.uid() = editor_id OR
  EXISTS (SELECT 1 FROM works WHERE id = work_id AND user_id = auth.uid())
);
-- work owner can insert (invite)
CREATE POLICY "wc_insert" ON work_collaborators FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM works WHERE id = work_id AND user_id = auth.uid())
);
-- work owner or editor can update (accept/reject/revoke)
CREATE POLICY "wc_update" ON work_collaborators FOR UPDATE USING (
  auth.uid() = editor_id OR
  EXISTS (SELECT 1 FROM works WHERE id = work_id AND user_id = auth.uid())
);
-- work owner can delete
CREATE POLICY "wc_delete" ON work_collaborators FOR DELETE USING (
  EXISTS (SELECT 1 FROM works WHERE id = work_id AND user_id = auth.uid())
);

-- chapter_comments: work owner or active collaborators can read
CREATE POLICY "cc_select" ON chapter_comments FOR SELECT USING (
  auth.uid() = user_id OR
  EXISTS (SELECT 1 FROM works WHERE id = work_id AND user_id = auth.uid()) OR
  EXISTS (SELECT 1 FROM work_collaborators WHERE work_id = chapter_comments.work_id AND editor_id = auth.uid() AND status = 'active')
);
-- active collaborators or work owner can insert
CREATE POLICY "cc_insert" ON chapter_comments FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM works WHERE id = work_id AND user_id = auth.uid()) OR
  EXISTS (SELECT 1 FROM work_collaborators WHERE work_id = chapter_comments.work_id AND editor_id = auth.uid() AND status = 'active')
);
-- comment author or work owner can update
CREATE POLICY "cc_update" ON chapter_comments FOR UPDATE USING (
  auth.uid() = user_id OR
  EXISTS (SELECT 1 FROM works WHERE id = work_id AND user_id = auth.uid())
);
-- comment author or work owner can delete
CREATE POLICY "cc_delete" ON chapter_comments FOR DELETE USING (
  auth.uid() = user_id OR
  EXISTS (SELECT 1 FROM works WHERE id = work_id AND user_id = auth.uid())
);

-- editor_messages: sender or receiver can read
CREATE POLICY "em_select" ON editor_messages FOR SELECT USING (
  auth.uid() = sender_id OR auth.uid() = receiver_id
);
-- authenticated users can send
CREATE POLICY "em_insert" ON editor_messages FOR INSERT WITH CHECK (
  auth.uid() = sender_id
);
-- receiver can mark as read
CREATE POLICY "em_update" ON editor_messages FOR UPDATE USING (
  auth.uid() = receiver_id
);

-- Add editor read access to works (active collaborators can read)
CREATE POLICY "works_editor_read" ON works FOR SELECT USING (
  EXISTS (SELECT 1 FROM work_collaborators WHERE work_id = works.id AND editor_id = auth.uid() AND status = 'active')
);

-- Add editor read access to chapters (active collaborators can read)
CREATE POLICY "chapters_editor_read" ON chapters FOR SELECT USING (
  EXISTS (SELECT 1 FROM work_collaborators wc JOIN works w ON wc.work_id = w.id WHERE w.id = chapters.work_id AND wc.editor_id = auth.uid() AND wc.status = 'active')
);

-- Add editor read access to vault tables
CREATE POLICY "vault_chars_editor_read" ON vault_characters FOR SELECT USING (
  EXISTS (SELECT 1 FROM work_collaborators WHERE work_id = vault_characters.work_id AND editor_id = auth.uid() AND status = 'active')
);
CREATE POLICY "vault_fore_editor_read" ON vault_foreshadows FOR SELECT USING (
  EXISTS (SELECT 1 FROM work_collaborators WHERE work_id = vault_foreshadows.work_id AND editor_id = auth.uid() AND status = 'active')
);
CREATE POLICY "vault_world_editor_read" ON vault_world FOR SELECT USING (
  EXISTS (SELECT 1 FROM work_collaborators WHERE work_id = vault_world.work_id AND editor_id = auth.uid() AND status = 'active')
);
CREATE POLICY "vault_timeline_editor_read" ON vault_timeline FOR SELECT USING (
  EXISTS (SELECT 1 FROM work_collaborators WHERE work_id = vault_timeline.work_id AND editor_id = auth.uid() AND status = 'active')
);

-- Update life_notifications: add new types and work_id_ref
ALTER TABLE life_notifications DROP CONSTRAINT IF EXISTS life_notifications_type_check;
ALTER TABLE life_notifications ADD CONSTRAINT life_notifications_type_check
  CHECK (type IN ('like','comment','follow','new_chapter','system','editor_invite','editor_comment','editor_message'));
ALTER TABLE life_notifications ADD COLUMN IF NOT EXISTS work_id_ref UUID REFERENCES works(id) ON DELETE CASCADE;
