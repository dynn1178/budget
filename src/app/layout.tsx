import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'WhereDidItGo | 가계부',
  description: '월 예산, 지출 내역, 자산 현황을 한 곳에서 관리하는 개인 가계부',
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='82'>원</text></svg>",
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#2E7D70',
}

const THEME_SCRIPT = `(function(){
  try{
    var w=window.innerWidth, dk=w<600?'mobile':w<1100?'tablet':'desktop';
    var root=document.documentElement;
    var theme=localStorage.getItem('wdig_'+dk+'_theme');
    var accent=localStorage.getItem('wdig_'+dk+'_accent');
    var font=localStorage.getItem('wdig_'+dk+'_font');
    if(theme) root.setAttribute('data-theme', JSON.parse(theme));
    if(accent) root.setAttribute('data-accent', JSON.parse(accent));
    var fonts={
      'pretendard': "'Pretendard Variable','Pretendard',-apple-system,sans-serif",
      'noto-sans': "'Noto Sans KR',sans-serif",
      'gothic': "'Gothic A1',sans-serif",
      'ibm': "'IBM Plex Sans KR',sans-serif",
      'noto-serif': "'Noto Serif KR',serif"
    };
    if(font){
      var parsed=JSON.parse(font);
      root.style.setProperty('--font-sans', fonts[parsed] || fonts['pretendard']);
    }
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
