import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import vm from 'node:vm'

// Run the public SDK methods with an in-memory WebSocket peer. No account or
// external server is contacted; sent JSON and pending timers remain observable.
async function connectSDK(mode, responses = {}) {
  const sent = []
  const sockets = []
  const servers = []
  const timers = new Set()
  class Socket extends EventEmitter {
    static OPEN = 1
    readyState = 1
    constructor(url) {
      super()
      sockets.push(this)
      if (url) queueMicrotask(() => this.emit('open'))
    }
    send(payload) {
      const msg = JSON.parse(payload)
      sent.push(msg)
      if (msg.type === 'auth') {
        queueMicrotask(() => this.emit('message', JSON.stringify({ type: 'auth_ok' })))
      } else if (msg.type === 'action' && msg.id) {
        const data = Object.hasOwn(responses, msg.action) ? responses[msg.action] : msg.action === 'set_friend_remark'
          ? { success: true, user_id: msg.params.user_id, remark: msg.params.remark }
          : []
        queueMicrotask(() => this.emit('message', JSON.stringify({
          type: 'action_result', id: msg.id, ok: true, data,
        })))
      }
    }
    close() { this.readyState = 3; this.emit('close', 1000) }
  }
  class Server extends EventEmitter {
    constructor() { super(); servers.push(this); queueMicrotask(() => this.emit('listening')) }
    close(callback) { callback() }
  }
  const file = new URL(`../${mode === 'forward' ? '正向' : '反向'}WebSocket/Node.js/sdk.js`, import.meta.url)
  const source = readFileSync(file, 'utf8')
    .replace(/^import .* from 'ws'\r?\n/, '')
    .replace(/export function /g, 'function ')
  const context = vm.createContext({
    WebSocket: Socket, WebSocketServer: Server, Buffer,
    console: { log() {}, warn() {}, error() {} }, setInterval, clearInterval,
    setTimeout(fn, delay) {
      const timer = setTimeout(() => { timers.delete(timer); fn() }, delay)
      timers.add(timer)
      return timer
    },
    clearTimeout(timer) { timers.delete(timer); clearTimeout(timer) },
  })
  vm.runInContext(source, context, { filename: file.pathname })
  const api = mode === 'forward'
    ? context.createAPI({ token: 'test', name: 'test', version: '1', author: 'test' })
    : context.createReverseAPI({ token: 'test' })
  if (mode === 'forward') {
    await api.connect()
  } else {
    await api.listen()
    const socket = new Socket()
    servers[0].emit('connection', socket, { headers: {} })
    socket.emit('message', JSON.stringify({ type: 'ready', node_id: 1, mode: 'reverse' }))
    await api.waitForConnection()
  }
  return {
    api, sent, timers, sockets,
    async close() { if (mode === 'forward') api.disconnect(); else await api.close() },
  }
}

