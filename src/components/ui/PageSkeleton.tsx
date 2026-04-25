// 페이지 로딩 스켈레톤 — loading.tsx에서 공통 사용
export function PageSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            height: i === 0 ? 160 : i === 1 ? 100 : 200,
            animation: 'skeleton-pulse 1.4s ease-in-out infinite',
            animationDelay: `${i * 0.1}s`,
          }}
        />
      ))}
      <style>{`
        @keyframes skeleton-pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.45; }
        }
      `}</style>
    </div>
  )
}
