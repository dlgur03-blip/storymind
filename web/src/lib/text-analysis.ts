// Korean text style analysis (no external NLP dependency)
// Ported from desktop/server/lib/text-analysis.js

export interface StyleAnalysis {
  asl: number
  dialogue_ratio: number
  description_density: number
  vocab_diversity: number
  active_ratio: number
  conjunctions: { contrast: number; sequential: number; additive: number }
  pov: 'first' | 'third' | 'mixed'
  total_sentences: number
  total_words: number
  total_chars: number
}

export function analyzeStyle(text: string): StyleAnalysis | null {
  if (!text || text.length < 100) return null
  const clean = text.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim()
  if (!clean) return null

  const sentences = clean.split(/[.!?。]+/).filter(s => s.trim().length > 3)
  const words = clean.split(/\s+/).filter(w => w.length > 0)
  const asl = sentences.length > 0 ? words.length / sentences.length : 0

  const dialoguePattern = /["\"「」『』"][^"\"「」『』"]*["\"「」『』"]/g
  const dialogues = clean.match(dialoguePattern) || []
  const dialogueChars = dialogues.reduce((sum, d) => sum + d.length, 0)
  const dr = clean.length > 0 ? dialogueChars / clean.length : 0

  const sensoryWords = /[보이|들리|느껴|향기|냄새|차가|따뜻|뜨거|시원|부드럽|거칠|빛나|어두|밝|붉|푸르|검|하얀|노란|빨간|파란|초록|은빛|금빛|햇살|바람|소리|목소리|눈빛|표정|숨결|맥박]/g
  const sensoryMatches = clean.match(sensoryWords) || []
  const dd = sentences.length > 0 ? sensoryMatches.length / sentences.length : 0

  const uniqueWords = new Set(words.map(w => w.replace(/[^가-힣a-zA-Z]/g, '')).filter(w => w.length > 0))
  const ttr = words.length > 0 ? uniqueWords.size / Math.min(words.length, 1000) : 0

  const passiveEndings = (clean.match(/[되|당하|받|지|되어|당해]/g) || []).length
  const activeRatio = sentences.length > 0 ? 1 - (passiveEndings / sentences.length) : 1

  const conjunctions = {
    contrast: (clean.match(/그러나|하지만|반면|그렇지만|오히려|도리어/g) || []).length,
    sequential: (clean.match(/그래서|따라서|그러므로|때문에|덕분에/g) || []).length,
    additive: (clean.match(/그리고|또한|게다가|더구나|뿐만 아니라/g) || []).length,
  }

  const firstPerson = (clean.match(/나는|나를|내가|내|나의/g) || []).length
  const thirdPerson = (clean.match(/그는|그녀는|그가|그녀가|그의|그녀의/g) || []).length
  const pov: 'first' | 'third' | 'mixed' = firstPerson > thirdPerson * 2 ? 'first' : thirdPerson > firstPerson * 2 ? 'third' : 'mixed'

  return {
    asl: Math.round(asl * 10) / 10,
    dialogue_ratio: Math.round(dr * 1000) / 1000,
    description_density: Math.round(dd * 100) / 100,
    vocab_diversity: Math.round(ttr * 1000) / 1000,
    active_ratio: Math.round(activeRatio * 100) / 100,
    conjunctions,
    pov,
    total_sentences: sentences.length,
    total_words: words.length,
    total_chars: clean.length,
  }
}
