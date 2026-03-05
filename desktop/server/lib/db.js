const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

// DB 파일 경로
const dbPath = process.env.DB_PATH || path.join(__dirname, '..', 'storymind.db');

// 전역 DB 인스턴스
let sqlDb = null;
let isInitialized = false;

// 초기화 Promise
const initPromise = initSqlJs().then(SQL => {
  // Load existing DB or create new
  try {
    if (fs.existsSync(dbPath)) {
      const buffer = fs.readFileSync(dbPath);
      sqlDb = new SQL.Database(buffer);
      console.log('[DB] Loaded existing database from', dbPath);
    } else {
      sqlDb = new SQL.Database();
      console.log('[DB] Created new database');
    }
  } catch (e) {
    sqlDb = new SQL.Database();
    console.log('[DB] Created new database (error loading:', e.message + ')');
  }

  // Initialize tables
  sqlDb.run(`
    CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE, email TEXT, password_hash TEXT NOT NULL, nickname TEXT NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, user_id INTEGER REFERENCES users(id) ON DELETE CASCADE, expires_at DATETIME NOT NULL);
    CREATE TABLE IF NOT EXISTS works (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER REFERENCES users(id) ON DELETE CASCADE, title TEXT NOT NULL, genre TEXT DEFAULT '', style_preset TEXT DEFAULT 'action', work_type TEXT DEFAULT 'novel', daily_goal INTEGER DEFAULT 3000, vault_mode TEXT DEFAULT 'smart', created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS chapters (id INTEGER PRIMARY KEY AUTOINCREMENT, work_id INTEGER REFERENCES works(id) ON DELETE CASCADE, number INTEGER NOT NULL, title TEXT DEFAULT '', content TEXT DEFAULT '', word_count INTEGER DEFAULT 0, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS chapter_versions (id INTEGER PRIMARY KEY AUTOINCREMENT, chapter_id INTEGER REFERENCES chapters(id) ON DELETE CASCADE, content TEXT DEFAULT '', word_count INTEGER DEFAULT 0, saved_at DATETIME DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS vault_characters (id INTEGER PRIMARY KEY AUTOINCREMENT, work_id INTEGER REFERENCES works(id) ON DELETE CASCADE, name TEXT NOT NULL, aliases TEXT DEFAULT '[]', appearance TEXT DEFAULT '', personality TEXT DEFAULT '', abilities TEXT DEFAULT '[]', relationships TEXT DEFAULT '[]', speech_pattern TEXT DEFAULT '', is_alive INTEGER DEFAULT 1, first_appearance INTEGER DEFAULT 1, state_log TEXT DEFAULT '[]', updated_at DATETIME DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS vault_foreshadows (id INTEGER PRIMARY KEY AUTOINCREMENT, work_id INTEGER REFERENCES works(id) ON DELETE CASCADE, summary TEXT NOT NULL, planted_chapter INTEGER, status TEXT DEFAULT 'open', resolved_chapter INTEGER, related_characters TEXT DEFAULT '[]', urgency TEXT DEFAULT 'low', updated_at DATETIME DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS vault_world (id INTEGER PRIMARY KEY AUTOINCREMENT, work_id INTEGER REFERENCES works(id) ON DELETE CASCADE, category TEXT NOT NULL, name TEXT NOT NULL, description TEXT DEFAULT '', related_chapters TEXT DEFAULT '[]', updated_at DATETIME DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS vault_timeline (id INTEGER PRIMARY KEY AUTOINCREMENT, work_id INTEGER REFERENCES works(id) ON DELETE CASCADE, chapter INTEGER, event_summary TEXT, in_world_time TEXT DEFAULT '', season TEXT DEFAULT '', characters TEXT DEFAULT '[]', updated_at DATETIME DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS review_history (id INTEGER PRIMARY KEY AUTOINCREMENT, work_id INTEGER, chapter_id INTEGER, issues TEXT DEFAULT '[]', tension_score REAL DEFAULT 0, created_at DATETIME DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS review_feedback (id INTEGER PRIMARY KEY AUTOINCREMENT, work_id INTEGER REFERENCES works(id) ON DELETE CASCADE, issue_type TEXT NOT NULL, issue_description TEXT NOT NULL, action TEXT DEFAULT 'reject', created_at DATETIME DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS vault_address_matrix (id INTEGER PRIMARY KEY AUTOINCREMENT, work_id INTEGER REFERENCES works(id) ON DELETE CASCADE, from_character TEXT NOT NULL, to_character TEXT NOT NULL, address TEXT NOT NULL, context TEXT DEFAULT '', updated_at DATETIME DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS style_profiles (id INTEGER PRIMARY KEY AUTOINCREMENT, work_id INTEGER REFERENCES works(id) ON DELETE CASCADE, avg_sentence_length REAL, dialogue_ratio REAL, description_density REAL, vocab_diversity REAL, tone TEXT DEFAULT '', unique_patterns TEXT DEFAULT '[]', example_paragraphs TEXT DEFAULT '[]', analyzed_chapters INTEGER DEFAULT 0, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS writing_stats (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER REFERENCES users(id) ON DELETE CASCADE, date TEXT NOT NULL, chars_written INTEGER DEFAULT 0, UNIQUE(user_id, date));
    CREATE TABLE IF NOT EXISTS api_usage (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER REFERENCES users(id) ON DELETE CASCADE, endpoint TEXT NOT NULL, model TEXT DEFAULT '', tokens_in INTEGER DEFAULT 0, tokens_out INTEGER DEFAULT 0, cost_estimate REAL DEFAULT 0, created_at DATETIME DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS user_plans (user_id INTEGER PRIMARY KEY, plan TEXT DEFAULT 'free', monthly_review_limit INTEGER DEFAULT 5, monthly_reviews_used INTEGER DEFAULT 0, reset_at DATETIME, stripe_customer_id TEXT, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS story_plans (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, title TEXT DEFAULT '', idea_text TEXT DEFAULT '', status TEXT DEFAULT 'step1', current_step INTEGER DEFAULT 1, analysis TEXT DEFAULT '{}', arcs TEXT DEFAULT '{}', characters TEXT DEFAULT '[]', world TEXT DEFAULT '[]', conti TEXT DEFAULT '[]', foreshadows TEXT DEFAULT '[]', conversation TEXT DEFAULT '[]', genre TEXT DEFAULT '', selected_arc TEXT DEFAULT '', work_id INTEGER, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS referrals (id INTEGER PRIMARY KEY AUTOINCREMENT, referrer_id INTEGER, referral_code TEXT UNIQUE NOT NULL, referred_id INTEGER, status TEXT DEFAULT 'pending', reward_given INTEGER DEFAULT 0, created_at DATETIME DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS badges (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, badge_type TEXT NOT NULL, badge_name TEXT NOT NULL, earned_at DATETIME DEFAULT CURRENT_TIMESTAMP);
  `);

  // Create default user
  const result = sqlDb.exec("SELECT id FROM users WHERE id=1");
  if (result.length === 0 || result[0].values.length === 0) {
    sqlDb.run("INSERT INTO users (id, username, email, password_hash, nickname) VALUES (1, 'local', 'local@desktop', 'desktop', '작가')");
    console.log('[DB] Default user created');
  }

  // Save DB
  saveDb();

  // Auto-save every 30 seconds
  setInterval(saveDb, 30000);

  isInitialized = true;
  console.log('[DB] Database initialized');
});

