// Database abstraction layer
// Currently wraps SQLite, designed for easy PostgreSQL migration
// When migrating: replace this file's implementation, keep the same API

const db = require('./db');

class Repository {
  constructor(table) {
    this.table = table;
  }

  findById(id) {
    return db.prepare(`SELECT * FROM ${this.table} WHERE id=?`).get(id);
  }

  findAll(where = {}, orderBy = '', limit = 0) {
    const keys = Object.keys(where);
    let sql = `SELECT * FROM ${this.table}`;
    if (keys.length > 0) sql += ' WHERE ' + keys.map(k => `${k}=?`).join(' AND ');
    if (orderBy) sql += ` ORDER BY ${orderBy}`;
    if (limit > 0) sql += ` LIMIT ${limit}`;
    return db.prepare(sql).all(...keys.map(k => where[k]));
  }

  findOne(where = {}) {
    const keys = Object.keys(where);
    let sql = `SELECT * FROM ${this.table}`;
    if (keys.length > 0) sql += ' WHERE ' + keys.map(k => `${k}=?`).join(' AND ');
    sql += ' LIMIT 1';
    return db.prepare(sql).get(...keys.map(k => where[k]));
  }

  create(data) {
    const keys = Object.keys(data);
    const sql = `INSERT INTO ${this.table} (${keys.join(',')}) VALUES (${keys.map(() => '?').join(',')})`;
    const result = db.prepare(sql).run(...keys.map(k => data[k]));
    return { ...data, id: result.lastInsertRowid };
  }

  update(id, data) {
    const keys = Object.keys(data);
    const sql = `UPDATE ${this.table} SET ${keys.map(k => `${k}=?`).join(',')},updated_at=CURRENT_TIMESTAMP WHERE id=?`;
    db.prepare(sql).run(...keys.map(k => data[k]), id);
    return this.findById(id);
  }

  delete(id) {
    return db.prepare(`DELETE FROM ${this.table} WHERE id=?`).run(id);
  }

  count(where = {}) {
    const keys = Object.keys(where);
    let sql = `SELECT COUNT(*) as c FROM ${this.table}`;
    if (keys.length > 0) sql += ' WHERE ' + keys.map(k => `${k}=?`).join(' AND ');
    return db.prepare(sql).get(...keys.map(k => where[k])).c;
  }

  raw(sql, ...params) {
    return db.prepare(sql).all(...params);
  }

  rawGet(sql, ...params) {
    return db.prepare(sql).get(...params);
  }

  rawRun(sql, ...params) {
    return db.prepare(sql).run(...params);
  }
}

// Pre-built repositories
const repos = {
  users: new Repository('users'),
  works: new Repository('works'),
  chapters: new Repository('chapters'),
  sessions: new Repository('sessions'),
  vaultCharacters: new Repository('vault_characters'),
  vaultForeshadows: new Repository('vault_foreshadows'),
  vaultWorld: new Repository('vault_world'),
  vaultTimeline: new Repository('vault_timeline'),
  vaultAddress: new Repository('vault_address_matrix'),
  reviewHistory: new Repository('review_history'),
  reviewFeedback: new Repository('review_feedback'),
  styleProfiles: new Repository('style_profiles'),
  writingStats: new Repository('writing_stats'),
  apiUsage: new Repository('api_usage'),
  userPlans: new Repository('user_plans'),
};

module.exports = { Repository, repos };
