// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'

export async function GET() {
  try {
    const { user, supabase, error } = await getAuthUser()
    if (!user) return error

    const { data } = await supabase
      .from('life_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single()

    return NextResponse.json({ profile: data })
  } catch (error) {
    console.error('Profile GET error:', error)
    return NextResponse.json({ error: '프로필 조회 실패' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, supabase, error } = await getAuthUser()
    if (!user) return error

    const body = await request.json()
    const { display_name, bio, avatar_url } = body

    const { data, error: dbError } = await supabase
      .from('life_profiles')
      .upsert({
        user_id: user.id,
        display_name: display_name || '',
        bio: bio || '',
        avatar_url: avatar_url || '',
      }, { onConflict: 'user_id' })
      .select()
      .single()

    if (dbError) throw dbError

    return NextResponse.json({ profile: data })
  } catch (error) {
    console.error('Profile POST error:', error)
    return NextResponse.json({ error: '프로필 저장 실패' }, { status: 500 })
  }
}
