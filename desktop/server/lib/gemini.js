const logger = require('./logger');

// API 키를 동적으로 읽음 (설정 변경 시 즉시 반영)
const getApiKey = () => process.env.GEMINI_API_KEY || '';
const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

// Gemini 2.5 Flash - 안정 버전
const MODELS = {
  critical: 'gemini-2.5-flash',
  standard: 'gemini-2.5-flash',
  light:    'gemini-2.5-flash-lite',
};

async function callGemini(systemPrompt, userMessage, maxTokens = 4096, priority = 'standard') {
  const model = MODELS[priority] || MODELS.standard;
  const start = Date.now();
  try {
    const url = `${BASE_URL}/${model}:generateContent?key=${getApiKey()}`;
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: 'user', parts: [{ text: userMessage }] }],
        generationConfig: {
          maxOutputTokens: maxTokens,
          temperature: 0.7,
          responseMimeType: 'text/plain',
        },
      })
    });
    const data = await resp.json();
    const latency = Date.now() - start;

    // Extract token usage from Gemini response
    const usage = data.usageMetadata || {};
    const tokensIn = usage.promptTokenCount || 0;
    const tokensOut = usage.candidatesTokenCount || 0;

    logger.info('Gemini API call', { model, latency, status: resp.status, tokensIn, tokensOut });

    // Track usage (non-blocking) — Gemini 2.5 Flash pricing: $0.15/$0.60 per 1M
    try {
      const db = require('./db');
      const costEstimate = (tokensIn * 0.00000015) + (tokensOut * 0.0000006);
      db.prepare('INSERT INTO api_usage (user_id,endpoint,model,tokens_in,tokens_out,cost_estimate) VALUES (?,?,?,?,?,?)')
        .run(global.__currentUserId || 0, 'gemini', model, tokensIn, tokensOut, costEstimate);
    } catch(_) {}

    // Extract text from Gemini response
    const candidate = data.candidates?.[0];
    if (candidate?.content?.parts?.[0]?.text) {
      return candidate.content.parts[0].text;
    }

    // Handle blocked or error responses
    if (candidate?.finishReason === 'SAFETY') {
      throw new Error('Content blocked by safety filter');
    }
    if (data.error) {
      throw new Error(data.error.message || JSON.stringify(data.error));
    }

    return JSON.stringify(data);
  } catch (err) {
    logger.error('Gemini API error', { error: err.message, model, latency: Date.now() - start });

    // Retry once on transient errors
    if (priority === 'critical') {
      logger.warn('Retrying critical request');
      try {
        const url = `${BASE_URL}/${MODELS.standard}:generateContent?key=${getApiKey()}`;
        const resp = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: systemPrompt }] },
            contents: [{ role: 'user', parts: [{ text: userMessage }] }],
            generationConfig: { maxOutputTokens: maxTokens, temperature: 0.7 },
          })
        });
        const data = await resp.json();
        if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
          return data.candidates[0].content.parts[0].text;
        }
      } catch(retryErr) {
        logger.error('Gemini retry also failed', { error: retryErr.message });
      }
    }
    throw new Error('AI 서비스 오류: ' + err.message);
  }
}

function parseJSON(text) {
  if (!text) return { raw: '', _parseError: true };
  try {
    const m = text.match(/\{[\s\S]*\}/);
    if (m) return JSON.parse(m[0]);
    const cleaned = text.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
    const m2 = cleaned.match(/\{[\s\S]*\}/);
    if (m2) return JSON.parse(m2[0]);
    return { raw: text, _parseError: true };
  } catch (e) {
    logger.warn('JSON parse failed', { error: e.message, textPreview: text.substring(0, 100) });
    return { raw: text, _parseError: true };
  }
}

// Backward-compatible aliases
const callClaude = callGemini;

module.exports = { callGemini, callClaude, parseJSON, MODELS };
