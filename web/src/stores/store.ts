// @ts-nocheck
'use client'

import { create } from 'zustand'
import { getSupabase } from '@/lib/supabase/client'
import type { Work, Chapter, VaultCharacter, VaultForeshadow, VaultWorld, VaultTimeline, StyleProfile } from '@/lib/supabase/types'

interface Vault {
  characters: VaultCharacter[]
  foreshadows: VaultForeshadow[]
  world: VaultWorld[]
  timeline: VaultTimeline[]
}

interface ReviewResult {
  issues: Array<{
    type: string
    severity: string
    description: string
    location?: string
    suggestion?: string
  }>
  tension_score: number
  cliffhanger_score?: number
  pacing_warning?: string
  popularity_tips?: string[]
  overall_feedback?: string
  vault_updates?: any
}

interface ClicheResult {
  cliches: Array<{ text: string; type: string; description: string; suggestion?: string }>
  by_type: Record<string, number>
}

interface BenchmarkResult {
  overallScore: number
  benchmark: { genre: string; topWorks?: string[]; avgChapterLength?: number; dialogueRatio?: number; avgTension?: number }
  current: { avgChapterLength?: number; dialogueRatio?: number; avgTension?: number }
  scores: Record<string, number>
  recommendations: Array<{ type: string; message: string }>
  error?: string
}

interface ReaderSimulation {
  avgRetention: number
  personas: Array<{ name: string; reaction: string; comment: string; continue_reading: number; likes?: string[]; concerns?: string[]; error?: boolean }>
}

interface StoryPlan {
  id: string
  title: string
  idea_text: string
  status: string
  current_step: number
  analysis: any
  arcs: any
  characters: any
  world: any
  conti: any
  foreshadows: any
  conversation: any
  genre: string
  selected_arc: string
  work_id: string | null
  created_at: string
  updated_at: string
}

interface DailyStats {
  today: number
  weekData: Array<{ date: string; count: number }>
}

