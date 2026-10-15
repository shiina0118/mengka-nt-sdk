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

const api = createAPI({
  host: '127.0.0.1',
  port: 3001,
  token: process.env.MENGKA_SERVICE_TOKEN,
  name: 'scan-linux-qr-test',
  version: '1.0.0',
  author: 'test',
})

await api.connect()

try {
  const protocols = await api.get_client_profile_list()
  const protocol = protocols.find(item => item.platform === 'linux')
  if (!protocol) throw new Error('没有 Linux 客户端配置')
  console.log('[protocol 2]', JSON.stringify(protocol))

  const bots = await api.get_bot_list()
  const android = bots.find(b => Number(b.self_id) === 106030 && String(b.platform) === 'android')
  const linux = bots.find(b => Number(b.self_id) === 106030 && String(b.platform) === 'linux')
  console.log('[android bot]', JSON.stringify(android))
  console.log('[linux bot]', JSON.stringify(linux))

  const profiles = await api.get_device_profile_list()
  const deviceProfileId = android?.device_profile_id || profiles?.[0]?.id
  console.log('[device_profile_id]', deviceProfileId)

  const qr = await api.get_login_qr(106030, 'linux', protocol.id, deviceProfileId)
  console.log('[get_login_qr]', JSON.stringify(qr))

  const url = qr?.url || ''
  const k = extractK(url)
  console.log('[qr url]', url)
  console.log('[k]', k)
  if (!k) throw new Error('登录二维码里没有 k')

  const result = await api.scan_qr(106030, 'android', k)
  console.log('[scan_qr]', JSON.stringify(result))
  if (Number(result?.code) !== 0 && Number(result?.status) !== 1) {
    throw new Error('scan_qr 未通过，跳过 auth_qr')
  }

  const auth = await api.auth_qr(106030, 'android', k, false)
  console.log('[auth_qr]', JSON.stringify(auth))
} catch (error) {
  console.error('[fail]', error.message)
  process.exitCode = 1
} finally {
  api.disconnect()
}
