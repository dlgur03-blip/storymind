-- StoryLife: Community-based casual writing service
-- 8 tables with RLS, indexes, and triggers

-- Enable uuid extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. life_profiles: public profiles
CREATE TABLE life_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  display_name TEXT NOT NULL DEFAULT '',
  bio TEXT DEFAULT '',
  avatar_url TEXT DEFAULT '',
  total_followers INTEGER DEFAULT 0,
  total_following INTEGER DEFAULT 0,
  total_stories INTEGER DEFAULT 0,
  is_public BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. life_stories: stories
CREATE TABLE life_stories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  genre TEXT DEFAULT '',
  description TEXT DEFAULT '',
  cover_image_url TEXT DEFAULT '',
  is_public BOOLEAN DEFAULT TRUE,
  status TEXT DEFAULT 'ongoing' CHECK (status IN ('ongoing','completed','paused')),
  total_likes INTEGER DEFAULT 0,
  total_views INTEGER DEFAULT 0,
  total_chapters INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. life_chapters: chapters with conversation history
CREATE TABLE life_chapters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  story_id UUID REFERENCES life_stories(id) ON DELETE CASCADE NOT NULL,
  number INTEGER NOT NULL,
  title TEXT DEFAULT '',
  content TEXT DEFAULT '',
  conversation_history JSONB DEFAULT '[]',
  word_count INTEGER DEFAULT 0,
  is_published BOOLEAN DEFAULT FALSE,
  published_at TIMESTAMPTZ,
  total_likes INTEGER DEFAULT 0,
  total_comments INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. life_likes: likes for stories or chapters
CREATE TABLE life_likes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  story_id UUID REFERENCES life_stories(id) ON DELETE CASCADE,
  chapter_id UUID REFERENCES life_chapters(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT like_target CHECK (
    (story_id IS NOT NULL AND chapter_id IS NULL) OR
    (story_id IS NULL AND chapter_id IS NOT NULL)
  )
);

-- 5. life_comments: comments on chapters
CREATE TABLE life_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  chapter_id UUID REFERENCES life_chapters(id) ON DELETE CASCADE NOT NULL,
  parent_id UUID REFERENCES life_comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. life_follows: follow relationships
CREATE TABLE life_follows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  follower_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  following_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT no_self_follow CHECK (follower_id != following_id)
);

-- 7. life_notifications: notifications
CREATE TABLE life_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('like','comment','follow','new_chapter','system')),
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  story_id UUID REFERENCES life_stories(id) ON DELETE CASCADE,
  chapter_id UUID REFERENCES life_chapters(id) ON DELETE CASCADE,
  message TEXT DEFAULT '',
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. life_share_cards: share card metadata
CREATE TABLE life_share_cards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chapter_id UUID REFERENCES life_chapters(id) ON DELETE CASCADE NOT NULL,
  card_url TEXT DEFAULT '',
  card_type TEXT DEFAULT 'instagram',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- UNIQUE indexes
CREATE UNIQUE INDEX idx_life_likes_story ON life_likes(user_id, story_id) WHERE story_id IS NOT NULL;
CREATE UNIQUE INDEX idx_life_likes_chapter ON life_likes(user_id, chapter_id) WHERE chapter_id IS NOT NULL;
CREATE UNIQUE INDEX idx_life_follows_unique ON life_follows(follower_id, following_id);
CREATE UNIQUE INDEX idx_life_chapters_story_number ON life_chapters(story_id, number);

-- Performance indexes
CREATE INDEX idx_life_stories_user ON life_stories(user_id);
CREATE INDEX idx_life_stories_public ON life_stories(is_public, created_at DESC);
CREATE INDEX idx_life_chapters_story ON life_chapters(story_id);
CREATE INDEX idx_life_chapters_published ON life_chapters(is_published, published_at DESC);
CREATE INDEX idx_life_comments_chapter ON life_comments(chapter_id);
CREATE INDEX idx_life_notifications_user ON life_notifications(user_id, is_read, created_at DESC);
CREATE INDEX idx_life_follows_follower ON life_follows(follower_id);
CREATE INDEX idx_life_follows_following ON life_follows(following_id);

