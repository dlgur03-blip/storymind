export const BADGE_META: Record<string, { name: string; description: string; icon: string }> = {
  first_memory: { name: '첫 기억', description: '첫 챕터를 발행했습니다', icon: '🌱' },
  week_streak: { name: '일주일 연속', description: '7일 연속 글을 작성했습니다', icon: '🔥' },
  month_streak: { name: '한 달 연속', description: '30일 연속 글을 작성했습니다', icon: '💎' },
  decade_record: { name: '10년의 기록', description: '기억회상에서 10개 나이를 기록했습니다', icon: '📚' },
  life_complete: { name: '인생 완주', description: '기억회상을 모두 완료했습니다', icon: '🏆' },
  popular_author: { name: '인기 작가', description: '총 좋아요 100개를 달성했습니다', icon: '❤️' },
  bestseller: { name: '베스트셀러', description: '총 조회수 1000을 달성했습니다', icon: '👀' },
  social_king: { name: '소셜 킹', description: '팔로워 10명을 달성했습니다', icon: '👑' },
}

export type BadgeType = keyof typeof BADGE_META

export async function checkAndAwardBadges(supabase: any, userId: string) {
  const awarded: string[] = []

  // Get existing badges
  const { data: existingBadges } = await supabase
    .from('life_badges')
    .select('badge_type')
    .eq('user_id', userId)
  const earned = new Set((existingBadges || []).map((b: any) => b.badge_type))

  // first_memory: at least 1 published chapter
  if (!earned.has('first_memory')) {
    const { count } = await supabase
      .from('life_chapters')
      .select('*', { count: 'exact', head: true })
      .eq('is_published', true)
      .in('story_id', (await supabase.from('life_stories').select('id').eq('user_id', userId)).data?.map((s: any) => s.id) || [])
    if ((count || 0) >= 1) {
      await supabase.from('life_badges').insert({ user_id: userId, badge_type: 'first_memory' }).onConflict('user_id,badge_type').ignore()
      awarded.push('first_memory')
    }
  }

  // week_streak / month_streak
  const { data: streak } = await supabase.from('life_streaks').select('*').eq('user_id', userId).single()
  if (streak) {
    if (!earned.has('week_streak') && streak.current_streak >= 7) {
      await supabase.from('life_badges').upsert({ user_id: userId, badge_type: 'week_streak' }, { onConflict: 'user_id,badge_type' })
      awarded.push('week_streak')
    }
    if (!earned.has('month_streak') && streak.current_streak >= 30) {
      await supabase.from('life_badges').upsert({ user_id: userId, badge_type: 'month_streak' }, { onConflict: 'user_id,badge_type' })
      awarded.push('month_streak')
    }
  }

  // decade_record: 10+ recall chapters
  if (!earned.has('decade_record')) {
    const { data: stories } = await supabase.from('life_stories').select('id').eq('user_id', userId).eq('recall_mode', 'recall')
    const storyIds = (stories || []).map((s: any) => s.id)
    if (storyIds.length > 0) {
      const { count } = await supabase
        .from('life_chapters')
        .select('*', { count: 'exact', head: true })
        .in('story_id', storyIds)
        .not('recall_age', 'is', null)
        .eq('is_skipped', false)
        .eq('is_published', true)
      if ((count || 0) >= 10) {
        await supabase.from('life_badges').upsert({ user_id: userId, badge_type: 'decade_record' }, { onConflict: 'user_id,badge_type' })
        awarded.push('decade_record')
      }
    }
  }

  // popular_author: total likes >= 100
  if (!earned.has('popular_author')) {
    const { data: stories } = await supabase.from('life_stories').select('total_likes').eq('user_id', userId)
    const totalLikes = (stories || []).reduce((sum: number, s: any) => sum + (s.total_likes || 0), 0)
    if (totalLikes >= 100) {
      await supabase.from('life_badges').upsert({ user_id: userId, badge_type: 'popular_author' }, { onConflict: 'user_id,badge_type' })
      awarded.push('popular_author')
    }
  }

  // bestseller: total views >= 1000
  if (!earned.has('bestseller')) {
    const { data: stories } = await supabase.from('life_stories').select('total_views').eq('user_id', userId)
    const totalViews = (stories || []).reduce((sum: number, s: any) => sum + (s.total_views || 0), 0)
    if (totalViews >= 1000) {
      await supabase.from('life_badges').upsert({ user_id: userId, badge_type: 'bestseller' }, { onConflict: 'user_id,badge_type' })
      awarded.push('bestseller')
    }
  }

  // social_king: followers >= 10
  if (!earned.has('social_king')) {
    const { data: profile } = await supabase.from('life_profiles').select('total_followers').eq('user_id', userId).single()
    if (profile && (profile.total_followers || 0) >= 10) {
      await supabase.from('life_badges').upsert({ user_id: userId, badge_type: 'social_king' }, { onConflict: 'user_id,badge_type' })
      awarded.push('social_king')
    }
  }

  return awarded
}
