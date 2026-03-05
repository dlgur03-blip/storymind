// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'

// POST: Create a read request
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: '로그인 필요' }, { status: 401 })

    const { story_id } = await request.json()
    if (!story_id) return NextResponse.json({ error: 'story_id 필요' }, { status: 400 })

    // Can't request own story
    const { data: story } = await supabase
      .from('life_stories')
      .select('id, user_id, title')
      .eq('id', story_id)
      .single()

    if (!story) return NextResponse.json({ error: '스토리를 찾을 수 없습니다' }, { status: 404 })
    if (story.user_id === user.id) return NextResponse.json({ error: '본인 스토리입니다' }, { status: 400 })

    // Upsert (re-request after rejection)
    const { data: req, error } = await supabase
      .from('life_read_requests')
      .upsert(
        { requester_id: user.id, story_id, status: 'pending' },
        { onConflict: 'requester_id,story_id' }
      )
      .select()
      .single()

    if (error) throw error

    // Notify story author
    const { data: requesterProfile } = await supabase
      .from('life_profiles')
      .select('display_name')
      .eq('user_id', user.id)
      .single()

    await supabase.from('life_notifications').insert({
      user_id: story.user_id,
      type: 'system',
      actor_id: user.id,
      story_id,
      message: `${requesterProfile?.display_name || '누군가'}님이 "${story.title}" 읽기를 요청했습니다`,
    })

    return NextResponse.json({ request: req })
  } catch (error) {
    console.error('Read request POST error:', error)
    return NextResponse.json({ error: '요청 실패' }, { status: 500 })
  }
}

// GET: Get read requests for my stories (as author)
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: '로그인 필요' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const statusFilter = searchParams.get('status') || 'pending'

    // Get my stories' IDs
    const { data: myStories } = await supabase
      .from('life_stories')
      .select('id, title')
      .eq('user_id', user.id)

    if (!myStories || myStories.length === 0) {
      return NextResponse.json({ requests: [] })
    }

    const storyIds = myStories.map(s => s.id)
    const storyMap = Object.fromEntries(myStories.map(s => [s.id, s.title]))

    // Get requests for my stories
    let query = supabase
      .from('life_read_requests')
      .select('id, requester_id, story_id, status, created_at')
      .in('story_id', storyIds)
      .order('created_at', { ascending: false })

    if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter)
    }

    const { data: requests } = await query

    // Get requester profiles
    const requesterIds = [...new Set((requests || []).map(r => r.requester_id))]
    const { data: profiles } = requesterIds.length > 0
      ? await supabase.from('life_profiles').select('user_id, display_name, avatar_url').in('user_id', requesterIds)
      : { data: [] }

    const profileMap = Object.fromEntries((profiles || []).map(p => [p.user_id, p]))

    const enriched = (requests || []).map(r => ({
      ...r,
      storyTitle: storyMap[r.story_id] || '',
      requesterName: profileMap[r.requester_id]?.display_name || '익명',
      requesterAvatar: profileMap[r.requester_id]?.avatar_url || '',
    }))

    return NextResponse.json({ requests: enriched })
  } catch (error) {
    console.error('Read request GET error:', error)
    return NextResponse.json({ error: '조회 실패' }, { status: 500 })
  }
}

// PATCH: Accept or reject a read request
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: '로그인 필요' }, { status: 401 })

    const { request_id, status } = await request.json()
    if (!request_id || !['accepted', 'rejected'].includes(status)) {
      return NextResponse.json({ error: '잘못된 요청' }, { status: 400 })
    }

    // Verify ownership: the request must be for one of my stories
    const { data: req } = await supabase
      .from('life_read_requests')
      .select('id, requester_id, story_id, status')
      .eq('id', request_id)
      .single()

    if (!req) return NextResponse.json({ error: '요청을 찾을 수 없습니다' }, { status: 404 })

    const { data: story } = await supabase
      .from('life_stories')
      .select('user_id, title')
      .eq('id', req.story_id)
      .single()

    if (!story || story.user_id !== user.id) {
      return NextResponse.json({ error: '권한이 없습니다' }, { status: 403 })
    }

    // Update status
    const { data: updated, error } = await supabase
      .from('life_read_requests')
      .update({ status })
      .eq('id', request_id)
      .select()
      .single()

    if (error) throw error

    // Notify requester
    const statusText = status === 'accepted' ? '수락' : '거절'
    await supabase.from('life_notifications').insert({
      user_id: req.requester_id,
      type: 'system',
      actor_id: user.id,
      story_id: req.story_id,
      message: `"${story.title}" 읽기 요청이 ${statusText}되었습니다`,
    })

    return NextResponse.json({ request: updated })
  } catch (error) {
    console.error('Read request PATCH error:', error)
    return NextResponse.json({ error: '처리 실패' }, { status: 500 })
  }
}