export const useStore = create((set, get) => ({
  // Auth
  user: null,
  setUser: (user) => set({ user }),

  // Works
  works: [],
  currentWork: null,

  fetchWorks: async () => {
    const supabase = getSupabase()
    const { data } = await supabase
      .from('works')
      .select('*')
      .order('updated_at', { ascending: false })
    set({ works: data || [] })
  },

  createWork: async (title, genre, stylePreset, workType, dailyGoal) => {
    const supabase = getSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      console.error('createWork: user not found')
      return null
    }

    const { data: work, error } = await supabase
      .from('works')
      .insert({
        user_id: user.id,
        title,
        genre,
        style_preset: stylePreset,
        work_type: workType,
        daily_goal: dailyGoal,
      })
      .select()
      .single()

    if (error) {
      console.error('createWork error:', error)
      return null
    }

    if (work) {
      await supabase.from('chapters').insert({
        work_id: work.id,
        number: 1,
        title: workType === 'webtoon' ? '1화' : '제1화',
      })
      await get().fetchWorks()
    }
    return work
  },

  selectWork: async (work) => {
    set({ currentWork: work, currentChapter: null, reviewResult: null })
    await get().fetchChapters(work.id)
    await get().fetchVault(work.id)
  },

  deleteWork: async (id) => {
    const supabase = getSupabase()
    await supabase.from('works').delete().eq('id', id)
    set({ currentWork: null, currentChapter: null, chapters: [] })
    await get().fetchWorks()
  },

  updateVaultMode: async (mode) => {
    const work = get().currentWork
    if (!work) return
    const supabase = getSupabase()
    await supabase.from('works').update({ vault_mode: mode }).eq('id', work.id)
    set({ currentWork: { ...work, vault_mode: mode } })
  },

  // Chapters
  chapters: [],
  currentChapter: null,
  isSaving: false,

  fetchChapters: async (workId) => {
    const supabase = getSupabase()
    const { data } = await supabase
      .from('chapters')
      .select('*')
      .eq('work_id', workId)
      .order('number')
    set({ chapters: data || [] })
    if (data && data.length > 0 && !get().currentChapter) {
      await get().selectChapter(data[data.length - 1].id)
    }
  },

  selectChapter: async (chapterId) => {
    const supabase = getSupabase()
    const { data } = await supabase
      .from('chapters')
      .select('*')
      .eq('id', chapterId)
      .single()
    set({ currentChapter: data, reviewResult: null })
  },

  createChapter: async () => {
    const { currentWork: work, chapters } = get()
    if (!work) return
    const supabase = getSupabase()
    const num = chapters.length + 1
    const { data } = await supabase
      .from('chapters')
      .insert({
        work_id: work.id,
        number: num,
        title: work.work_type === 'webtoon' ? `${num}화` : `제${num}화`,
      })
      .select()
      .single()
    if (data) {
      await get().fetchChapters(work.id)
      set({ currentChapter: data })
    }
  },

  saveChapter: async (content, title) => {
    const chapter = get().currentChapter
    if (!chapter) return
    set({ isSaving: true })

    const supabase = getSupabase()
    await supabase
      .from('chapters')
      .update({
        content,
        title: title || chapter.title,
      })
      .eq('id', chapter.id)

    // Update daily stats
    const plain = (content || '').replace(/<[^>]*>/g, '').replace(/\s+/g, '').length
    const today = new Date().toISOString().split('T')[0]
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase.from('daily_stats').upsert(
        { user_id: user.id, date: today, word_count: plain },
        { onConflict: 'user_id,date' }
      ).select()
    }

    set({
      isSaving: false,
      currentChapter: { ...chapter, content, title: title || chapter.title },
    })
  },

  // Vault
  vault: { characters: [], foreshadows: [], world: [], timeline: [] },

  fetchVault: async (workId) => {
    const supabase = getSupabase()
    const [chars, foreshadows, world, timeline] = await Promise.all([
      supabase.from('vault_characters').select('*').eq('work_id', workId),
      supabase.from('vault_foreshadows').select('*').eq('work_id', workId),
      supabase.from('vault_world').select('*').eq('work_id', workId),
      supabase.from('vault_timeline').select('*').eq('work_id', workId).order('chapter'),
    ])
    set({
      vault: {
        characters: chars.data || [],
        foreshadows: foreshadows.data || [],
        world: world.data || [],
        timeline: timeline.data || [],
      },
    })
  },

  addCharacter: async (data) => {
    const work = get().currentWork
    if (!work) return
    const supabase = getSupabase()
    await supabase.from('vault_characters').insert({ work_id: work.id, ...data })
    await get().fetchVault(work.id)
  },

  updateCharacter: async (id, data) => {
    const supabase = getSupabase()
    await supabase.from('vault_characters').update(data).eq('id', id)
    const work = get().currentWork
    if (work) await get().fetchVault(work.id)
  },

  deleteCharacter: async (id) => {
    const supabase = getSupabase()
    await supabase.from('vault_characters').delete().eq('id', id)
    const work = get().currentWork
    if (work) await get().fetchVault(work.id)
  },

  addForeshadow: async (data) => {
    const work = get().currentWork
    if (!work) return
    const supabase = getSupabase()
    await supabase.from('vault_foreshadows').insert({ work_id: work.id, ...data })
    await get().fetchVault(work.id)
  },

  updateForeshadow: async (id, data) => {
    const supabase = getSupabase()
    await supabase.from('vault_foreshadows').update(data).eq('id', id)
    const work = get().currentWork
    if (work) await get().fetchVault(work.id)
  },

  // AI Features
  isReviewing: false,
  reviewResult: null,

  runReview: async () => {
    const { currentWork: work, currentChapter: chapter } = get()
    if (!work || !chapter) return
    set({ isReviewing: true, rightPanel: 'review' })

    try {
      const res = await fetch('/api/ai/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workId: work.id, chapterId: chapter.id }),
      })
      const data = await res.json()
      set({ reviewResult: data, isReviewing: false })
      await get().fetchVault(work.id)
    } catch {
      set({ isReviewing: false, reviewResult: { issues: [], tension_score: 0, overall_feedback: '오류 발생' } })
    }
  },

  // Feedback (accept/reject)
  acceptIssue: async (issue) => {
    const work = get().currentWork
    if (!work) return
    try {
      await fetch('/api/ai/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workId: work.id, issueType: issue.type, description: issue.description, action: 'accept' }),
      })
    } catch {}
  },

  rejectIssue: async (issueType, description) => {
    const work = get().currentWork
    if (!work) return
    try {
      await fetch('/api/ai/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workId: work.id, issueType, description, action: 'reject' }),
      })
    } catch {}
  },

  isSuggesting: false,
  suggestions: null,

  suggestStory: async (direction) => {
    const { currentWork: work, currentChapter: chapter } = get()
    if (!work || !chapter) return
    set({ isSuggesting: true, rightPanel: 'suggest' })

    try {
      const res = await fetch('/api/ai/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workId: work.id, chapterId: chapter.id, idea: direction }),
      })
      const data = await res.json()
      set({ suggestions: data, isSuggesting: false })
    } catch {
      set({ isSuggesting: false })
    }
  },

  isGhostwriting: false,
  ghostwriteResult: null,

  ghostwrite: async (idea) => {
    const { currentWork: work, currentChapter: chapter } = get()
    if (!work || !chapter) return
    set({ isGhostwriting: true, rightPanel: 'ghostwrite' })

    try {
      const res = await fetch('/api/ai/ghostwrite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workId: work.id,
          chapterId: chapter.id,
          idea,
          targetWords: work.target_word_count,
        }),
      })
      const data = await res.json()
      set({ ghostwriteResult: data, isGhostwriting: false })
    } catch {
      set({ isGhostwriting: false })
    }
  },

  // Extract
  isExtracting: false,

  runExtract: async () => {
    const { currentWork: work, currentChapter: chapter } = get()
    if (!work || !chapter) return
    set({ isExtracting: true })

    try {
      await fetch('/api/ai/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workId: work.id, chapterId: chapter.id }),
      })
      await get().fetchVault(work.id)
      set({ isExtracting: false })
    } catch {
      set({ isExtracting: false })
    }
  },

  // Style
  styleProfile: null,
  isLearningStyle: false,

  learnStyle: async () => {
    const work = get().currentWork
    if (!work) return
    set({ isLearningStyle: true })

    try {
      const res = await fetch('/api/ai/learn-style', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workId: work.id }),
      })
      const data = await res.json()
      set({ styleProfile: data.profile, isLearningStyle: false })
    } catch {
      set({ isLearningStyle: false })
    }
  },

  fetchStyleProfile: async (workId) => {
    const supabase = getSupabase()
    const { data } = await supabase
      .from('style_profiles')
      .select('*')
      .eq('work_id', workId)
      .single()
    set({ styleProfile: data })
  },

  // Tension History
  tensionHistory: [],

  fetchTensionHistory: async (workId) => {
    const supabase = getSupabase()
    const { data } = await supabase
      .from('review_history')
      .select('chapter_id, tension_score, chapters!inner(number)')
      .eq('work_id', workId)
      .gt('tension_score', 0)
      .order('chapters(number)')

    const history = (data || []).map((r) => ({
      number: r.chapters.number,
      tension_score: r.tension_score,
    }))
    set({ tensionHistory: history })
  },

  // Daily Stats
  dailyStats: { today: 0, weekData: [] },

  fetchDailyStats: async () => {
    const supabase = getSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const today = new Date().toISOString().split('T')[0]
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    const { data } = await supabase
      .from('daily_stats')
      .select('date, word_count')
      .eq('user_id', user.id)
      .gte('date', weekAgo)
      .order('date')

    const todayData = data?.find(d => d.date === today)
    set({
      dailyStats: {
        today: todayData?.word_count || 0,
        weekData: (data || []).map(d => ({ date: d.date, count: d.word_count })),
      },
    })
  },

  // Cliche Detection (Phase 2)
  clicheResult: null,
  isDetectingCliches: false,

  detectCliches: async (useAI = false) => {
    const chapter = get().currentChapter
    const work = get().currentWork
    if (!chapter || !work) return
    set({ isDetectingCliches: true })

    try {
      const res = await fetch('/api/ai/detect-cliches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workId: work.id, chapterId: chapter.id, useAI }),
      })
      const data = await res.json()
      set({ clicheResult: data, isDetectingCliches: false })
    } catch {
      set({ isDetectingCliches: false })
    }
  },

  // Benchmark (Phase 2)
  benchmarkResult: null,
  isBenchmarking: false,

  runBenchmark: async () => {
    const work = get().currentWork
    if (!work) return
    set({ isBenchmarking: true })

    try {
      const res = await fetch('/api/ai/benchmark', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workId: work.id }),
      })
      const data = await res.json()
      set({ benchmarkResult: data, isBenchmarking: false })
    } catch {
      set({ isBenchmarking: false })
    }
  },

  // Reader Simulation (Phase 2)
  readerSimulation: null,
  isSimulatingReaders: false,

  simulateReaders: async (personas) => {
    const { currentWork: work, currentChapter: chapter } = get()
    if (!work || !chapter) return
    set({ isSimulatingReaders: true })

    try {
      const res = await fetch('/api/ai/simulate-readers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workId: work.id, chapterId: chapter.id, personas }),
      })
      const data = await res.json()
      set({ readerSimulation: data, isSimulatingReaders: false })
    } catch {
      set({ isSimulatingReaders: false })
    }
  },

  // Story Plans (Phase 5)
  storyPlans: [],
  currentPlan: null,

  fetchPlans: async () => {
    const res = await fetch('/api/planner')
    const data = await res.json()
    set({ storyPlans: data.plans || [] })
  },

  // Versions (Phase 3)
  versions: [],

  fetchVersions: async (chapterId) => {
    const res = await fetch(`/api/chapters/versions?chapterId=${chapterId}`)
    const data = await res.json()
    set({ versions: data.versions || [] })
  },

  // UI State
  rightPanel: 'vault',
  darkMode: false,
  toggleDark: () => {
    const next = !get().darkMode
    if (typeof window !== 'undefined') {
      localStorage.setItem('sm_dark', String(next))
      document.documentElement.classList.toggle('dark', next)
    }
    set({ darkMode: next })
  },

  // ===== StoryLife =====
  lifeProfile: null,
  lifeStories: [],
  lifeFeed: [],
  lifeFeedPage: 1,
  lifeFeedHasMore: true,
  lifeCurrentStory: null,
  lifeCurrentChapter: null,
  lifeConversation: [],
  lifeNotifications: [],
  lifeUnreadCount: 0,
  lifeReadRequests: [],
  lifeStreak: null,
  lifeBadges: [],

  fetchLifeProfile: async () => {
    try {
      const res = await fetch('/api/life/profile')
      const data = await res.json()
      set({ lifeProfile: data.profile || null })
    } catch {
      set({ lifeProfile: null })
    }
  },

  updateLifeProfile: async (profile) => {
    try {
      const res = await fetch('/api/life/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      })
      const data = await res.json()
      set({ lifeProfile: data.profile })
    } catch {}
  },

  fetchLifeStories: async () => {
    try {
      const res = await fetch('/api/life/stories')
      const data = await res.json()
      set({ lifeStories: data.stories || [] })
    } catch {
      set({ lifeStories: [] })
    }
  },

  createLifeStory: async (title, genre, description, recallConfig?) => {
    try {
      const body: Record<string, unknown> = { title, genre, description }
      if (recallConfig) {
        body.recall_mode = 'recall'
        body.birth_year = recallConfig.birth_year
        body.birth_place = recallConfig.birth_place
        body.world_setting = recallConfig.world_setting
        body.world_detail = recallConfig.world_detail
        body.novel_style = recallConfig.novel_style
        body.protagonist_name = recallConfig.protagonist_name
        body.tone = recallConfig.tone
      }
      const res = await fetch('/api/life/stories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (data.story) {
        await get().fetchLifeStories()
        return data.story
      }
      return null
    } catch {
      return null
    }
  },

  deleteLifeStory: async (storyId) => {
    try {
      await fetch(`/api/life/stories/${storyId}`, { method: 'DELETE' })
      await get().fetchLifeStories()
    } catch {}
  },

  fetchLifeFeed: async (page = 1) => {
    try {
      const res = await fetch(`/api/life/feed?page=${page}`)
      const data = await res.json()
      if (page === 1) {
        set({ lifeFeed: data.feed || [], lifeFeedPage: 1, lifeFeedHasMore: data.hasMore })
      } else {
        set((state) => ({
          lifeFeed: [...state.lifeFeed, ...(data.feed || [])],
          lifeFeedPage: page,
          lifeFeedHasMore: data.hasMore,
        }))
      }
    } catch {}
  },

  setLifeCurrentStory: (story) => set({ lifeCurrentStory: story }),
  setLifeCurrentChapter: (chapter) => set({ lifeCurrentChapter: chapter }),
  setLifeConversation: (conv) => set({ lifeConversation: conv }),

  fetchLifeNotifications: async () => {
    try {
      const res = await fetch('/api/life/notifications')
      const data = await res.json()
      const notifs = data.notifications || []
      set({
        lifeNotifications: notifs,
        lifeUnreadCount: notifs.filter((n) => !n.is_read).length,
      })
    } catch {}
  },

  // Read Requests
  requestRead: async (storyId) => {
    try {
      const res = await fetch('/api/life/read-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ story_id: storyId }),
      })
      const data = await res.json()
      return !!data.request
    } catch {
      return false
    }
  },

  fetchLifeReadRequests: async (status = 'pending') => {
    try {
      const res = await fetch(`/api/life/read-request?status=${status}`)
      const data = await res.json()
      set({ lifeReadRequests: data.requests || [] })
    } catch {
      set({ lifeReadRequests: [] })
    }
  },

  handleReadRequest: async (requestId, status) => {
    try {
      const res = await fetch('/api/life/read-request', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ request_id: requestId, status }),
      })
      const data = await res.json()
      if (data.request) {
        // Remove from list
        set((state) => ({
          lifeReadRequests: state.lifeReadRequests.filter(r => r.id !== requestId),
        }))
        return true
      }
      return false
    } catch {
      return false
    }
  },

  // ===== Streaks & Badges =====
  fetchLifeStreak: async () => {
    try {
      const res = await fetch('/api/life/streaks')
      const data = await res.json()
      set({ lifeStreak: data.streak || null })
    } catch {
      set({ lifeStreak: null })
    }
  },

  fetchLifeBadges: async (userId?) => {
    try {
      const url = userId ? `/api/life/badges?userId=${userId}` : '/api/life/badges'
      const res = await fetch(url)
      const data = await res.json()
      set({ lifeBadges: data.badges || [] })
    } catch {
      set({ lifeBadges: [] })
    }
  },

  // ===== Editor Mode =====
  editorCollaborations: [],
  editorUnread: { unreadMessages: 0, unreadComments: 0, total: 0 },

  fetchEditorCollaborations: async () => {
    try {
      const res = await fetch('/api/editor/collaborators?role=editor')
      const data = await res.json()
      set({ editorCollaborations: data.collaborations || [] })
    } catch {
      set({ editorCollaborations: [] })
    }
  },

  fetchEditorUnread: async () => {
    try {
      const res = await fetch('/api/editor/unread')
      const data = await res.json()
      set({ editorUnread: data })
    } catch {}
  },

  markNotificationsRead: async () => {
    try {
      await fetch('/api/life/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAllRead: true }),
      })
      set((state) => ({
        lifeNotifications: state.lifeNotifications.map((n) => ({ ...n, is_read: true })),
        lifeUnreadCount: 0,
      }))
    } catch {}
  },
}))
