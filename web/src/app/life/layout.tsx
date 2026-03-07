import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'StoryLife - 여러분의 일기가, 소설이 됩니다',
  description: '오늘 있었던 일을 AI에게 말해보세요. 일상이 소설이 되고, 커뮤니티에서 공유할 수 있어요.',
  openGraph: {
    title: '여러분의 일기가, 소설이 됩니다',
    description: '오늘 있었던 일을 AI에게 말해보세요. 일상이 소설이 되고, 커뮤니티에서 공유할 수 있어요.',
    type: 'website',
    url: 'https://storymind.co.kr/life',
  },
  twitter: {
    card: 'summary_large_image',
    title: '여러분의 일기가, 소설이 됩니다',
    description: '오늘 있었던 일을 AI에게 말해보세요. 일상이 소설이 되고, 커뮤니티에서 공유할 수 있어요.',
  },
}

export default function LifeLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
