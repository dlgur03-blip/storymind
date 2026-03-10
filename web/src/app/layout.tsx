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
  title: "StoryMind - 여러분의 일기가, 소설이 됩니다",
  description: "오늘 있었던 일을 AI에게 말해보세요. 여러분의 일상이 소설이 됩니다. AI 기반 창작 도구 & 커뮤니티.",
  metadataBase: new URL("https://storymind.co.kr"),
  openGraph: {
    title: "여러분의 일기가, 소설이 됩니다",
    description: "오늘 있었던 일을 AI에게 말해보세요. 여러분의 일상이 소설이 됩니다.",
    url: "https://storymind.co.kr",
    siteName: "StoryMind",
    locale: "ko_KR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "여러분의 일기가, 소설이 됩니다",
    description: "오늘 있었던 일을 AI에게 말해보세요. 여러분의 일상이 소설이 됩니다.",
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
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
