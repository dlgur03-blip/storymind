// @ts-nocheck
import { createServerSupabase } from '@/lib/supabase/server'
import ChapterReaderClient from './ChapterReaderClient'

export async function generateMetadata({ params }: { params: Promise<{ storyId: string; chapterNum: string }> }) {
  const { storyId, chapterNum } = await params
  const supabase = await createServerSupabase()

  const { data: story } = await supabase
    .from('life_stories')
    .select('title, genre')
    .eq('id', storyId)
    .single()

  const { data: chapter } = await supabase
    .from('life_chapters')
    .select('title, content')
    .eq('story_id', storyId)
    .eq('number', parseInt(chapterNum))
    .single()

  const title = chapter?.title
    ? `${chapter.title} - ${story?.title || 'StoryLife'}`
    : `챕터 ${chapterNum} - ${story?.title || 'StoryLife'}`

  const description = chapter?.content?.slice(0, 160) || '나의 이야기를 소설로!'

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'article',
    },
  }
}

export default async function ChapterPage({ params }: { params: Promise<{ storyId: string; chapterNum: string }> }) {
  const { storyId, chapterNum } = await params
  return <ChapterReaderClient storyId={storyId} chapterNum={chapterNum} />
}
