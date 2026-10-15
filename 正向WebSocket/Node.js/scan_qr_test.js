import { createAPI } from './sdk.js'

if (!process.env.MENGKA_SERVICE_TOKEN) {
  throw new Error('请设置 MENGKA_SERVICE_TOKEN 环境变量')
}

function extractK(value) {
  const raw = String(value ?? '').trim()
  if (!raw) return ''
  try {
    const parsed = new URL(raw)
    const k = parsed.searchParams.get('k')
    if (k) return k.trim()
  } catch {}
  const idx = raw.indexOf('k=')
  if (idx >= 0) {
    let after = raw.slice(idx + 2).trim()
    const end = after.search(/[&?#]/)
    if (end >= 0) after = after.slice(0, end)
    if (after) return after
  }
  return raw
}

const qrUrl = process.argv.slice(2).join(' ').trim()
if (!qrUrl) {
  console.error('用法: node scan_qr_test.js <二维码URL或k>')
  process.exit(1)
}

const k = extractK(qrUrl)
console.log('[scan_qr] url =', qrUrl)
console.log('[scan_qr] k   =', k)

const api = createAPI({
  host: '127.0.0.1',
  port: 3001,
  token: process.env.MENGKA_SERVICE_TOKEN,
  name: 'scan-qr-test',
  version: '1.0.0',
  author: 'test',
})

await api.connect()

try {
  const result = await api.scan_qr(106030, 'android', k)
  console.log('[scan_qr] result', JSON.stringify(result))
} catch (error) {
  console.error('[scan_qr] 失败:', error.message)
  process.exitCode = 1
} finally {
  api.disconnect()
}
