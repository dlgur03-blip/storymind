// @ts-nocheck
'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { getSupabase } from '@/lib/supabase/client'
import { useStore } from '@/stores/store'
import LifeHeader from '@/components/life/LifeHeader'
import StoryCard from '@/components/life/StoryCard'
import SearchBar from '@/components/life/SearchBar'
import GenreFilterChips from '@/components/life/GenreFilterChips'
import FeedTabs from '@/components/life/FeedTabs'
import AuthorCard from '@/components/life/AuthorCard'
import { Loader2, TrendingUp, Users, Hash, Sparkles } from 'lucide-react'

export default function ExplorePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
        <div className="w-6 h-6 border-2 border-rose-700 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <ExploreContent />
    </Suspense>
  )
}

function ExploreContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const {
    exploreStories, exploreAuthors, exploreRecommended, exploreTags,
    fetchExplore, searchLife, searchResults, isSearching,
    setUser, darkMode, toggleDark, requestRead,
  } = useStore()

  const [loading, setLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('trending')
  const [selectedGenre, setSelectedGenre] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [tagFilter, setTagFilter] = useState(searchParams.get('tag') || '')
  const [tagStories, setTagStories] = useState<any[]>([])

  useEffect(() => {
    const init = async () => {
      const supabase = getSupabase()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/')
        return
      }
      setUser({ id: session.user.id, email: session.user.email || '' })
      setCurrentUserId(session.user.id)

      const savedDark = localStorage.getItem('sm_dark') === 'true'
      if (savedDark !== darkMode) toggleDark()

      // Fetch all sections in parallel
      await Promise.all([
        fetchExplore('trending'),
        fetchExplore('popular_authors'),
        fetchExplore('recommended'),
        fetchExplore('popular_tags'),
      ])

      // If tag query param exists, fetch tag stories
      const tag = searchParams.get('tag')
      if (tag) {
        setTagFilter(tag)
        const res = await fetch(`/api/life/tags?tag=${encodeURIComponent(tag)}`)
        const data = await res.json()
        setTagStories(data.stories || [])
      }

      setLoading(false)
    }
    init()
  }, [router])

  // Refetch trending when genre changes
  useEffect(() => {
    if (!loading && activeTab === 'trending') {
      fetchExplore('trending', selectedGenre)
    }
  }, [selectedGenre])

  const handleSearch = (q: string) => {
    setSearchQuery(q)
    if (q.trim()) {
      searchLife(q)
    }
  }

  const handleTagClick = async (tag: string) => {
    setTagFilter(tag)
    setSearchQuery('')
    const res = await fetch(`/api/life/tags?tag=${encodeURIComponent(tag)}`)
    const data = await res.json()
    setTagStories(data.stories || [])
  }

  const clearTagFilter = () => {
    setTagFilter('')
    setTagStories([])
  }

  const handleRequestRead = async (storyId: string) => {
    return await requestRead(storyId)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
        <div className="w-6 h-6 border-2 border-rose-700 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const isSearchActive = searchQuery.trim().length > 0

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <LifeHeader />

      <main className="max-w-5xl mx-auto px-4 py-8">
        <h1 className="font-serif text-2xl font-medium text-stone-800 dark:text-stone-200 mb-6">탐색</h1>

        {/* Search */}
        <div className="mb-6">
          <SearchBar onSearch={handleSearch} />
        </div>

        {/* Search Results */}
        {isSearchActive ? (
          <div className="space-y-8 life-fade-in">
            {isSearching ? (
              <div className="flex justify-center py-16">
                <Loader2 className="w-6 h-6 text-stone-400 animate-spin" />
              </div>
            ) : (
              <>
                {searchResults.stories.length > 0 && (
                  <div>
                    <h2 className="font-serif text-lg font-medium text-stone-700 dark:text-stone-300 mb-4 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-rose-700 dark:text-rose-400" />
                      스토리 ({searchResults.stories.length})
                    </h2>
                    <div className="space-y-4">
                      {searchResults.stories.map((item) => (
                        <StoryCard key={item.id} item={item} onRequestRead={handleRequestRead} />
                      ))}
                    </div>
                  </div>
                )}
                {searchResults.users.length > 0 && (
                  <div>
                    <h2 className="font-serif text-lg font-medium text-stone-700 dark:text-stone-300 mb-4 flex items-center gap-2">
                      <Users className="w-4 h-4 text-rose-700 dark:text-rose-400" />
                      작가 ({searchResults.users.length})
                    </h2>
                    <div className="space-y-3">
                      {searchResults.users.map((user) => (
                        <AuthorCard
                          key={user.userId}
                          userId={user.userId}
                          displayName={user.displayName}
                          bio={user.bio}
                          avatarUrl={user.avatarUrl}
                          totalStories={user.totalStories}
                          totalFollowers={user.totalFollowers}
                          currentUserId={currentUserId}
                        />
                      ))}
                    </div>
                  </div>
                )}
                {searchResults.stories.length === 0 && searchResults.users.length === 0 && (
                  <div className="text-center py-16 text-stone-400 dark:text-stone-500 font-serif">
                    검색 결과가 없습니다
                  </div>
                )}
              </>
            )}
          </div>
        ) : tagFilter ? (
          /* Tag Filter Results */
          <div className="life-fade-in">
            <div className="flex items-center gap-2 mb-6">
              <span className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium bg-rose-50 dark:bg-rose-900/15 text-rose-700 dark:text-rose-400 rounded-full border border-rose-200/40 dark:border-rose-800/30">
                <Hash className="w-3.5 h-3.5" />
                {tagFilter}
              </span>
              <button
                onClick={clearTagFilter}
                className="text-xs text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 transition-colors"
              >
                필터 해제
              </button>
            </div>
            {tagStories.length > 0 ? (
              <div className="space-y-4">
                {tagStories.map((item) => (
                  <StoryCard key={item.id} item={item} onRequestRead={handleRequestRead} />
                ))}
              </div>
            ) : (
              <div className="text-center py-16 text-stone-400 dark:text-stone-500 font-serif">
                이 태그의 스토리가 없습니다
              </div>
            )}
          </div>
        ) : (
          /* Main Explore Content */
          <>
            {/* Tabs */}
            <FeedTabs
              active={activeTab}
              tabs={[
                { key: 'trending', label: '트렌딩' },
                { key: 'genre', label: '장르별' },
              ]}
              onChange={setActiveTab}
            />

            {/* Genre chips (shown for both tabs) */}
            {activeTab === 'genre' && (
              <div className="mt-4">
                <GenreFilterChips selected={selectedGenre} onChange={(g) => { setSelectedGenre(g); setActiveTab('trending') }} />
              </div>
            )}

            <div className="flex flex-col lg:flex-row gap-8 mt-6">
              {/* Main content */}
              <div className="flex-1">
                <h2 className="font-serif text-lg font-medium text-stone-700 dark:text-stone-300 mb-4 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-rose-700 dark:text-rose-400" />
                  {selectedGenre ? `${selectedGenre} 트렌딩` : '트렌딩 이야기'}
                </h2>

                {exploreStories.length > 0 ? (
                  <div className="space-y-4 stagger-in">
                    {exploreStories.map((item) => (
                      <StoryCard key={item.id} item={item} onRequestRead={handleRequestRead} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-16 text-stone-400 dark:text-stone-500 font-serif">
                    아직 트렌딩 이야기가 없습니다
                  </div>
                )}
              </div>

              {/* Sidebar */}
              <div className="lg:w-72 shrink-0 space-y-6">
                {/* Popular Tags */}
                {exploreTags.length > 0 && (
                  <div className="bg-white/60 dark:bg-stone-900/40 rounded-2xl border border-stone-200/60 dark:border-stone-800/40 p-5">
                    <h3 className="font-serif font-medium text-sm flex items-center gap-2 mb-3 text-stone-700 dark:text-stone-300">
                      <Hash className="w-4 h-4 text-rose-700 dark:text-rose-400" />
                      인기 태그
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {exploreTags.map(({ tag, count }) => (
                        <button
                          key={tag}
                          onClick={() => handleTagClick(tag)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400 rounded-full hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-900/15 dark:hover:text-rose-400 transition-colors"
                        >
                          #{tag}
                          <span className="text-stone-300 dark:text-stone-600">{count}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Popular Authors */}
                {exploreAuthors.length > 0 && (
                  <div className="bg-white/60 dark:bg-stone-900/40 rounded-2xl border border-stone-200/60 dark:border-stone-800/40 p-5">
                    <h3 className="font-serif font-medium text-sm flex items-center gap-2 mb-3 text-stone-700 dark:text-stone-300">
                      <Users className="w-4 h-4 text-rose-700 dark:text-rose-400" />
                      인기 작가
                    </h3>
                    <div className="space-y-3">
                      {exploreAuthors.slice(0, 5).map((author) => (
                        <AuthorCard
                          key={author.userId}
                          userId={author.userId}
                          displayName={author.displayName}
                          bio={author.bio}
                          avatarUrl={author.avatarUrl}
                          totalStories={author.totalStories}
                          totalFollowers={author.totalFollowers}
                          currentUserId={currentUserId}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Recommended Authors */}
                {exploreRecommended.length > 0 && (
                  <div className="bg-white/60 dark:bg-stone-900/40 rounded-2xl border border-stone-200/60 dark:border-stone-800/40 p-5">
                    <h3 className="font-serif font-medium text-sm flex items-center gap-2 mb-3 text-stone-700 dark:text-stone-300">
                      <Sparkles className="w-4 h-4 text-rose-700 dark:text-rose-400" />
                      추천 작가
                    </h3>
                    <div className="space-y-3">
                      {exploreRecommended.slice(0, 5).map((author) => (
                        <AuthorCard
                          key={author.userId}
                          userId={author.userId}
                          displayName={author.displayName}
                          bio={author.bio}
                          avatarUrl={author.avatarUrl}
                          totalStories={author.totalStories}
                          totalFollowers={author.totalFollowers}
                          currentUserId={currentUserId}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
