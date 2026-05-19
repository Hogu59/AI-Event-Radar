import { Suspense } from 'react';
import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { Toaster } from '@/components/ui/toaster';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: 'AIEventRadar — AI 행사 한 곳에서, 놓치지 않게',
    template: '%s | AIEventRadar',
  },
  description:
    'Festa, 이벤터스, Luma, Dev-Event, Devpost를 자동 수집해 한국 AI 빌더에게 맞춤 행사를 추천합니다. 키워드 기반 개인화 알림 + 마감 D-3 리마인드.',
  keywords: ['AI', 'LLM', 'RAG', 'Agent', '해커톤', '컨퍼런스', '밋업', 'MLOps'],
  openGraph: {
    type: 'website',
    locale: 'ko_KR',
    url: APP_URL,
    siteName: 'AIEventRadar',
    title: 'AIEventRadar — AI 행사 한 곳에서, 놓치지 않게',
    description:
      'Festa, 이벤터스, Luma, Dev-Event, Devpost를 자동 수집해 한국 AI 빌더에게 맞춤 행사를 추천합니다.',
    images: [
      {
        url: '/og.png',
        width: 1200,
        height: 630,
        alt: 'AIEventRadar',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AIEventRadar — AI 행사 한 곳에서, 놓치지 않게',
    description: '5개 소스 자동 수집 · 중복 제거 · 개인화 알림',
  },
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0a1620' },
  ],
  width: 'device-width',
  initialScale: 1,
};

const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem('aieventradar-theme')||'system';var d=t==='dark'||(t==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d);document.documentElement.style.colorScheme=d?'dark':'light';}catch(_){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" suppressHydrationWarning className={inter.variable}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-screen bg-background font-sans text-foreground antialiased">
        <ThemeProvider>
          <AuthProvider>
            <div className="flex min-h-screen flex-col">
              <Suspense fallback={<div className="h-16 border-b border-border" />}>
                <Header />
              </Suspense>
              <main className="flex-1">{children}</main>
              <Footer />
            </div>
            <Toaster />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
