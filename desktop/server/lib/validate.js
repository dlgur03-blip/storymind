function validate(schema, data) {
  const errors = [];
  for (const [key, rules] of Object.entries(schema)) {
    const val = data[key];
    if (rules.required && (val === undefined || val === null || val === '')) errors.push(`${key}은(는) 필수입니다`);
    if (rules.minLength && typeof val === 'string' && val.length < rules.minLength) errors.push(`${key}은(는) 최소 ${rules.minLength}자입니다`);
    if (rules.maxLength && typeof val === 'string' && val.length > rules.maxLength) errors.push(`${key}은(는) 최대 ${rules.maxLength}자입니다`);
    if (rules.pattern && typeof val === 'string' && !rules.pattern.test(val)) errors.push(`${key} 형식이 올바르지 않습니다`);
  }
  return errors.length > 0 ? errors : null;
}

function sanitize(str) {
  if (typeof str !== 'string') return str;
  return str.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '').replace(/on\w+\s*=\s*"[^"]*"/gi, '').replace(/javascript:/gi, '');
}

module.exports = { validate, sanitize };
