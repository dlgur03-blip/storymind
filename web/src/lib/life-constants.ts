export const LIFE_GENRES = ['일상', '로맨스', '성장', '판타지', '감성', '유머', '공포', '기타'] as const

export type LifeGenre = (typeof LIFE_GENRES)[number]

export const SERIES_TYPES = [
  { key: 'short', label: '단편', description: '완결된 짧은 이야기 (1~3화)' },
  { key: 'long', label: '장편', description: '연재되는 긴 이야기 (4화 이상)' },
] as const

export type SeriesType = 'short' | 'long'
