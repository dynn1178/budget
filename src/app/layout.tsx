import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'WhereDidItGo — 가계부',
  description: '내 돈 어디 갔지? 스마트 가계부',
  manifest: '/manifest.json',
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>₩</text></svg>",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'WhereDidItGo',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#2E7D70',
}

// FOUC 방지: 테마/폰트/액센트 즉시 적용
const THEME_SCRIPT = `(function(){
  try{
    var w=window.innerWidth,dk=w<600?'mobile':w<1100?'tablet':'desktop';
    var p=JSON.parse(localStorage.getItem('wdig_'+dk+'_settings')||'{}');
    var r=document.documentElement;
    if(p.theme) r.setAttribute('data-theme',p.theme);
    if(p.accent) r.setAttribute('data-accent',p.accent);
    var fonts={
      'pretendard':"'Pretendard Variable','Pretendard',-apple-system,sans-serif",
      'noto-sans':"'Noto Sans KR',sans-serif",
      'gothic':"'Gothic A1',sans-serif",
      'ibm':"'IBM Plex Sans KR',sans-serif",
      'noto-serif':"'Noto Serif KR',serif"
    };
    if(p.font) r.style.setProperty('--font-sans',fonts[p.font]||fonts['pretendard']);
  }catch(e){}
})();`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;700;900&family=Noto+Serif+KR:wght@300;400;600&family=Gothic+A1:wght@300;400;700;900&family=IBM+Plex+Sans+KR:wght@300;400;600;700&display=swap"
          rel="stylesheet"
        />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.min.css"
        />
      </head>
      <body>{children}</body>
    </html>
  )
}
