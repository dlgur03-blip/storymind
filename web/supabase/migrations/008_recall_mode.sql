-- 008: 기억회상 모드 + 기본 비공개

-- life_stories 확장
ALTER TABLE life_stories ADD COLUMN recall_mode TEXT DEFAULT 'free' CHECK (recall_mode IN ('free','recall'));
ALTER TABLE life_stories ADD COLUMN birth_year INTEGER;
ALTER TABLE life_stories ADD COLUMN birth_place TEXT DEFAULT '';
ALTER TABLE life_stories ADD COLUMN world_setting TEXT CHECK (world_setting IN ('real','fantasy'));
ALTER TABLE life_stories ADD COLUMN world_detail TEXT DEFAULT '';
ALTER TABLE life_stories ADD COLUMN novel_style TEXT CHECK (novel_style IN ('memoir','fiction'));
ALTER TABLE life_stories ADD COLUMN protagonist_name TEXT DEFAULT '';
ALTER TABLE life_stories ADD COLUMN tone TEXT DEFAULT '';
ALTER TABLE life_stories ADD COLUMN current_age INTEGER;

-- life_chapters 확장
ALTER TABLE life_chapters ADD COLUMN recall_age INTEGER;
ALTER TABLE life_chapters ADD COLUMN recall_year INTEGER;
ALTER TABLE life_chapters ADD COLUMN is_skipped BOOLEAN DEFAULT FALSE;

-- 기본 비공개
ALTER TABLE life_stories ALTER COLUMN is_public SET DEFAULT FALSE;

-- 인덱스
CREATE INDEX idx_life_chapters_recall ON life_chapters(story_id, recall_age);
