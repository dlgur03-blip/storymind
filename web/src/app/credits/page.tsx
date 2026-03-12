// @ts-nocheck
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabase } from '@/lib/supabase/client'
import {
  Coins, Check, ArrowLeft, Copy, Clock, CheckCircle, XCircle,
  Sparkles, ChevronRight, Gift
} from 'lucide-react'

const PACKAGES = [
  { key: 'light', name: '라이트', credits: 100, price: 4900, perCredit: 49, description: '가볍게 시작하기' },
  { key: 'standard', name: '스탠다드', credits: 300, price: 9900, perCredit: 33, description: '인기 패키지', popular: true },
  { key: 'pro', name: '프로', credits: 1000, price: 24900, perCredit: 25, description: '헤비 유저를 위한' },
]

const BANK_INFO = {
  bank: '농협',
  account: '3021855408351',
  holder: 'StoryMind',
}

export default function CreditsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [balance, setBalance] = useState(0)
  const [transactions, setTransactions] = useState<any[]>([])
  const [purchaseRequests, setPurchaseRequests] = useState<any[]>([])
  const [selectedPkg, setSelectedPkg] = useState<string | null>(null)
  const [depositorName, setDepositorName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [copied, setCopied] = useState(false)
  const [claimingDaily, setClaimingDaily] = useState(false)
  const [dailyClaimed, setDailyClaimed] = useState(false)
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'))
  }, [])

  useEffect(() => {
    const init = async () => {
      const supabase = getSupabase()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/'); return }

      const res = await fetch('/api/credits')
      if (res.ok) {
        const data = await res.json()
        setBalance(data.balance)
        setTransactions(data.transactions || [])
        setPurchaseRequests(data.purchaseRequests || [])
        setDailyClaimed(data.dailyClaimed || false)
      }
      setLoading(false)
    }
    init()
  }, [router])

  const handleCopy = () => {
    navigator.clipboard.writeText(BANK_INFO.account)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleSubmit = async () => {
    if (!selectedPkg || !depositorName.trim()) return
    setSubmitting(true)
    const res = await fetch('/api/credits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ packageKey: selectedPkg, depositorName: depositorName.trim() }),
    })
    if (res.ok) {
      setSubmitted(true)
      setSelectedPkg(null)
      setDepositorName('')
      // Refresh data
      const refreshRes = await fetch('/api/credits')
      if (refreshRes.ok) {
        const data = await refreshRes.json()
        setPurchaseRequests(data.purchaseRequests || [])
      }
    }
    setSubmitting(false)
  }

  const handleClaimDaily = async () => {
    setClaimingDaily(true)
    const res = await fetch('/api/credits/daily', { method: 'POST' })
    if (res.ok) {
      const data = await res.json()
      setBalance(data.balance)
      setDailyClaimed(true)
    }
    setClaimingDaily(false)
  }

  const formatPrice = (n: number) => n.toLocaleString('ko-KR')
  const statusLabel = (s: string) => {
    switch (s) {
      case 'pending': return '확인 중'
      case 'approved': return '승인'
      case 'rejected': return '거절'
      default: return s
    }
  }
  const statusColor = (s: string) => {
    switch (s) {
      case 'pending': return 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/15'
      case 'approved': return 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/15'
      case 'rejected': return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/15'
      default: return ''
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
        <div className="w-6 h-6 border-2 border-stone-400 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* Header */}
      <header className="border-b border-stone-200/60 dark:border-stone-800/60 bg-white/50 dark:bg-stone-900/50 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5 text-stone-600 dark:text-stone-400" />
          </button>
          <h1 className="font-serif text-xl font-medium text-stone-800 dark:text-stone-200">크레딧</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-8">
        {/* Balance Card */}
        <div className="bg-gradient-to-br from-stone-800 to-stone-900 dark:from-stone-700 dark:to-stone-800 rounded-2xl p-8 text-white">
          <div className="flex items-center gap-2 mb-2">
            <Coins className="w-5 h-5 text-amber-400" />
            <span className="text-sm text-stone-300">보유 크레딧</span>
          </div>
          <div className="text-4xl font-bold mb-4">{balance.toLocaleString()}</div>
          {!dailyClaimed && (
            <button
              onClick={handleClaimDaily}
              disabled={claimingDaily}
              className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
            >
              <Gift className="w-4 h-4 text-amber-400" />
              {claimingDaily ? '받는 중...' : '오늘의 무료 크레딧 받기 (3개)'}
            </button>
          )}
          {dailyClaimed && (
            <div className="flex items-center gap-2 text-sm text-stone-400">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              오늘의 무료 크레딧을 이미 받았습니다
            </div>
          )}
        </div>

        {/* Credit Packages */}
        <div>
          <h2 className="font-serif text-lg font-medium text-stone-800 dark:text-stone-200 mb-4">크레딧 충전</h2>
          <div className="grid gap-3">
            {PACKAGES.map((pkg) => (
              <button
                key={pkg.key}
                onClick={() => { setSelectedPkg(pkg.key); setSubmitted(false) }}
                className={`relative p-5 rounded-2xl border text-left transition-all duration-300 ${
                  selectedPkg === pkg.key
                    ? 'border-stone-800 dark:border-stone-300 bg-stone-50 dark:bg-stone-800/50'
                    : 'border-stone-200/60 dark:border-stone-700/40 bg-white/50 dark:bg-stone-900/30 hover:border-stone-400 dark:hover:border-stone-600'
                }`}
              >
                {pkg.popular && (
                  <span className="absolute -top-2.5 right-4 px-3 py-0.5 bg-stone-800 dark:bg-stone-200 text-white dark:text-stone-800 text-[10px] font-bold rounded-full tracking-wider">
                    BEST
                  </span>
                )}
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-stone-800 dark:text-stone-200">{pkg.name}</span>
                      <span className="text-sm text-stone-400">{pkg.description}</span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-stone-800 dark:text-stone-200">{pkg.credits}</span>
                      <span className="text-sm text-stone-400">크레딧</span>
                      <span className="text-xs text-stone-400 ml-2">({pkg.perCredit}원/크레딧)</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold text-stone-800 dark:text-stone-200">
                      {formatPrice(pkg.price)}원
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Purchase Form */}
        {selectedPkg && !submitted && (
          <div className="bg-white/50 dark:bg-stone-800/40 rounded-2xl border border-stone-200/60 dark:border-stone-700/40 p-6 space-y-5">
            <h3 className="font-medium text-stone-800 dark:text-stone-200">입금 안내</h3>

            <div className="bg-stone-50 dark:bg-stone-900/50 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-stone-500 dark:text-stone-400">은행</span>
                <span className="font-medium text-stone-800 dark:text-stone-200">{BANK_INFO.bank}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-stone-500 dark:text-stone-400">계좌번호</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-medium text-stone-800 dark:text-stone-200">{BANK_INFO.account}</span>
                  <button onClick={handleCopy} className="p-1.5 hover:bg-stone-200 dark:hover:bg-stone-700 rounded-lg transition-colors">
                    {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-stone-400" />}
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-stone-500 dark:text-stone-400">예금주</span>
                <span className="font-medium text-stone-800 dark:text-stone-200">{BANK_INFO.holder}</span>
              </div>
              <div className="flex items-center justify-between border-t border-stone-200/60 dark:border-stone-700/40 pt-3">
                <span className="text-sm text-stone-500 dark:text-stone-400">입금 금액</span>
                <span className="text-lg font-bold text-stone-800 dark:text-stone-200">
                  {formatPrice(PACKAGES.find(p => p.key === selectedPkg)!.price)}원
                </span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-600 dark:text-stone-400 mb-2">입금자명</label>
              <input
                type="text"
                value={depositorName}
                onChange={(e) => setDepositorName(e.target.value)}
                placeholder="입금자명을 정확히 입력해주세요"
                className="w-full px-4 py-3 border border-stone-200/60 dark:border-stone-700/30 rounded-xl bg-transparent focus:outline-none focus:border-stone-400 dark:focus:border-stone-600 transition-colors text-stone-800 dark:text-stone-200 placeholder:text-stone-300 dark:placeholder:text-stone-500"
              />
            </div>

            <button
              onClick={handleSubmit}
              disabled={!depositorName.trim() || submitting}
              className="w-full py-3 bg-stone-800 dark:bg-stone-200 text-white dark:text-stone-800 rounded-xl font-medium hover:bg-stone-700 dark:hover:bg-stone-300 transition-colors disabled:opacity-50"
            >
              {submitting ? '제출 중...' : '입금 확인 요청'}
            </button>

            <p className="text-xs text-stone-400 text-center">
              입금 후 확인까지 최대 24시간이 소요될 수 있습니다
            </p>
          </div>
        )}

        {/* Success Message */}
        {submitted && (
          <div className="bg-emerald-50 dark:bg-emerald-900/15 rounded-2xl border border-emerald-200/60 dark:border-emerald-800/30 p-6 text-center">
            <CheckCircle className="w-10 h-10 text-emerald-600 dark:text-emerald-400 mx-auto mb-3" />
            <h3 className="font-medium text-emerald-800 dark:text-emerald-200 mb-1">입금 확인 요청 완료</h3>
            <p className="text-sm text-emerald-600 dark:text-emerald-400">확인 후 크레딧이 자동으로 충전됩니다</p>
          </div>
        )}

        {/* Pending Requests */}
        {purchaseRequests.length > 0 && (
          <div>
            <h2 className="font-serif text-lg font-medium text-stone-800 dark:text-stone-200 mb-4">충전 내역</h2>
            <div className="space-y-2">
              {purchaseRequests.map((req) => (
                <div
                  key={req.id}
                  className="flex items-center justify-between p-4 bg-white/50 dark:bg-stone-900/30 rounded-xl border border-stone-200/40 dark:border-stone-700/30"
                >
                  <div>
                    <div className="text-sm font-medium text-stone-700 dark:text-stone-300">
                      {PACKAGES.find(p => p.key === req.package_key)?.name || req.package_key} · {req.amount}크레딧
                    </div>
                    <div className="text-xs text-stone-400">
                      {new Date(req.created_at).toLocaleDateString('ko-KR')} · {req.depositor_name}
                    </div>
                  </div>
                  <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${statusColor(req.status)}`}>
                    {statusLabel(req.status)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Usage Info */}
        <div>
          <h2 className="font-serif text-lg font-medium text-stone-800 dark:text-stone-200 mb-4">크레딧 사용 안내</h2>
          <div className="bg-white/50 dark:bg-stone-900/30 rounded-2xl border border-stone-200/40 dark:border-stone-700/30 p-5">
            <div className="space-y-3 text-sm">
              {[
                { label: 'AI 채팅 (1회)', cost: 1 },
                { label: '문장 제안 / 스타일 분석', cost: 1 },
                { label: '소설 챕터 생성', cost: 3 },
                { label: 'AI 대필', cost: 3 },
                { label: '원고 리뷰 (7개 모듈)', cost: 5 },
                { label: '스토리 자동 기획', cost: 5 },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between">
                  <span className="text-stone-600 dark:text-stone-400">{item.label}</span>
                  <span className="flex items-center gap-1 font-medium text-stone-800 dark:text-stone-200">
                    <Coins className="w-3.5 h-3.5 text-amber-500" />
                    {item.cost}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-stone-200/40 dark:border-stone-700/30">
              <div className="flex items-center gap-2 text-sm text-stone-400">
                <Gift className="w-4 h-4" />
                매일 무료 크레딧 3개 지급
              </div>
            </div>
          </div>
        </div>

        {/* Recent Transactions */}
        {transactions.length > 0 && (
          <div>
            <h2 className="font-serif text-lg font-medium text-stone-800 dark:text-stone-200 mb-4">최근 사용 내역</h2>
            <div className="space-y-1.5">
              {transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between py-3 px-4 bg-white/30 dark:bg-stone-900/20 rounded-xl"
                >
                  <div>
                    <div className="text-sm text-stone-700 dark:text-stone-300">{tx.description}</div>
                    <div className="text-xs text-stone-400">{new Date(tx.created_at).toLocaleString('ko-KR')}</div>
                  </div>
                  <span className={`text-sm font-medium ${tx.amount > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-stone-500 dark:text-stone-400'}`}>
                    {tx.amount > 0 ? '+' : ''}{tx.amount}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