function saveDb() {
  if (sqlDb) {
    try {
      const dir = path.dirname(dbPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const data = sqlDb.export();
      fs.writeFileSync(dbPath, Buffer.from(data));
    } catch (e) {
      console.error('[DB] Save error:', e.message);
    }
  }
}

function getLastInsertRowId() {
  const result = sqlDb.exec("SELECT last_insert_rowid() as id");
  return result[0]?.values[0]?.[0] || 0;
}

// API compatible with better-sqlite3
const db = {
  prepare(sql) {
    return {
      run(...params) {
        if (!sqlDb) throw new Error('Database not initialized');
        try {
          sqlDb.run(sql, params);
          return { changes: sqlDb.getRowsModified(), lastInsertRowid: getLastInsertRowId() };
        } catch (e) {
          console.error('[DB] Run error:', sql, e.message);
          throw e;
        }
      },
      get(...params) {
        if (!sqlDb) throw new Error('Database not initialized');
        try {
          const stmt = sqlDb.prepare(sql);
          stmt.bind(params);
          if (stmt.step()) {
            const row = stmt.getAsObject();
            stmt.free();
            return row;
          }
          stmt.free();
          return undefined;
        } catch (e) {
          console.error('[DB] Get error:', sql, e.message);
          throw e;
        }
      },
      all(...params) {
        if (!sqlDb) throw new Error('Database not initialized');
        try {
          const results = [];
          const stmt = sqlDb.prepare(sql);
          stmt.bind(params);
          while (stmt.step()) {
            results.push(stmt.getAsObject());
          }
          stmt.free();
          return results;
        } catch (e) {
          console.error('[DB] All error:', sql, e.message);
          throw e;
        }
      }
    };
  },
  exec(sql) {
    if (!sqlDb) throw new Error('Database not initialized');
    sqlDb.run(sql);
  },
  pragma(pragma) {
    // Ignore pragmas for sql.js
  },
  close() {
    saveDb();
    if (sqlDb) {
      sqlDb.close();
      sqlDb = null;
    }
  },
  save: saveDb
};

db.initPromise = initPromise;

module.exports = db;
