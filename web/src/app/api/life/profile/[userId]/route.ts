// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'

export async function GET(request: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  try {
    const { userId } = await params
    const supabase = await createServerSupabase()

    const { data: profile } = await supabase
      .from('life_profiles')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (!profile) {
      return NextResponse.json({ error: '프로필을 찾을 수 없습니다' }, { status: 404 })
    }

    const { data: stories } = await supabase
      .from('life_stories')
      .select('*')
      .eq('user_id', userId)
      .eq('is_public', true)
      .order('created_at', { ascending: false })

    return NextResponse.json({ profile, stories: stories || [] })
  } catch (error) {
    console.error('Public profile error:', error)
    return NextResponse.json({ error: '프로필 조회 실패' }, { status: 500 })
  }
}
