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
  title: "StoryMind - 개개인의 이야기가 특별한 세상",
  description: "여러분의 일기가 소설이 됩니다. AI와 대화하며 나만의 이야기를 만들어보세요.",
  metadataBase: new URL("https://storymind.co.kr"),
  openGraph: {
    title: "개개인의 이야기가 특별한 세상",
    description: "여러분의 일기가 소설이 됩니다. AI와 대화하며 나만의 이야기를 만들어보세요.",
    url: "https://storymind.co.kr",
    siteName: "StoryMind",
    locale: "ko_KR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "개개인의 이야기가 특별한 세상",
    description: "여러분의 일기가 소설이 됩니다. AI와 대화하며 나만의 이야기를 만들어보세요.",
  },
};

// Inline script to set dark class before first paint — prevents flash
const DARK_MODE_SCRIPT = `(function(){try{var d=document.documentElement;var s=localStorage.getItem('sm_dark');if(s==='true'||(s===null&&window.matchMedia('(prefers-color-scheme:dark)').matches)){d.classList.add('dark')}else{d.classList.remove('dark')}}catch(e){}})();`

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: DARK_MODE_SCRIPT }} />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
