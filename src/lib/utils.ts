export const fmt  = (n: number) => new Intl.NumberFormat('ko-KR').format(Math.abs(Math.round(n)))
export const fmtW = (n: number) => `${n < 0 ? '-' : ''}₩${fmt(n)}`
export const pct  = (a: number, b: number) => b ? Math.round(a / b * 100) : 0

export function downloadCSV(rows: (string | number)[][], filename: string) {
  const content = rows.map(r => r.map(cell =>
    typeof cell === 'string' && cell.includes(',') ? `"${cell}"` : cell
  ).join(',')).join('\n')
  const bom = '\uFEFF'
  const blob = new Blob([bom + content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

export function formatKoreanDate(dateStr: string) {
  const d = new Date(dateStr)
  const days = ['일', '월', '화', '수', '목', '금', '토']
  return `${d.getFullYear()}년 ${d.getMonth()+1}월 ${d.getDate()}일 ${days[d.getDay()]}요일`
}
