// Legacy compatibility — now powered by Gemini 2.5 Flash
const { callGemini, parseJSON, MODELS } = require('./gemini');
const callClaude = callGemini;
module.exports = { callClaude, callGemini, parseJSON, MODELS };
