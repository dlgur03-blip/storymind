export const LIFE_GENRES = ['일상', '로맨스', '성장', '판타지', '감성', '유머', '공포', '기타'] as const

export type LifeGenre = (typeof LIFE_GENRES)[number]