for (const mode of ['forward', 'reverse']) {
  test(`${mode}: remaining renamed APIs and nested packet parameters match the backend`, async t => {
    const sdk = await connectSDK(mode)
    t.after(() => sdk.close())
    for (const name of ['get_up_for_grabs', 'send_group_forward_msg', 'group_sign', 'get_clientkey', 'get_pskey', 'get_protocol_list']) {
      assert.equal(sdk.api[name], undefined, name)
    }
    const account = { self_id: 12345, platform: 'android' }
    const packet = { listid: 'packet', authkey: 'key', title: 'hello', channel: 1, pay_flag: 0, hb_from: 0 }
    for (const [action, args, expected] of [
      ['approve_group_invite', [23456, 34567], { group_id: 23456, msg_seq: 34567 }],
      ['sign_group', [23456], { group_id: 23456 }],
      ['get_client_key', [], {}],
      ['get_ps_key', ['example.com'], { domain: 'example.com' }],
      ['upload_group_forward_msg', [23456, [{ user_id: 67890, message: [{ type: 'text', data: { text: 'hello' } }] }]], { group_id: 23456, messages: [{ user_id: 67890, message: [{ type: 'text', data: { text: 'hello' } }] }] }],
      ['grab_red_packet', [23456, 67890, packet, 'token'], { group_id: 23456, sender_id: 67890, red_packet: packet, claim_token: 'token' }],
      ['add_account', ['password', 0, 1], { password: 'password', client_profile_id: 0, device_profile_id: 1 }],
      ['update_account', ['password', 0, 1], { password: 'password', client_profile_id: 0, device_profile_id: 1 }],
      ['get_login_qr', [0, 1], { client_profile_id: 0, device_profile_id: 1 }],
      ['send_group_msg', [23456, [{ type: 'at', data: { user_id: 67890 } }]], { group_id: 23456, message: [{ type: 'at', data: { user_id: 67890 } }] }],
    ]) {
      await sdk.api[action](12345, 'android', ...args)
      assert.equal(sdk.sent.at(-1).action, action)
      assert.deepEqual(sdk.sent.at(-1).params, { ...account, ...expected }, action)
    }
    await sdk.api.get_client_profile_list()
    assert.equal(sdk.sent.at(-1).action, 'get_client_profile_list')
    assert.deepEqual(sdk.sent.at(-1).params, {})
    assert.equal(sdk.timers.size, 0)
  })

  test(`${mode}: profile actions expose only new names and paginate like records`, async t => {
    const responses = {}
    const sdk = await connectSDK(mode, responses)
    t.after(() => sdk.close())
    for (const name of ['get_summary_card', 'like_summary_card', 'get_sent_likes', 'get_received_likes']) {
      assert.equal(sdk.api[name], undefined, name)
    }
    for (const action of ['get_sent_profile_likes', 'get_received_profile_likes']) {
      responses[action] = {
        likes: [{ user_id: 67890, nickname: '用户', time: 1710000000, like_count: 8, available_like_count: 12 }],
        next_mid: '9007199254740993',
      }
      const first = await sdk.api[action](12345, 'android')
      assert.equal(sdk.sent.at(-1).action, action)
      assert.deepEqual(sdk.sent.at(-1).params, { self_id: 12345, platform: 'android', page_size: 30, next_mid: '0' })
      assert.deepEqual(JSON.parse(JSON.stringify(first)), responses[action])

      responses[action] = { likes: [], next_mid: '-1' }
      const last = await sdk.api[action](12345, 'android', 53, first.next_mid)
      assert.equal(sdk.sent.at(-1).action, action)
      assert.deepEqual(sdk.sent.at(-1).params, { self_id: 12345, platform: 'android', page_size: 53, next_mid: '9007199254740993' })
      assert.deepEqual(JSON.parse(JSON.stringify(last)), { likes: [], next_mid: '-1' })

      // Explicit values must reach the backend unchanged; it owns page-size normalization.
      await sdk.api[action](12345, 'android', 1, '0')
      assert.deepEqual(sdk.sent.at(-1).params, { self_id: 12345, platform: 'android', page_size: 1, next_mid: '0' })
      await sdk.api[action](12345, 'android', undefined, '123')
      assert.deepEqual(sdk.sent.at(-1).params, { self_id: 12345, platform: 'android', page_size: 30, next_mid: '123' })
    }
    assert.equal(sdk.timers.size, 0)
  })

  test(`${mode}: public response fields pass through without legacy aliases`, async t => {
    const responses = {
      get_friend_list: { self_id: 12345, total_count: 1, friends: [{ user_id: 67890, nickname: '好友' }] },
      get_group_list: { self_id: 12345, total_count: 1, groups: [{ group_id: 23456, member_count: 20, max_member_count: 500 }] },
      get_group_member_list: { group_id: 23456, total_count: 1, members: [{ user_id: 67890, nickname: '成员' }] },
      get_user_profile: { user_id: 67890, group_name: '群聊', group_nick: '名片', like_count: 100, sent_like_count: 5, available_like_count: 15, photo_count: 3, status_text: '在线' },
      get_group_system_notifications: { total_count: 1, notifications: [{
        request_key: { request_id: 1, group_id: 23456, type: 2, extra: 3 },
        presentation: { master: { user_id: 67890, name: '群主' }, group: { group_id: 23456, name: '群聊' }, outed_member: { user_id: 98765, name: '成员' }, nav_title: '通知' },
      }] },
      auth_qr: { code: 0, success: true, self_id: 12345 },
      get_level_tasks: { self_id: 12345, overall_info: { total_days: 12.5 }, base_info: { base_task_list: [] } },
      query_login_qr: { code: 0, message: '登录成功', state: 'confirmed', self_id: 12345, login_complete: true },
    }
    const sdk = await connectSDK(mode, responses)
    t.after(() => sdk.close())
    for (const [action, args] of [
      ['get_friend_list', []], ['get_group_list', []], ['get_group_member_list', [23456]],
      ['get_user_profile', [67890]], ['get_group_system_notifications', []],
      ['auth_qr', ['test-key']], ['query_login_qr', []],
      ['get_level_tasks', []],
    ]) {
      const result = await sdk.api[action](12345, 'android', ...args)
      assert.deepEqual(JSON.parse(JSON.stringify(result)), responses[action], action)
    }
    assert.equal(sdk.timers.size, 0)
  })

  test(`${mode}: user and sender identifiers use the renamed public fields`, async t => {
    const sdk = await connectSDK(mode)
    t.after(() => sdk.close())
    const account = [12345, 'android']
    const packet = { listid: 'packet', authkey: 'key', sender_id: 99999 }
    for (const [action, args, expected] of [
      ['delete_friend', [67890], { user_id: 67890 }],
      ['get_user_profile', [67890], { user_id: 67890 }],
      ['get_user_profile', [], {}],
      ['like_user_profile', [67890], { user_id: 67890, like_count: 1 }],
      ['set_group_admin', [23456, 67890, false], { group_id: 23456, user_id: 67890, set_admin: false }],
      ['set_group_mute', [23456, 67890, 0], { group_id: 23456, user_id: 67890, duration_sec: 0 }],
      ['get_group_forward_msg', [67890, 'resource'], { sender_id: 67890, res_id: 'resource' }],
      ['get_red_packet_info', [23456, 67890, packet], { red_packet: packet, group_id: 23456, sender_id: 67890 }],
      ['grab_red_packet', [23456, 67890, packet], { red_packet: packet, group_id: 23456, sender_id: 67890 }],
      ['grab_group_voice_red_packet', [23456, 67890, packet, 'voice'], { red_packet: packet, group_id: 23456, sender_id: 67890, voice_rate_id: 'voice' }],
      ['upload_red_packet_voice', [67890, packet, 'voice.silk'], { red_packet: packet, sender_id: 67890, file_path: 'voice.silk' }],
    ]) {
      await sdk.api[action](...account, ...args)
      assert.equal(sdk.sent.at(-1).action, action)
      assert.deepEqual(sdk.sent.at(-1).params, { self_id: 12345, platform: 'android', ...expected }, action)
    }
    assert.equal(sdk.timers.size, 0)
  })

  test(`${mode}: friend remark preserves setting and explicit clearing`, async t => {
    const sdk = await connectSDK(mode)
    t.after(() => sdk.close())
    for (const remark of ['项目联系人', '']) {
      const result = await sdk.api.set_friend_remark(12345, 'android', 67890, remark)
      assert.deepEqual(sdk.sent.at(-1).params, { self_id: 12345, platform: 'android', user_id: 67890, remark })
      assert.equal(sdk.sent.at(-1).action, 'set_friend_remark')
      assert.equal(result.success, true)
      assert.equal(result.remark, remark)
    }
    assert.equal(sdk.timers.size, 0)
  })

  test(`${mode}: oversized UTF-8 actions fail locally without losing connection`, async t => {
    const sdk = await connectSDK(mode)
    t.after(() => sdk.close())
    const count = sdk.sent.length
    // JavaScript length is under 4 MiB; UTF-8 bytes exceed it.
    const large = '你'.repeat(1_400_000)
    await assert.rejects(sdk.api.send_group_msg(12345, 'android', 23456, [
      { type: 'text', data: { text: large } },
    ]), /4 MiB/)
    await assert.rejects(sdk.api.upload_group_voice(12345, 'android', 23456, 'base64://' + 'A'.repeat(4 * 1024 * 1024)), /4 MiB/)
    const managed = await sdk.api.add_account(12345, 'android', large, 0, 1)
    assert.equal(managed.code, 1)
    assert.match(managed.msg, /4 MiB/)
    assert.throws(() => sdk.api.like_qzone_feed(12345, 'android', { text: large }), /4 MiB/)
    assert.equal(sdk.sent.length, count)
    assert.equal(sdk.timers.size, 0)
    assert.equal(sdk.sockets.at(-1).readyState, 1)
    assert.equal((await sdk.api.get_bot_list()).length, 0)
    assert.equal(sdk.timers.size, 0)
  })
}
