// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { ArrowLeft, Users, BookOpen, FileText, Activity, DollarSign, Loader2, Coins, CheckCircle, XCircle } from 'lucide-react'

interface Overview {
  totalUsers: number
  totalWorks: number
  totalChapters: number
  todayWords: number
  activeToday: number
}

interface DailyTrend {
  date: string
  totalWords: number
  activeUsers: number
}

interface EndpointCost {
  calls: number
  cost: number
}

interface Cost {
  totalWeekly: number
  byEndpoint: Record<string, EndpointCost>
}

interface RecentWork {
  id: string
  title: string
  genre: string
  work_type: string
  created_at: string
  user_id: string
}

interface AdminData {
  overview: Overview
  dailyTrend: DailyTrend[]
  cost: Cost
  recentWorks: RecentWork[]
}

interface CreditRequest {
  id: string
  user_id: string
  userEmail: string
  package_key: string
  amount: number
  price: number
  depositor_name: string
  status: string
  admin_note: string
  created_at: string
  processed_at: string | null
}

export default function AdminPage() {
  const router = useRouter()
  const [data, setData] = useState<AdminData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [creditRequests, setCreditRequests] = useState<CreditRequest[]>([])
  const [processingId, setProcessingId] = useState<string | null>(null)

  useEffect(() => {
    async function fetchAdmin() {
      try {
        const res = await fetch('/api/admin')

        if (res.status === 403) {
          setError('관리자 권한이 필요합니다')
          setTimeout(() => router.push('/dashboard'), 2000)
          return
        }

        if (!res.ok) {
          throw new Error('데이터를 불러오지 못했습니다')
        }

        const json = await res.json()
        setData(json)

        // Fetch credit purchase requests
        const creditRes = await fetch('/api/admin/credits')
        if (creditRes.ok) {
          const creditJson = await creditRes.json()
          setCreditRequests(creditJson.requests || [])
        }
      } catch (err: any) {
        setError(err.message ?? '알 수 없는 오류가 발생했습니다')
      } finally {
        setLoading(false)
      }
    }

    fetchAdmin()
  }, [router])

  // --- Loading state ---
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-950">
        <Loader2 className="w-8 h-8 animate-spin text-neutral-400" />
      </div>
    )
  }

  // --- Error / 403 state ---
  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-neutral-50 dark:bg-neutral-950">
        <p className="text-lg font-medium text-red-500">{error}</p>
        <p className="text-sm text-neutral-500">대시보드로 이동합니다...</p>
      </div>
    )
  }

  const handleCreditAction = async (requestId: string, action: 'approve' | 'reject') => {
    setProcessingId(requestId)
    try {
      const res = await fetch('/api/admin/credits', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ requestId, action }),
      })
      if (res.ok) {
        setCreditRequests(prev => prev.map(r =>
          r.id === requestId ? { ...r, status: action === 'approve' ? 'approved' : 'rejected' } : r
        ))
      }
    } catch (err) {
      console.error('Credit action error:', err)
    }
    setProcessingId(null)
  }

  if (!data) return null

  const { overview, dailyTrend, cost, recentWorks } = data

  // Format date string for chart labels (MM/DD)
  const chartData = dailyTrend.map((d) => ({
    ...d,
    label: d.date ? d.date.slice(5) : '',
  }))

  const overviewCards = [
    { icon: Users, label: '전체 사용자', value: overview.totalUsers },
    { icon: BookOpen, label: '전체 작품', value: overview.totalWorks },
    { icon: FileText, label: '전체 챕터', value: overview.totalChapters },
    { icon: Activity, label: '오늘 활성 사용자', value: overview.activeToday },
  ]

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/80 dark:bg-neutral-950/80 backdrop-blur border-b border-neutral-200 dark:border-neutral-800">
        <div className="max-w-6xl mx-auto flex items-center gap-4 px-6 py-4">
          <button
            onClick={() => router.push('/dashboard')}
            className="flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            대시보드
          </button>
          <h1 className="text-xl font-bold tracking-tight">관리자 대시보드</h1>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        {/* ── Section 1: Overview Cards ── */}
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-4">
            Overview
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {overviewCards.map(({ icon: Icon, label, value }) => (
              <div
                key={label}
                className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-5 flex items-center gap-4"
              >
                <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-neutral-100 dark:bg-neutral-800">
                  <Icon className="w-5 h-5 text-neutral-600 dark:text-neutral-300" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{value.toLocaleString()}</p>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">{label}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Section 2: Daily Trend Chart ── */}
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-4">
            7일간 글쓰기 트렌드
          </h2>
          <div className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-6">
            {chartData.length === 0 ? (
              <p className="text-center text-neutral-400 py-12">데이터가 없습니다</p>
            ) : (
              <div className="space-y-6">
                {/* Words bar chart */}
                <div>
                  <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-2">
                    일별 글자 수
                  </p>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -16 }}>
                      <XAxis
                        dataKey="label"
                        tick={{ fontSize: 12, fill: '#a3a3a3' }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 12, fill: '#a3a3a3' }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#262626',
                          border: 'none',
                          borderRadius: '0.75rem',
                          color: '#f5f5f5',
                          fontSize: '0.875rem',
                        }}
                        labelFormatter={(v) => `날짜: ${v}`}
                        formatter={(value: number) => [value.toLocaleString(), '글자 수']}
                      />
                      <Bar dataKey="totalWords" fill="#6366f1" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Active users bar chart */}
                <div>
                  <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-2">
                    일별 활성 사용자
                  </p>
                  <ResponsiveContainer width="100%" height={140}>
                    <BarChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -16 }}>
                      <XAxis
                        dataKey="label"
                        tick={{ fontSize: 12, fill: '#a3a3a3' }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 12, fill: '#a3a3a3' }}
                        axisLine={false}
                        tickLine={false}
                        allowDecimals={false}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#262626',
                          border: 'none',
                          borderRadius: '0.75rem',
                          color: '#f5f5f5',
                          fontSize: '0.875rem',
                        }}
                        labelFormatter={(v) => `날짜: ${v}`}
                        formatter={(value: number) => [value, '활성 사용자']}
                      />
                      <Bar dataKey="activeUsers" fill="#22d3ee" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ── Section 3: API Cost Tracking ── */}
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-4">
            API 비용 (주간)
          </h2>
          <div className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-6 space-y-5">
            {/* Total weekly cost */}
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-900/30">
                <DollarSign className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">${cost.totalWeekly.toFixed(4)}</p>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">이번 주 총 비용</p>
              </div>
            </div>

            {/* Endpoint breakdown table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-neutral-200 dark:border-neutral-800 text-neutral-500 dark:text-neutral-400">
                    <th className="text-left py-2 pr-4 font-medium">엔드포인트</th>
                    <th className="text-right py-2 px-4 font-medium">호출 수</th>
                    <th className="text-right py-2 pl-4 font-medium">비용</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(cost.byEndpoint).length === 0 ? (
                    <tr>
                      <td colSpan={3} className="py-6 text-center text-neutral-400">
                        데이터가 없습니다
                      </td>
                    </tr>
                  ) : (
                    Object.entries(cost.byEndpoint).map(([endpoint, info]) => (
                      <tr
                        key={endpoint}
                        className="border-b border-neutral-100 dark:border-neutral-800/60 last:border-0"
                      >
                        <td className="py-2.5 pr-4 font-mono text-xs">{endpoint}</td>
                        <td className="py-2.5 px-4 text-right tabular-nums">
                          {info.calls.toLocaleString()}
                        </td>
                        <td className="py-2.5 pl-4 text-right tabular-nums">
                          ${info.cost.toFixed(4)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* ── Section 4: Credit Purchase Requests ── */}
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-4">
            크레딧 구매 요청
          </h2>
          <div className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 overflow-hidden">
            <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-neutral-50 dark:bg-neutral-800">
                  <tr className="text-neutral-500 dark:text-neutral-400">
                    <th className="text-left py-3 px-5 font-medium">사용자</th>
                    <th className="text-left py-3 px-4 font-medium">패키지</th>
                    <th className="text-right py-3 px-4 font-medium">금액</th>
                    <th className="text-left py-3 px-4 font-medium">입금자</th>
                    <th className="text-left py-3 px-4 font-medium">일시</th>
                    <th className="text-left py-3 px-4 font-medium">상태</th>
                    <th className="text-center py-3 px-5 font-medium">처리</th>
                  </tr>
                </thead>
                <tbody>
                  {creditRequests.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-neutral-400">
                        구매 요청이 없습니다
                      </td>
                    </tr>
                  ) : (
                    creditRequests.map((req) => (
                      <tr key={req.id} className="border-t border-neutral-100 dark:border-neutral-800/60">
                        <td className="py-3 px-5 text-xs">{req.userEmail}</td>
                        <td className="py-3 px-4">{req.package_key} ({req.amount})</td>
                        <td className="py-3 px-4 text-right tabular-nums">{req.price.toLocaleString()}원</td>
                        <td className="py-3 px-4 font-medium">{req.depositor_name}</td>
                        <td className="py-3 px-4 text-neutral-500 tabular-nums">
                          {new Date(req.created_at).toLocaleDateString('ko-KR')}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            req.status === 'pending' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400' :
                            req.status === 'approved' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400' :
                            'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                          }`}>
                            {req.status === 'pending' ? '대기' : req.status === 'approved' ? '승인' : '거절'}
                          </span>
                        </td>
                        <td className="py-3 px-5 text-center">
                          {req.status === 'pending' ? (
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => handleCreditAction(req.id, 'approve')}
                                disabled={processingId === req.id}
                                className="p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-colors disabled:opacity-50"
                                title="승인"
                              >
                                <CheckCircle className="w-5 h-5" />
                              </button>
                              <button
                                onClick={() => handleCreditAction(req.id, 'reject')}
                                disabled={processingId === req.id}
                                className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
                                title="거절"
                              >
                                <XCircle className="w-5 h-5" />
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-neutral-400">처리 완료</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* ── Section 5: Recent Works Table ── */}
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-4">
            최근 작품
          </h2>
          <div className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 overflow-hidden">
            <div className="overflow-x-auto max-h-[520px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-neutral-50 dark:bg-neutral-800">
                  <tr className="text-neutral-500 dark:text-neutral-400">
                    <th className="text-left py-3 px-5 font-medium">제목</th>
                    <th className="text-left py-3 px-4 font-medium">장르</th>
                    <th className="text-left py-3 px-4 font-medium">유형</th>
                    <th className="text-left py-3 px-4 font-medium">생성일</th>
                    <th className="text-left py-3 px-5 font-medium">사용자 ID</th>
                  </tr>
                </thead>
                <tbody>
                  {recentWorks.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-neutral-400">
                        작품이 없습니다
                      </td>
                    </tr>
                  ) : (
                    recentWorks.slice(0, 20).map((work) => (
                      <tr
                        key={work.id}
                        className="border-t border-neutral-100 dark:border-neutral-800/60 hover:bg-neutral-50 dark:hover:bg-neutral-800/40 transition-colors"
                      >
                        <td className="py-3 px-5 font-medium max-w-[200px] truncate">
                          {work.title}
                        </td>
                        <td className="py-3 px-4 text-neutral-600 dark:text-neutral-400">
                          {work.genre || '-'}
                        </td>
                        <td className="py-3 px-4 text-neutral-600 dark:text-neutral-400">
                          {work.work_type || '-'}
                        </td>
                        <td className="py-3 px-4 text-neutral-500 dark:text-neutral-400 tabular-nums">
                          {work.created_at
                            ? new Date(work.created_at).toLocaleDateString('ko-KR', {
                                year: 'numeric',
                                month: '2-digit',
                                day: '2-digit',
                              })
                            : '-'}
                        </td>
                        <td className="py-3 px-5 font-mono text-xs text-neutral-500 dark:text-neutral-400">
                          {work.user_id ? work.user_id.slice(0, 8) + '...' : '-'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
