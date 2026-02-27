const Database = require('better-sqlite3');
const path = require('path');
const db = new Database(path.join(__dirname, '..', 'storymind.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, nickname TEXT NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, user_id INTEGER REFERENCES users(id) ON DELETE CASCADE, expires_at DATETIME NOT NULL);
CREATE TABLE IF NOT EXISTS works (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER REFERENCES users(id) ON DELETE CASCADE, title TEXT NOT NULL, genre TEXT DEFAULT '', style_preset TEXT DEFAULT 'action', daily_goal INTEGER DEFAULT 3000, vault_mode TEXT DEFAULT 'smart', created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS chapters (id INTEGER PRIMARY KEY AUTOINCREMENT, work_id INTEGER REFERENCES works(id) ON DELETE CASCADE, number INTEGER NOT NULL, title TEXT DEFAULT '', content TEXT DEFAULT '', word_count INTEGER DEFAULT 0, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS chapter_versions (id INTEGER PRIMARY KEY AUTOINCREMENT, chapter_id INTEGER REFERENCES chapters(id) ON DELETE CASCADE, content TEXT DEFAULT '', word_count INTEGER DEFAULT 0, saved_at DATETIME DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS vault_characters (id INTEGER PRIMARY KEY AUTOINCREMENT, work_id INTEGER REFERENCES works(id) ON DELETE CASCADE, name TEXT NOT NULL, aliases TEXT DEFAULT '[]', appearance TEXT DEFAULT '', personality TEXT DEFAULT '', abilities TEXT DEFAULT '[]', relationships TEXT DEFAULT '[]', speech_pattern TEXT DEFAULT '', is_alive INTEGER DEFAULT 1, first_appearance INTEGER DEFAULT 1, state_log TEXT DEFAULT '[]', updated_at DATETIME DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS vault_foreshadows (id INTEGER PRIMARY KEY AUTOINCREMENT, work_id INTEGER REFERENCES works(id) ON DELETE CASCADE, summary TEXT NOT NULL, planted_chapter INTEGER, status TEXT DEFAULT 'open', resolved_chapter INTEGER, related_characters TEXT DEFAULT '[]', urgency TEXT DEFAULT 'low', updated_at DATETIME DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS vault_world (id INTEGER PRIMARY KEY AUTOINCREMENT, work_id INTEGER REFERENCES works(id) ON DELETE CASCADE, category TEXT NOT NULL, name TEXT NOT NULL, description TEXT DEFAULT '', related_chapters TEXT DEFAULT '[]', updated_at DATETIME DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS vault_timeline (id INTEGER PRIMARY KEY AUTOINCREMENT, work_id INTEGER REFERENCES works(id) ON DELETE CASCADE, chapter INTEGER, event_summary TEXT, in_world_time TEXT DEFAULT '', season TEXT DEFAULT '', characters TEXT DEFAULT '[]', updated_at DATETIME DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS review_history (id INTEGER PRIMARY KEY AUTOINCREMENT, work_id INTEGER, chapter_id INTEGER, issues TEXT DEFAULT '[]', tension_score REAL DEFAULT 0, created_at DATETIME DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS review_feedback (id INTEGER PRIMARY KEY AUTOINCREMENT, work_id INTEGER REFERENCES works(id) ON DELETE CASCADE, issue_type TEXT NOT NULL, issue_description TEXT NOT NULL, action TEXT DEFAULT 'reject', created_at DATETIME DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS vault_address_matrix (id INTEGER PRIMARY KEY AUTOINCREMENT, work_id INTEGER REFERENCES works(id) ON DELETE CASCADE, from_character TEXT NOT NULL, to_character TEXT NOT NULL, address TEXT NOT NULL, context TEXT DEFAULT '', updated_at DATETIME DEFAULT CURRENT_TIMESTAMP, UNIQUE(work_id, from_character, to_character));
CREATE TABLE IF NOT EXISTS style_profiles (id INTEGER PRIMARY KEY AUTOINCREMENT, work_id INTEGER REFERENCES works(id) ON DELETE CASCADE, avg_sentence_length REAL, dialogue_ratio REAL, description_density REAL, vocab_diversity REAL, tone TEXT DEFAULT '', unique_patterns TEXT DEFAULT '[]', example_paragraphs TEXT DEFAULT '[]', analyzed_chapters INTEGER DEFAULT 0, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS writing_stats (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER REFERENCES users(id) ON DELETE CASCADE, date TEXT NOT NULL, chars_written INTEGER DEFAULT 0, UNIQUE(user_id, date));
`);

// Session cleanup - run every hour
function cleanExpiredSessions() {
  const deleted = db.prepare('DELETE FROM sessions WHERE expires_at < datetime("now")').run();
  if (deleted.changes > 0) console.log(`[DB] Cleaned ${deleted.changes} expired sessions`);
}
cleanExpiredSessions();
setInterval(cleanExpiredSessions, 3600000);

module.exports = db;

// #8-2 API usage tracking
db.exec(`
CREATE TABLE IF NOT EXISTS api_usage (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  model TEXT DEFAULT '',
  tokens_in INTEGER DEFAULT 0,
  tokens_out INTEGER DEFAULT 0,
  cost_estimate REAL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS user_plans (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  plan TEXT DEFAULT 'free',
  monthly_review_limit INTEGER DEFAULT 5,
  monthly_reviews_used INTEGER DEFAULT 0,
  reset_at DATETIME DEFAULT (datetime('now', '+30 days')),
  stripe_customer_id TEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Story Planner (Part 11)
CREATE TABLE IF NOT EXISTS story_plans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  title TEXT DEFAULT '',
  idea_text TEXT DEFAULT '',
  status TEXT DEFAULT 'step1',
  current_step INTEGER DEFAULT 1,
  analysis JSON DEFAULT '{}',
  arcs JSON DEFAULT '{}',
  characters JSON DEFAULT '[]',
  world JSON DEFAULT '[]',
  conti JSON DEFAULT '[]',
  foreshadows JSON DEFAULT '[]',
  conversation JSON DEFAULT '[]',
  genre TEXT DEFAULT '',
  selected_arc TEXT DEFAULT '',
  work_id INTEGER REFERENCES works(id),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
`);

// #9-2 Referral system
db.exec(`
CREATE TABLE IF NOT EXISTS referrals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  referrer_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  referral_code TEXT UNIQUE NOT NULL,
  referred_id INTEGER REFERENCES users(id),
  status TEXT DEFAULT 'pending',
  reward_given INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
`);
// Add referral_code to users if not exists
try { db.exec('ALTER TABLE users ADD COLUMN referral_code TEXT DEFAULT ""'); } catch {}
// Add google_id for OAuth
try { db.exec('ALTER TABLE users ADD COLUMN google_id TEXT'); } catch {}

// #9-3 Author badges
db.exec(`
CREATE TABLE IF NOT EXISTS badges (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  badge_type TEXT NOT NULL,
  badge_name TEXT NOT NULL,
  earned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, badge_type)
);
`);