-- updated_at trigger function (reuse if exists)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER life_profiles_updated_at BEFORE UPDATE ON life_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER life_stories_updated_at BEFORE UPDATE ON life_stories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER life_chapters_updated_at BEFORE UPDATE ON life_chapters FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER life_comments_updated_at BEFORE UPDATE ON life_comments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- word_count trigger
CREATE OR REPLACE FUNCTION update_chapter_word_count()
RETURNS TRIGGER AS $$
BEGIN
  NEW.word_count = COALESCE(LENGTH(REGEXP_REPLACE(NEW.content, '\s+', '', 'g')), 0);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER life_chapters_word_count BEFORE INSERT OR UPDATE OF content ON life_chapters FOR EACH ROW EXECUTE FUNCTION update_chapter_word_count();

-- RLS Policies
ALTER TABLE life_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE life_stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE life_chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE life_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE life_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE life_follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE life_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE life_share_cards ENABLE ROW LEVEL SECURITY;

-- life_profiles: public read, own write
CREATE POLICY "life_profiles_select" ON life_profiles FOR SELECT USING (true);
CREATE POLICY "life_profiles_insert" ON life_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "life_profiles_update" ON life_profiles FOR UPDATE USING (auth.uid() = user_id);

-- life_stories: public read (if is_public), own write
CREATE POLICY "life_stories_select" ON life_stories FOR SELECT USING (is_public = true OR auth.uid() = user_id);
CREATE POLICY "life_stories_insert" ON life_stories FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "life_stories_update" ON life_stories FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "life_stories_delete" ON life_stories FOR DELETE USING (auth.uid() = user_id);

-- life_chapters: public read (if published + parent story public), own write
CREATE POLICY "life_chapters_select" ON life_chapters FOR SELECT USING (
  is_published = true OR EXISTS (SELECT 1 FROM life_stories WHERE id = story_id AND user_id = auth.uid())
);
CREATE POLICY "life_chapters_insert" ON life_chapters FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM life_stories WHERE id = story_id AND user_id = auth.uid())
);
CREATE POLICY "life_chapters_update" ON life_chapters FOR UPDATE USING (
  EXISTS (SELECT 1 FROM life_stories WHERE id = story_id AND user_id = auth.uid())
);
CREATE POLICY "life_chapters_delete" ON life_chapters FOR DELETE USING (
  EXISTS (SELECT 1 FROM life_stories WHERE id = story_id AND user_id = auth.uid())
);

-- life_likes: public read, auth write
CREATE POLICY "life_likes_select" ON life_likes FOR SELECT USING (true);
CREATE POLICY "life_likes_insert" ON life_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "life_likes_delete" ON life_likes FOR DELETE USING (auth.uid() = user_id);

-- life_comments: public read, auth write
CREATE POLICY "life_comments_select" ON life_comments FOR SELECT USING (true);
CREATE POLICY "life_comments_insert" ON life_comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "life_comments_update" ON life_comments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "life_comments_delete" ON life_comments FOR DELETE USING (auth.uid() = user_id);

-- life_follows: public read, auth write
CREATE POLICY "life_follows_select" ON life_follows FOR SELECT USING (true);
CREATE POLICY "life_follows_insert" ON life_follows FOR INSERT WITH CHECK (auth.uid() = follower_id);
CREATE POLICY "life_follows_delete" ON life_follows FOR DELETE USING (auth.uid() = follower_id);

-- life_notifications: own read/update
CREATE POLICY "life_notifications_select" ON life_notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "life_notifications_insert" ON life_notifications FOR INSERT WITH CHECK (true);
CREATE POLICY "life_notifications_update" ON life_notifications FOR UPDATE USING (auth.uid() = user_id);

-- life_share_cards: public read, auth write via chapter ownership
CREATE POLICY "life_share_cards_select" ON life_share_cards FOR SELECT USING (true);
CREATE POLICY "life_share_cards_insert" ON life_share_cards FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM life_chapters c
    JOIN life_stories s ON c.story_id = s.id
    WHERE c.id = chapter_id AND s.user_id = auth.uid()
  )
);
