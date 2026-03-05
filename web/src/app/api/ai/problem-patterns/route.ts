// @ts-nocheck
import { NextResponse } from 'next/server'

const PROBLEM_PATTERNS = {
  '설정 모순': {
    frequency: 'very_high',
    description: '캐릭터/세계관 설정이 앞뒤가 맞지 않음',
    examples: ['키/나이/능력 등이 회차별로 다름', '이미 죽은 캐릭터가 재등장', '마법 체계 규칙 위반'],
    solution: 'StoryVault를 활용하여 설정을 일관되게 관리하세요',
  },
  '캐릭터 불일치': {
    frequency: 'high',
    description: '캐릭터 성격/말투가 갑자기 변함',
    examples: ['냉정한 캐릭터가 갑자기 수다스러워짐', '존댓말 캐릭터가 반말 사용', '공포증 있는 캐릭터가 태연하게 행동'],
    solution: '캐릭터 프로필에 말투 패턴과 행동 특성을 상세히 기록하세요',
  },
  '복선 미회수': {
    frequency: 'high',
    description: '심어둔 복선을 잊고 회수하지 않음',
    examples: ['의미심장하게 언급된 아이템이 잊힘', '떡밥이 50화 넘게 방치', '독자가 기대한 반전이 없음'],
    solution: '복선 관리 기능으로 설치/회수를 체계적으로 추적하세요',
  },
  '텐션 부족': {
    frequency: 'medium',
    description: '3화 이상 저텐션이 지속되어 독자 이탈',
    examples: ['일상 묘사만 계속됨', '갈등 없는 평화로운 전개', '클리프행어 없는 마무리'],
    solution: '텐션 곡선 분석을 활용하여 페이싱을 조절하세요',
  },
  '과도한 설명': {
    frequency: 'medium',
    description: '서술이 과도하여 속도감 저하',
    examples: ['세계관 설명이 2페이지 이상', '캐릭터 외모 묘사가 지나침', '불필요한 배경 묘사'],
    solution: '대화를 통해 정보를 전달하고, 행동으로 성격을 보여주세요',
  },
  '클리셰 과다': {
    frequency: 'medium',
    description: '진부한 표현과 뻔한 전개의 반복',
    examples: ['"눈을 떴다"로 시작', '갑작스러운 시스템 창', '모든 여캐가 주인공에게 호감'],
    solution: '클리셰 탐지 기능으로 진부한 표현을 찾아 개선하세요',
  },
}

export async function GET() {
  return NextResponse.json({ patterns: PROBLEM_PATTERNS })
}
