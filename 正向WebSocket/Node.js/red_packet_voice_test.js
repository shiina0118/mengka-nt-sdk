import { createAPI } from './sdk.js'

function positiveInteger(value, name) {
  const number = Number(value)
  if (!Number.isSafeInteger(number) || number <= 0) throw new Error(`${name} 必须是正整数`)
  return number
}

const token = process.env.MENGKA_TOKEN
const filePath = process.argv[2]
if (!token || !filePath) {
  console.error('设置 MENGKA_TOKEN、MENGKA_SELF_ID、MENGKA_GROUP_ID 后运行: node red_packet_voice_test.js <音频路径或URL>')
  process.exit(1)
}
const selfID = positiveInteger(process.env.MENGKA_SELF_ID, 'MENGKA_SELF_ID')
const groupID = positiveInteger(process.env.MENGKA_GROUP_ID, 'MENGKA_GROUP_ID')
const platform = process.env.MENGKA_PLATFORM || 'android'
const testGrab = process.env.MENGKA_TEST_GRAB === '1'
const api = createAPI({
  host: process.env.MENGKA_WS_HOST || '127.0.0.1',
  port: positiveInteger(process.env.MENGKA_WS_PORT || 3001, 'MENGKA_WS_PORT'),
  token,
  name: 'red-packet-voice-test',
  version: '1.0.0',
  author: 'test',
})

let started = false
let selectedPacket, selectedSenderUIN
let eventTimer
let resolveResult, rejectResult
const resultPromise = new Promise((resolve, reject) => {
  resolveResult = resolve
  rejectResult = reject
})

// Register before connecting so group-message permission is requested.
api.on('group_message', event => {
  if (started || Number(event.self_id) !== selfID || Number(event.group_id) !== groupID) return
  const packet = event.message?.find(segment => segment.type === 'red_packet' && Number(segment.data?.channel) === 65536)?.data
  if (!packet) return
  started = true
  clearTimeout(eventTimer)
  console.log(`[语音红包] listid=${packet.listid} title=${packet.title}`)
  try {
    const senderUIN = positiveInteger(event.sender?.user_id ?? event.user_id, '红包发送者 UIN')
    selectedPacket = packet
    selectedSenderUIN = senderUIN
    api.upload_red_packet_voice(selfID, platform, senderUIN, packet, filePath).then(resolveResult, rejectResult)
  } catch (error) {
    rejectResult(error)
  }
})

try {
  await api.connect()
  console.log(`等待群 ${groupID} 的新语音红包（120秒）。录音内容应与口令一致。`)
  if (!started) eventTimer = setTimeout(() => rejectResult(new Error('120秒内未收到目标群语音红包')), 120000)
  const result = await resultPromise
  console.log('[匹配结果]', JSON.stringify(result, null, 2))
  if (result.matched && result.status === 1 && result.degree && result.voice_rate_id === result.degree) {
    console.log('匹配通过：已取得 voice_rate_id。')
    if (testGrab) {
      let rejected = false
      try {
        await api.grab_red_packet(selfID, platform, groupID, selectedSenderUIN, selectedPacket)
      } catch (error) {
        if (!error.message.includes('grab_group_voice_red_packet')) throw error
        rejected = true
        console.log('[通用入口兜底]', error.message)
      }
      if (!rejected) throw new Error('通用领取入口未拒绝语音红包，请检查后端版本')
      const voice = await api.upload_group_voice(selfID, platform, groupID, filePath)
      await api.send_group_msg(selfID, platform, groupID, [voice])
      console.log('[群聊语音] 已发送')
      const grabbed = await api.grab_group_voice_red_packet(selfID, platform, groupID, selectedSenderUIN, selectedPacket, result.voice_rate_id)
      console.log('[领取结果]', JSON.stringify(grabbed, null, 2))
      if (Number(grabbed.retcode) !== 0) throw new Error(`领取失败: retcode=${grabbed.retcode} retmsg=${grabbed.retmsg || ''}`)
    }
  } else if (result.matched === false) {
    console.log('服务器返回匹配未通过，可检查录音内容后换一个新红包重测。')
  } else {
    throw new Error('匹配响应字段不符合预期')
  }
} catch (error) {
  console.error('[匹配测试失败]', error.message)
  process.exitCode = 1
} finally {
  clearTimeout(eventTimer)
  api.disconnect()
}
