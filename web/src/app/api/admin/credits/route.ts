// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getAuthUser } from '@/lib/auth'
import { addCredits } from '@/lib/credits'

const ADMIN_EMAILS = ['dlgur03@gmail.com']

export async function GET() {
  try {
    const { user, supabase, error } = await getAuthUser()
    if (!user) return error

    if (!ADMIN_EMAILS.includes(user.email || '')) {
      return NextResponse.json({ error: '관리자 권한이 필요합니다' }, { status: 403 })
    }

    // Get pending purchase requests with user info
    const { data: requests } = await supabase
      .from('credit_purchase_requests')
      .select('*')
      .order('created_at', { ascending: false })

    // Fetch user emails using service role client (admin API requires service role)
    const userIds = [...new Set((requests || []).map(r => r.user_id))]
    const userEmails: Record<string, string> = {}

    const serviceSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    for (const uid of userIds) {
      try {
        const { data } = await serviceSupabase.auth.admin.getUserById(uid)
        if (data?.user) {
          userEmails[uid] = data.user.email || '알 수 없음'
        }
      } catch (e) {
        console.warn(`Failed to fetch user ${uid}:`, e)
      }
    }

    const enrichedRequests = (requests || []).map(r => ({
      ...r,
      userEmail: userEmails[r.user_id] || '알 수 없음',
    }))

    return NextResponse.json({ requests: enrichedRequests })
  } catch (error) {
    console.error('Admin credits GET error:', error)
    return NextResponse.json({ error: '구매 요청 조회 중 오류 발생' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, supabase, error } = await getAuthUser()
    if (!user) return error

    if (!ADMIN_EMAILS.includes(user.email || '')) {
      return NextResponse.json({ error: '관리자 권한이 필요합니다' }, { status: 403 })
    }

    const { requestId, action, adminNote } = await request.json()

    if (!requestId || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: '유효하지 않은 요청입니다' }, { status: 400 })
    }

    // Get the purchase request
    const { data: purchaseRequest } = await supabase
      .from('credit_purchase_requests')
      .select('*')
      .eq('id', requestId)
      .single()

    if (!purchaseRequest) {
      return NextResponse.json({ error: '구매 요청을 찾을 수 없습니다' }, { status: 404 })
    }

    if (purchaseRequest.status !== 'pending') {
      return NextResponse.json({ error: '이미 처리된 요청입니다' }, { status: 400 })
    }

    const newStatus = action === 'approve' ? 'approved' : 'rejected'

    // Update the request status
    await supabase
      .from('credit_purchase_requests')
      .update({
        status: newStatus,
        admin_note: adminNote || '',
        processed_at: new Date().toISOString(),
      })
      .eq('id', requestId)

    // If approved, add credits to the user
    if (action === 'approve') {
      await addCredits(
        supabase,
        purchaseRequest.user_id,
        purchaseRequest.amount,
        'purchase',
        `${purchaseRequest.package_key} 패키지 구매 (${purchaseRequest.amount} 크레딧)`
      )
    }

    return NextResponse.json({
      message: action === 'approve'
        ? `${purchaseRequest.amount} 크레딧이 지급되었습니다`
        : '구매 요청이 거절되었습니다',
      status: newStatus,
    })
  } catch (error) {
    console.error('Admin credits POST error:', error)
    return NextResponse.json({ error: '구매 요청 처리 중 오류 발생' }, { status: 500 })
  }
}
