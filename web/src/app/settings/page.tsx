// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabase } from '@/lib/supabase/client'
import { useStore } from '@/stores/store'
import {
  ArrowLeft, Copy, Check, Download, Trash2, LogOut,
  Sun, Moon, Award, Users, Type, Save, Eye, EyeOff
} from 'lucide-react'

export default function SettingsPage() {
  const router = useRouter()
  const { works, fetchWorks, darkMode, toggleDark } = useStore()

  const [loading, setLoading] = useState(true)
  const [userEmail, setUserEmail] = useState('')

  // Profile
  const [nickname, setNickname] = useState('')
  const [nicknameSaved, setNicknameSaved] = useState(false)

  // Appearance
  const [fontFamily, setFontFamily] = useState('기본')
  const [fontSize, setFontSize] = useState(16)

  // Referral
  const [myReferralCode, setMyReferralCode] = useState('')
  const [totalReferred, setTotalReferred] = useState(0)
  const [referrals, setReferrals] = useState([])
  const [referralInput, setReferralInput] = useState('')
  const [referralCopied, setReferralCopied] = useState(false)
  const [referralSubmitting, setReferralSubmitting] = useState(false)
  const [referralMessage, setReferralMessage] = useState('')

  // Badges
  const [badges, setBadges] = useState([])

  // Password
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [passwordMessage, setPasswordMessage] = useState('')
  const [passwordChanging, setPasswordChanging] = useState(false)

  // Delete account
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [deleting, setDeleting] = useState(false)

  // Auth guard & init
  useEffect(() => {
    const init = async () => {
      const supabase = getSupabase()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/')
        return
      }
      setUserEmail(session.user.email || '')

      // Load localStorage settings
      setNickname(localStorage.getItem('sm_nickname') || '')
      setFontFamily(localStorage.getItem('sm_font_family') || '기본')
      setFontSize(Number(localStorage.getItem('sm_font_size')) || 16)

      // Sync dark mode
      const savedDark = localStorage.getItem('sm_dark') === 'true'
      if (savedDark !== darkMode) {
        toggleDark()
      }

      // Fetch referral info
      try {
        const res = await fetch('/api/referral')
        if (res.ok) {
          const data = await res.json()
          setMyReferralCode(data.code || '')
          setTotalReferred(data.totalReferred || 0)
          setReferrals(data.referrals || [])
        }
      } catch {}

      // Fetch badges
      try {
        const res = await fetch('/api/badges')
        if (res.ok) {
          const data = await res.json()
          setBadges(data.badges || [])
        }
      } catch {}

      // Fetch works for export
      await fetchWorks()

      setLoading(false)
    }
    init()
  }, [router, darkMode, toggleDark, fetchWorks])

  // Save nickname
  const handleSaveNickname = () => {
    localStorage.setItem('sm_nickname', nickname)
    setNicknameSaved(true)
    setTimeout(() => setNicknameSaved(false), 2000)
  }

  // Appearance handlers
  const handleFontFamilyChange = (value: string) => {
    setFontFamily(value)
    localStorage.setItem('sm_font_family', value)
  }

  const handleFontSizeChange = (value: number) => {
    setFontSize(value)
    localStorage.setItem('sm_font_size', String(value))
  }

  const handleToggleDark = () => {
    toggleDark()
  }

  // Referral
  const handleCopyReferral = async () => {
    try {
      await navigator.clipboard.writeText(myReferralCode)
      setReferralCopied(true)
      setTimeout(() => setReferralCopied(false), 2000)
    } catch {}
  }

  const handleSubmitReferral = async () => {
    if (!referralInput.trim()) return
    setReferralSubmitting(true)
    setReferralMessage('')
    try {
      const res = await fetch('/api/referral', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: referralInput.trim() }),
      })
      const data = await res.json()
      if (res.ok) {
        setReferralMessage('추천인 등록이 완료되었습니다!')
        setReferralInput('')
      } else {
        setReferralMessage(data.error || '추천인 등록에 실패했습니다.')
      }
    } catch {
      setReferralMessage('오류가 발생했습니다.')
    } finally {
      setReferralSubmitting(false)
    }
  }

  // Export
  const handleExport = async () => {
    const exportData = {
      exportedAt: new Date().toISOString(),
      works: works,
    }
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `storymind-export-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // Change password
  const handleChangePassword = async () => {
    setPasswordMessage('')
    if (!newPassword) {
      setPasswordMessage('새 비밀번호를 입력해주세요.')
      return
    }
    if (newPassword.length < 6) {
      setPasswordMessage('비밀번호는 6자 이상이어야 합니다.')
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordMessage('새 비밀번호가 일치하지 않습니다.')
      return
    }
    setPasswordChanging(true)
    try {
      const supabase = getSupabase()
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) {
        setPasswordMessage(error.message || '비밀번호 변경에 실패했습니다.')
      } else {
        setPasswordMessage('비밀번호가 변경되었습니다.')
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
      }
    } catch {
      setPasswordMessage('오류가 발생했습니다.')
    } finally {
      setPasswordChanging(false)
    }
  }

  // Delete account
  const handleDeleteAccount = async () => {
    if (deleteConfirm !== '계정 삭제') return
    setDeleting(true)
    try {
      const supabase = getSupabase()
      await supabase.rpc('delete_user')
      await supabase.auth.signOut()
      router.push('/')
    } catch {
      alert('계정 삭제에 실패했습니다.')
      setDeleting(false)
    }
  }

  // Logout
  const handleLogout = async () => {
    const supabase = getSupabase()
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
        <div className="w-6 h-6 border-2 border-stone-400 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const fontFamilies = ['기본', 'Noto Sans KR', 'Noto Serif KR', 'Pretendard', 'D2Coding']
  const fontSizes = [14, 16, 18, 20, 22]

  return (
    <div className="min-h-screen bg-[var(--background)] text-stone-900 dark:text-stone-100">
      {/* Header */}
      <header className="bg-white/80 dark:bg-stone-900/80 backdrop-blur-md border-b border-stone-200/60 dark:border-stone-800/60 sticky top-0 z-40">
        <div className="max-w-2xl mx-auto px-4 h-16 flex items-center gap-3">
          <button
            onClick={() => router.push('/dashboard')}
            className="p-2 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-serif text-lg font-medium text-stone-800 dark:text-stone-200">설정</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">

        {/* 1. Profile */}
        <section className="bg-white/60 dark:bg-stone-900/40 rounded-2xl border border-stone-200/60 dark:border-stone-800/40 p-6">
          <h2 className="font-serif text-lg font-medium mb-4 flex items-center gap-2">
            <Users className="w-5 h-5" />
            프로필
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-stone-600 dark:text-stone-400 mb-1.5">
                이메일
              </label>
              <input
                type="text"
                value={userEmail}
                readOnly
                className="w-full px-4 py-3 border border-stone-200 dark:border-stone-700 rounded-xl bg-stone-50 dark:bg-stone-800 text-stone-500 dark:text-stone-400 cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-600 dark:text-stone-400 mb-1.5">
                닉네임
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="닉네임을 입력하세요"
                  className="flex-1 px-4 py-3 border border-stone-200 dark:border-stone-700 rounded-xl bg-transparent focus:outline-none focus:border-stone-500 dark:focus:border-stone-500"
                />
                <button
                  onClick={handleSaveNickname}
                  className="flex items-center gap-1.5 px-4 py-3 border border-stone-800 dark:border-stone-300 text-stone-800 dark:text-stone-300 rounded-xl font-medium hover:bg-stone-800 hover:text-white dark:hover:bg-stone-300 dark:hover:text-stone-900 transition-all duration-300"
                >
                  {nicknameSaved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                  {nicknameSaved ? '저장됨' : '저장'}
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* 2. Appearance */}
        <section className="bg-white/60 dark:bg-stone-900/40 rounded-2xl border border-stone-200/60 dark:border-stone-800/40 p-6">
          <h2 className="font-serif text-lg font-medium mb-4 flex items-center gap-2">
            <Type className="w-5 h-5" />
            외관
          </h2>
          <div className="space-y-4">
            {/* Font family */}
            <div>
              <label className="block text-sm font-medium text-stone-600 dark:text-stone-400 mb-1.5">
                글꼴
              </label>
              <select
                value={fontFamily}
                onChange={(e) => handleFontFamilyChange(e.target.value)}
                className="w-full px-4 py-3 border border-stone-200 dark:border-stone-700 rounded-xl bg-transparent focus:outline-none focus:border-stone-500 dark:focus:border-stone-500"
              >
                {fontFamilies.map((f) => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </div>

            {/* Font size */}
            <div>
              <label className="block text-sm font-medium text-stone-600 dark:text-stone-400 mb-1.5">
                글자 크기
              </label>
              <div className="flex gap-2">
                {fontSizes.map((size) => (
                  <button
                    key={size}
                    onClick={() => handleFontSizeChange(size)}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition ${
                      fontSize === size
                        ? 'border-stone-800 dark:border-stone-300 bg-stone-800 dark:bg-stone-300 text-white dark:text-stone-900'
                        : 'border-stone-200 dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-800'
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            {/* Dark mode */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-stone-600 dark:text-stone-400">
                다크 모드
              </span>
              <button
                onClick={handleToggleDark}
                className={`relative w-14 h-8 rounded-full transition-colors ${
                  darkMode ? 'bg-stone-700' : 'bg-stone-300'
                }`}
              >
                <div
                  className={`absolute top-1 w-6 h-6 bg-white dark:bg-stone-200 rounded-full shadow transition-transform flex items-center justify-center ${
                    darkMode ? 'translate-x-7' : 'translate-x-1'
                  }`}
                >
                  {darkMode ? (
                    <Moon className="w-3.5 h-3.5 text-stone-700" />
                  ) : (
                    <Sun className="w-3.5 h-3.5 text-yellow-500" />
                  )}
                </div>
              </button>
            </div>
          </div>
        </section>

        {/* 3. Referral */}
        <section className="bg-white/60 dark:bg-stone-900/40 rounded-2xl border border-stone-200/60 dark:border-stone-800/40 p-6">
          <h2 className="font-serif text-lg font-medium mb-4 flex items-center gap-2">
            <Users className="w-5 h-5" />
            추천인
          </h2>
          <div className="space-y-4">
            {/* My referral code */}
            {myReferralCode && (
              <div>
                <label className="block text-sm font-medium text-stone-600 dark:text-stone-400 mb-1.5">
                  내 추천 코드
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={myReferralCode}
                    readOnly
                    className="flex-1 px-4 py-3 border border-stone-200 dark:border-stone-700 rounded-xl bg-stone-50 dark:bg-stone-800 text-stone-700 dark:text-stone-300 font-mono"
                  />
                  <button
                    onClick={handleCopyReferral}
                    className="flex items-center gap-1.5 px-4 py-3 border border-stone-200 dark:border-stone-700 rounded-xl hover:bg-stone-100 dark:hover:bg-stone-800 transition"
                  >
                    {referralCopied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                    {referralCopied ? '복사됨' : '복사'}
                  </button>
                </div>
                <p className="text-sm text-stone-500 mt-2">
                  추천한 사람: <span className="font-semibold">{totalReferred}명</span>
                </p>
              </div>
            )}

            {/* Enter referral code */}
            <div>
              <label className="block text-sm font-medium text-stone-600 dark:text-stone-400 mb-1.5">
                추천인 코드 입력
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={referralInput}
                  onChange={(e) => setReferralInput(e.target.value)}
                  placeholder="추천인 코드를 입력하세요"
                  className="flex-1 px-4 py-3 border border-stone-200 dark:border-stone-700 rounded-xl bg-transparent focus:outline-none focus:border-stone-500 dark:focus:border-stone-500"
                />
                <button
                  onClick={handleSubmitReferral}
                  disabled={referralSubmitting || !referralInput.trim()}
                  className="px-4 py-3 border border-stone-800 dark:border-stone-300 text-stone-800 dark:text-stone-300 rounded-xl font-medium hover:bg-stone-800 hover:text-white dark:hover:bg-stone-300 dark:hover:text-stone-900 transition-all duration-300 disabled:opacity-50"
                >
                  {referralSubmitting ? '등록 중...' : '등록'}
                </button>
              </div>
              {referralMessage && (
                <p className={`text-sm mt-2 ${referralMessage.includes('완료') ? 'text-green-600 dark:text-green-400' : 'text-red-500'}`}>
                  {referralMessage}
                </p>
              )}
            </div>
          </div>
        </section>

        {/* 4. Badges */}
        <section className="bg-white/60 dark:bg-stone-900/40 rounded-2xl border border-stone-200/60 dark:border-stone-800/40 p-6">
          <h2 className="font-serif text-lg font-medium mb-4 flex items-center gap-2">
            <Award className="w-5 h-5" />
            뱃지 갤러리
          </h2>
          {badges.length === 0 ? (
            <p className="text-sm text-stone-400 text-center py-6">아직 뱃지가 없습니다</p>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {badges.map((badge, idx) => (
                <div
                  key={idx}
                  className={`flex flex-col items-center p-3 rounded-xl border transition ${
                    badge.earned
                      ? 'border-stone-300 dark:border-stone-600 bg-stone-50 dark:bg-stone-800'
                      : 'border-stone-100 dark:border-stone-800 opacity-40 grayscale'
                  }`}
                  title={badge.description}
                >
                  <span className="text-2xl mb-1">{badge.icon}</span>
                  <span className="text-xs font-medium text-center leading-tight">{badge.name}</span>
                  {badge.earned && badge.earnedAt && (
                    <span className="text-[10px] text-stone-400 mt-1">
                      {new Date(badge.earnedAt).toLocaleDateString('ko-KR')}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* 5. Data Export */}
        <section className="bg-white/60 dark:bg-stone-900/40 rounded-2xl border border-stone-200/60 dark:border-stone-800/40 p-6">
          <h2 className="font-serif text-lg font-medium mb-4 flex items-center gap-2">
            <Download className="w-5 h-5" />
            데이터 내보내기
          </h2>
          <p className="text-sm text-stone-500 dark:text-stone-400 mb-4">
            모든 작품 데이터를 JSON 파일로 내보냅니다.
          </p>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-5 py-3 border border-stone-800 dark:border-stone-300 text-stone-800 dark:text-stone-300 rounded-xl font-medium hover:bg-stone-800 hover:text-white dark:hover:bg-stone-300 dark:hover:text-stone-900 transition-all duration-300"
          >
            <Download className="w-4 h-4" />
            전체 작품 내보내기
          </button>
        </section>

        {/* 6. Account */}
        <section className="bg-white/60 dark:bg-stone-900/40 rounded-2xl border border-stone-200/60 dark:border-stone-800/40 p-6">
          <h2 className="font-serif text-lg font-medium mb-4 text-stone-800 dark:text-stone-200">계정</h2>
          <div className="space-y-6">

            {/* Change password */}
            <div>
              <h3 className="text-sm font-medium text-stone-700 dark:text-stone-300 mb-3">
                비밀번호 변경
              </h3>
              <div className="space-y-3">
                <div className="relative">
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="현재 비밀번호"
                    className="w-full px-4 py-3 pr-12 border border-stone-200 dark:border-stone-700 rounded-xl bg-transparent focus:outline-none focus:border-stone-500 dark:focus:border-stone-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-stone-400 hover:text-stone-600"
                  >
                    {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="새 비밀번호"
                    className="w-full px-4 py-3 pr-12 border border-stone-200 dark:border-stone-700 rounded-xl bg-transparent focus:outline-none focus:border-stone-500 dark:focus:border-stone-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-stone-400 hover:text-stone-600"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="새 비밀번호 확인"
                    className="w-full px-4 py-3 pr-12 border border-stone-200 dark:border-stone-700 rounded-xl bg-transparent focus:outline-none focus:border-stone-500 dark:focus:border-stone-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-stone-400 hover:text-stone-600"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {passwordMessage && (
                  <p className={`text-sm ${passwordMessage.includes('변경되었습니다') ? 'text-green-600 dark:text-green-400' : 'text-red-500'}`}>
                    {passwordMessage}
                  </p>
                )}
                <button
                  onClick={handleChangePassword}
                  disabled={passwordChanging}
                  className="px-5 py-3 border border-stone-800 dark:border-stone-300 text-stone-800 dark:text-stone-300 rounded-xl font-medium hover:bg-stone-800 hover:text-white dark:hover:bg-stone-300 dark:hover:text-stone-900 transition-all duration-300 disabled:opacity-50"
                >
                  {passwordChanging ? '변경 중...' : '비밀번호 변경'}
                </button>
              </div>
            </div>

            {/* Divider */}
            <div className="divider-subtle" />

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-5 py-3 border border-stone-200 dark:border-stone-700 rounded-xl font-medium hover:bg-stone-50 dark:hover:bg-stone-800 transition-all duration-300"
            >
              <LogOut className="w-4 h-4" />
              로그아웃
            </button>

            {/* Divider */}
            <div className="divider-subtle" />

            {/* Delete account */}
            <div className="p-4 border border-red-200 dark:border-red-900/50 rounded-xl bg-red-50 dark:bg-red-950/30">
              <h3 className="text-sm font-medium text-red-600 dark:text-red-400 mb-2">
                계정 삭제
              </h3>
              <p className="text-sm text-red-500 dark:text-red-400/80 mb-3">
                계정을 삭제하면 모든 작품과 데이터가 영구적으로 삭제됩니다. 이 작업은 되돌릴 수 없습니다.
              </p>
              <div className="space-y-3">
                <input
                  type="text"
                  value={deleteConfirm}
                  onChange={(e) => setDeleteConfirm(e.target.value)}
                  placeholder='확인하려면 "계정 삭제"를 입력하세요'
                  className="w-full px-4 py-3 border border-red-200 dark:border-red-900/50 rounded-xl bg-transparent text-red-600 dark:text-red-400 placeholder:text-red-300 dark:placeholder:text-red-800 focus:outline-none focus:ring-2 focus:ring-red-500"
                />
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleteConfirm !== '계정 삭제' || deleting}
                  className="flex items-center gap-2 px-5 py-3 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Trash2 className="w-4 h-4" />
                  {deleting ? '삭제 중...' : '계정 영구 삭제'}
                </button>
              </div>
            </div>
          </div>
        </section>

      </main>
    </div>
  )
}
