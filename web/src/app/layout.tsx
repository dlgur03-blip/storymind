import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "StoryMind - AI 웹소설 어시스턴트",
  description: "설정 자동 추적, 모순 탐지, AI 대필까지. 작가를 위한 올인원 창작 도구.",
  metadataBase: new URL("https://storymind.co.kr"),
  openGraph: {
    title: "StoryMind - AI 웹소설 어시스턴트",
    description: "설정 자동 추적, 모순 탐지, AI 대필까지. 작가를 위한 올인원 창작 도구.",
    url: "https://storymind.co.kr",
    siteName: "StoryMind",
    locale: "ko_KR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "StoryMind - AI 웹소설 어시스턴트",
    description: "설정 자동 추적, 모순 탐지, AI 대필까지. 작가를 위한 올인원 창작 도구.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white`}
      >
        {children}
      </body>
    </html>
  );
}
