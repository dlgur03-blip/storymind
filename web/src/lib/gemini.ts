// @ts-nocheck
import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY!)

export async function callGemini(
  systemPrompt: string,
  userContent: string,
  options?: { temperature?: number; maxOutputTokens?: number }
): Promise<string> {
  const { temperature = 0.7, maxOutputTokens = 2048 } = options || {}
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-preview-05-20' })
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: `${systemPrompt}\n\n---\n\n${userContent}` }] }],
      generationConfig: { temperature, maxOutputTokens },
    })
    return result.response.text()
  } catch (error) {
    console.error('Gemini API error:', error)
    throw error
  }
}

export function parseJSON(text: string): Record<string, unknown> {
  if (!text) return {}
  try {
    const match = text.match(/\{[\s\S]*\}/)
    if (match) return JSON.parse(match[0])
    const cleaned = text.replace(/```json?\n?/g, '').replace(/```/g, '').trim()
    const m2 = cleaned.match(/\{[\s\S]*\}/)
    if (m2) return JSON.parse(m2[0])
    return {}
  } catch {
    return {}
  }
}
