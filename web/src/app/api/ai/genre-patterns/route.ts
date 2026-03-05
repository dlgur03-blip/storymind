// @ts-nocheck
import { NextResponse } from 'next/server'

const GENRE_PATTERNS = {
  '판타지': {
    tensionPattern: [4, 5, 6, 7, 5, 8, 6, 9, 7, 10],
    cliffhangerRate: 0.7,
    dialogueRatio: { min: 35, max: 55 },
    aslRange: { min: 8, max: 15 },
    keyElements: ['레벨업', '던전', '스킬', '마법', '몬스터'],
    pacing: '빠른 초반 훅 → 성장 → 반전 → 클라이맥스',
  },
  '로맨스': {
    tensionPattern: [3, 4, 5, 6, 7, 5, 8, 7, 9, 8],
    cliffhangerRate: 0.5,
    dialogueRatio: { min: 45, max: 65 },
    aslRange: { min: 10, max: 18 },
    keyElements: ['설렘', '갈등', '오해', '고백', '화해'],
    pacing: '첫 만남 → 친밀해짐 → 오해/갈등 → 화해 → 결합',
  },
  '로판': {
    tensionPattern: [3, 5, 4, 6, 7, 5, 8, 6, 9, 7],
    cliffhangerRate: 0.6,
    dialogueRatio: { min: 40, max: 60 },
    aslRange: { min: 10, max: 16 },
    keyElements: ['빙의', '악녀', '회귀', '황태자', '궁정'],
    pacing: '빙의/회귀 → 생존 전략 → 로맨스 시작 → 음모 → 해피엔딩',
  },
  '무협': {
    tensionPattern: [5, 6, 7, 5, 8, 7, 9, 6, 10, 8],
    cliffhangerRate: 0.65,
    dialogueRatio: { min: 25, max: 45 },
    aslRange: { min: 8, max: 14 },
    keyElements: ['무공', '문파', '강호', '내공', '비급'],
    pacing: '수련 → 첫 대결 → 패배/성장 → 비급 획득 → 최종 대결',
  },
  '현판': {
    tensionPattern: [4, 5, 6, 7, 6, 8, 7, 9, 8, 10],
    cliffhangerRate: 0.65,
    dialogueRatio: { min: 40, max: 55 },
    aslRange: { min: 8, max: 14 },
    keyElements: ['각성', '던전', '헌터', '게이트', '랭킹'],
    pacing: '각성 → 첫 던전 → 성장 → 위기 → 세계적 위협',
  },
}

export async function GET() {
  return NextResponse.json({ patterns: GENRE_PATTERNS })
}
