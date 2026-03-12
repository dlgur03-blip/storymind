// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'

// GET: 작품의 편집자 목록 또는 내가 편집자인 작품 목록
export async function GET(request: NextRequest) {
  try {
    const { user, supabase, error } = await getAuthUser()
    if (!user) return error

    const workId = request.nextUrl.searchParams.get('workId')
    const role = request.nextUrl.searchParams.get('role') // 'editor' = 내가 편집자인 목록

    if (role === 'editor') {
      // 내가 편집자로 참여중인 작품 목록
      const { data, error: dbError } = await supabase
        .from('work_collaborators')
        .select('*, works(id, title, genre, work_type, updated_at, user_id)')
        .eq('editor_id', user.id)
        .in('status', ['pending', 'active'])
        .order('created_at', { ascending: false })

      if (dbError) throw dbError
      return NextResponse.json({ collaborations: data || [] })
    }

    if (!workId) {
      return NextResponse.json({ error: 'workId 필수' }, { status: 400 })
    }

    // 작품의 편집자 목록 (작품 소유자만)
    const { data, error: dbError } = await supabase
      .from('work_collaborators')
      .select('*')
      .eq('work_id', workId)
      .neq('status', 'revoked')
      .order('created_at', { ascending: false })

    if (dbError) throw dbError

    // 편집자 이메일 정보 가져오기
    const editorIds = (data || []).map(c => c.editor_id)
    let editors = []
    if (editorIds.length > 0) {
      const { data: profiles } = await supabase
        .from('life_profiles')
        .select('user_id, display_name')
        .in('user_id', editorIds)

      editors = (data || []).map(c => ({
        ...c,
        display_name: profiles?.find(p => p.user_id === c.editor_id)?.display_name || '알 수 없음',
      }))
    }

    return NextResponse.json({ collaborators: editors || data || [] })
  } catch (error) {
    console.error('Collaborators GET error:', error)
    const msg = error instanceof Error ? error.message : JSON.stringify(error)
    return NextResponse.json({ error: '협업자 조회 실패', detail: msg }, { status: 500 })
  }
}

// POST: 편집자 초대
export async function POST(request: NextRequest) {
  try {
    const { user, supabase, error } = await getAuthUser()
    if (!user) return error

    const { workId, editorId, role = 'editor' } = await request.json()

    if (!workId || !editorId) {
      return NextResponse.json({ error: 'workId, editorId 필수' }, { status: 400 })
    }

    // 작품 소유자 확인
    const { data: work } = await supabase
      .from('works')
      .select('id, title, user_id')
      .eq('id', workId)
      .single()

    if (!work || work.user_id !== user.id) {
      return NextResponse.json({ error: '작품 소유자만 초대할 수 있습니다' }, { status: 403 })
    }

    // 자기 자신 초대 불가
    if (editorId === user.id) {
      return NextResponse.json({ error: '자기 자신을 초대할 수 없습니다' }, { status: 400 })
    }

    // 이미 초대된 경우 확인
    const { data: existing } = await supabase
      .from('work_collaborators')
      .select('id, status')
      .eq('work_id', workId)
      .eq('editor_id', editorId)
      .single()

    if (existing) {
      if (existing.status === 'active') {
        return NextResponse.json({ error: '이미 참여중인 편집자입니다' }, { status: 400 })
      }
      if (existing.status === 'pending') {
        return NextResponse.json({ error: '이미 초대된 편집자입니다' }, { status: 400 })
      }
      // revoked인 경우 다시 초대
      await supabase
        .from('work_collaborators')
        .update({ status: 'pending', role })
        .eq('id', existing.id)

      return NextResponse.json({ success: true, message: '다시 초대했습니다' })
    }

    const { data: collab, error: dbError } = await supabase
      .from('work_collaborators')
      .insert({
        work_id: workId,
        editor_id: editorId,
        role,
        status: 'pending',
        invited_by: 'writer',
      })
      .select()
      .single()

    if (dbError) throw dbError

    // 알림 생성
    await supabase.from('life_notifications').insert({
      user_id: editorId,
      type: 'editor_invite',
      actor_id: user.id,
      work_id_ref: workId,
      message: `"${work.title}" 작품의 편집자로 초대되었습니다`,
    })

    return NextResponse.json({ collaborator: collab })
  } catch (error) {
    console.error('Collaborators POST error:', error)
    return NextResponse.json({ error: '초대 실패' }, { status: 500 })
  }
}

// PATCH: 초대 수락/거절/역할 변경
export async function PATCH(request: NextRequest) {
  try {
    const { user, supabase, error } = await getAuthUser()
    if (!user) return error

    const { collaboratorId, action, role } = await request.json()

    if (!collaboratorId || !action) {
      return NextResponse.json({ error: 'collaboratorId, action 필수' }, { status: 400 })
    }

    const { data: collab } = await supabase
      .from('work_collaborators')
      .select('*, works(title, user_id)')
      .eq('id', collaboratorId)
      .single()

    if (!collab) {
      return NextResponse.json({ error: '초대를 찾을 수 없습니다' }, { status: 404 })
    }

    if (action === 'accept') {
      if (collab.editor_id !== user.id) {
        return NextResponse.json({ error: '본인만 수락할 수 있습니다' }, { status: 403 })
      }
      await supabase
        .from('work_collaborators')
        .update({ status: 'active' })
        .eq('id', collaboratorId)

      // 작가에게 알림
      if (collab.works?.user_id) {
        await supabase.from('life_notifications').insert({
          user_id: collab.works.user_id,
          type: 'editor_invite',
          actor_id: user.id,
          work_id_ref: collab.work_id,
          message: `편집자가 "${collab.works.title}" 초대를 수락했습니다`,
        })
      }
    } else if (action === 'reject') {
      if (collab.editor_id !== user.id) {
        return NextResponse.json({ error: '본인만 거절할 수 있습니다' }, { status: 403 })
      }
      await supabase
        .from('work_collaborators')
        .update({ status: 'revoked' })
        .eq('id', collaboratorId)
    } else if (action === 'revoke') {
      if (collab.works?.user_id !== user.id) {
        return NextResponse.json({ error: '작품 소유자만 해제할 수 있습니다' }, { status: 403 })
      }
      await supabase
        .from('work_collaborators')
        .update({ status: 'revoked' })
        .eq('id', collaboratorId)
    } else if (action === 'changeRole' && role) {
      if (collab.works?.user_id !== user.id) {
        return NextResponse.json({ error: '작품 소유자만 역할을 변경할 수 있습니다' }, { status: 403 })
      }
      await supabase
        .from('work_collaborators')
        .update({ role })
        .eq('id', collaboratorId)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Collaborators PATCH error:', error)
    return NextResponse.json({ error: '처리 실패' }, { status: 500 })
  }
}

// DELETE: 편집자 제거
export async function DELETE(request: NextRequest) {
  try {
    const { user, supabase, error } = await getAuthUser()
    if (!user) return error

    const collaboratorId = request.nextUrl.searchParams.get('collaboratorId')
    if (!collaboratorId) {
      return NextResponse.json({ error: 'collaboratorId 필수' }, { status: 400 })
    }

    await supabase
      .from('work_collaborators')
      .delete()
      .eq('id', collaboratorId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Collaborators DELETE error:', error)
    return NextResponse.json({ error: '삭제 실패' }, { status: 500 })
  }
}
