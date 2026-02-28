const levels = { error: 0, warn: 1, info: 2, debug: 3 };
const LOG_LEVEL = levels[process.env.LOG_LEVEL || 'info'] ?? 2;

function log(level, msg, meta = {}) {
  if (levels[level] > LOG_LEVEL) return;
  const entry = JSON.stringify({ t: new Date().toISOString(), level, msg, ...meta });
  level === 'error' ? console.error(entry) : console.log(entry);
}

module.exports = {
  error: (msg, meta) => log('error', msg, meta),
  warn: (msg, meta) => log('warn', msg, meta),
  info: (msg, meta) => log('info', msg, meta),
  debug: (msg, meta) => log('debug', msg, meta),
};
