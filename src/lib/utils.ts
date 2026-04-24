export const fmt = (n: number) =>
  new Intl.NumberFormat('ko-KR').format(Math.abs(Math.round(n)))

export const fmtW = (n: number) =>
  `${n < 0 ? '-' : ''}${fmt(n)}원`

export const pct = (a: number, b: number) =>
  b ? Math.round((a / b) * 100) : 0

export function downloadCSV(rows: (string | number)[][], filename: string) {
  const content = rows
    .map((row) =>
      row
        .map((cell) => {
          const value = String(cell ?? '')
          if (value.includes(',') || value.includes('"') || value.includes('\n')) {
            return `"${value.replace(/"/g, '""')}"`
          }
          return value
        })
        .join(','),
    )
    .join('\n')

  const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

export function formatKoreanDate(dateStr: string) {
  const d = new Date(dateStr)
  const days = ['일', '월', '화', '수', '목', '금', '토']
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 ${days[d.getDay()]}요일`
}
