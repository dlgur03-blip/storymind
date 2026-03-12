// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { CREDIT_PACKAGES, BANK_INFO } from '@/lib/credits'

export async function GET() {
  try {
    const { user, supabase, error } = await getAuthUser()
    if (!user) return error

    // Get credit balance
    const { data: credit } = await supabase
      .from('user_credits')
      .select('*')
      .eq('user_id', user.id)
      .single()

    // Get recent transactions
    const { data: transactions } = await supabase
      .from('credit_transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20)

    // Get pending purchase requests
    const { data: pendingRequests } = await supabase
      .from('credit_purchase_requests')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10)

    return NextResponse.json({
      balance: credit?.balance ?? 0,
      totalPurchased: credit?.total_purchased ?? 0,
      totalUsed: credit?.total_used ?? 0,
      transactions: transactions || [],
      pendingRequests: pendingRequests || [],
      packages: CREDIT_PACKAGES,
      bankInfo: BANK_INFO,
    })
  } catch (error) {
    console.error('Credits GET error:', error)
    return NextResponse.json({ error: '크레딧 조회 중 오류 발생' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, supabase, error } = await getAuthUser()
    if (!user) return error

    const { packageKey, depositorName } = await request.json()

    if (!packageKey || !depositorName) {
      return NextResponse.json({ error: '패키지와 입금자명을 입력해주세요' }, { status: 400 })
    }

    const pkg = CREDIT_PACKAGES.find(p => p.key === packageKey)
    if (!pkg) {
      return NextResponse.json({ error: '유효하지 않은 패키지입니다' }, { status: 400 })
    }

    // Check for existing pending request
    const { data: existing } = await supabase
      .from('credit_purchase_requests')
      .select('id')
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .single()

    if (existing) {
      return NextResponse.json({ error: '이미 대기 중인 구매 요청이 있습니다' }, { status: 400 })
    }

    const { data: purchaseRequest, error: insertError } = await supabase
      .from('credit_purchase_requests')
      .insert({
        user_id: user.id,
        package_key: packageKey,
        amount: pkg.credits,
        price: pkg.price,
        depositor_name: depositorName,
      })
      .select()
      .single()

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 400 })
    }

    return NextResponse.json({
      message: '구매 요청이 등록되었습니다. 입금 확인 후 크레딧이 지급됩니다.',
      request: purchaseRequest,
      bankInfo: BANK_INFO,
    })
  } catch (error) {
    console.error('Credits POST error:', error)
    return NextResponse.json({ error: '구매 요청 중 오류 발생' }, { status: 500 })
  }
}
