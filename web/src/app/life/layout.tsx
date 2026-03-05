import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'StoryLife - 나의 이야기를 소설로',
  description: 'AI와 대화하며 일상을 소설로 만들어보세요. 커뮤니티에서 공유하고 함께 즐기세요.',
  openGraph: {
    title: 'StoryLife - 나의 이야기를 소설로',
    description: 'AI와 대화하며 일상을 소설로 만들어보세요.',
    type: 'website',
  },
}

export default function LifeLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
