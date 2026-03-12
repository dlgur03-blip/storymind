// @ts-nocheck
import { SupabaseClient } from '@supabase/supabase-js'

// Credit costs per AI action
export const CREDIT_COSTS: Record<string, number> = {
  'ai/chat': 1,
  'ai/suggest': 1,
  'ai/extract': 1,
  'ai/learn-style': 1,
  'ai/detect-cliches': 1,
  'ai/generate-names': 1,
  'ai/summarize-chapter': 1,
  'ai/summarize-work': 1,
  'ai/simulate-readers': 2,
  'ai/ghostwrite': 3,
  'ai/review': 5,
  'life/ai/chat': 1,
  'life/ai/recall-chat': 1,
  'life/ai/generate': 3,
  'life/ai/recall-generate': 3,
  'planner/chat': 2,
  'planner/auto-generate': 5,
  'planner/extend': 2,
  'planner/analyze-manuscript': 3,
}

export const CREDIT_PACKAGES = [
  { key: 'light', name: '라이트', credits: 100, price: 4900, description: '가볍게 시작하기' },
  { key: 'standard', name: '스탠다드', credits: 300, price: 9900, description: '인기 패키지', popular: true },
  { key: 'pro', name: '프로', credits: 1000, price: 24900, description: '헤비 유저를 위한' },
]

export const DAILY_FREE_CREDITS = 3
export const BANK_INFO = {
  bank: '농협',
  account: '3021855408351',
  holder: 'StoryMind',
}

export async function getCredits(supabase: SupabaseClient, userId: string): Promise<number> {
  const { data } = await supabase
    .from('user_credits')
    .select('balance')
    .eq('user_id', userId)
    .single()
  return data?.balance ?? 0
}

export async function useCredits(
  supabase: SupabaseClient,
  userId: string,
  actionKey: string,
  description: string
): Promise<{ success: boolean; remaining: number; error?: string }> {
  const cost = CREDIT_COSTS[actionKey] || 1

  // Get or create credit record
  let { data: credit } = await supabase
    .from('user_credits')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (!credit) {
    // Create credit record with daily free credits
    const { data: newCredit } = await supabase
      .from('user_credits')
      .insert({ user_id: userId, balance: DAILY_FREE_CREDITS, total_purchased: 0, total_used: 0 })
      .select()
      .single()
    credit = newCredit
  }

  if (!credit || credit.balance < cost) {
    return { success: false, remaining: credit?.balance ?? 0, error: `크레딧이 부족합니다 (필요: ${cost}, 보유: ${credit?.balance ?? 0})` }
  }

  const newBalance = credit.balance - cost

  // Deduct credits
  await supabase
    .from('user_credits')
    .update({ balance: newBalance, total_used: (credit.total_used || 0) + cost })
    .eq('user_id', userId)

  // Record transaction
  await supabase
    .from('credit_transactions')
    .insert({
      user_id: userId,
      type: 'use',
      amount: -cost,
      balance_after: newBalance,
      description,
      metadata: { action: actionKey },
    })

  return { success: true, remaining: newBalance }
}

export async function addCredits(
  supabase: SupabaseClient,
  userId: string,
  amount: number,
  type: 'purchase' | 'daily_free' | 'admin_grant' | 'refund',
  description: string
): Promise<number> {
  let { data: credit } = await supabase
    .from('user_credits')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (!credit) {
    const { data: newCredit } = await supabase
      .from('user_credits')
      .insert({ user_id: userId, balance: 0, total_purchased: 0, total_used: 0 })
      .select()
      .single()
    credit = newCredit
  }

  const newBalance = (credit?.balance ?? 0) + amount
  const totalPurchased = (credit?.total_purchased ?? 0) + (type === 'purchase' ? amount : 0)

  await supabase
    .from('user_credits')
    .update({ balance: newBalance, total_purchased: totalPurchased })
    .eq('user_id', userId)

  await supabase
    .from('credit_transactions')
    .insert({
      user_id: userId,
      type,
      amount,
      balance_after: newBalance,
      description,
    })

  return newBalance
}
