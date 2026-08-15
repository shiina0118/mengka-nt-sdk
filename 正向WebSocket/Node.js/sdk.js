import WebSocket from 'ws'

// ========== 日志工具 ==========
const log = {
  info: (...a)  => console.log('\x1b[36m[SDK]\x1b[0m', ...a),
  ok:   (...a)  => console.log('\x1b[32m[SDK]\x1b[0m', ...a),
  warn: (...a)  => console.warn('\x1b[33m[SDK]\x1b[0m', ...a),
  err:  (...a)  => console.error('\x1b[31m[SDK]\x1b[0m', ...a),
}

// ========== 事件名常量 ==========
const EVENTS = ['group_message', 'friend_message', 'group_notice', 'friend_notice', 'bot_offline']

// ========== API 定义 ==========
const apiDefs = {
  get_skey: {
    wait: true,
    build: (self_id) => ({ self_id }),
  },
  get_user_agent: {
    wait: true,
    build: (self_id) => ({ self_id }),
  },
  get_clientkey: {
    wait: true,
    build: (self_id) => ({ self_id }),
  },
  send_group_msg: {
    wait: true,
    build: (self_id, group_id, message) => ({ self_id, group_id, message }),
  },
  send_friend_msg: {
    wait: true,
    build: (self_id, user_id, message) => ({ self_id, user_id, message }),
  },
  get_friend_list: {
    wait: true,
    build: (self_id) => ({ self_id }),
  },
  get_qzone_friend_feeds: {
    wait: true,
    build: (self_id) => ({ self_id }),
  },
  publish_qzone_feed: {
    wait: true,
    build: (self_id, content, visibility = 1, self_delete_after_one_day = false, declare_ai_generated = false) => ({
      self_id,
      content,
      visibility,
      self_delete_after_one_day,
      declare_ai_generated,
    }),
  },
  like_qzone_feed: {
    wait: false,
    build: (self_id, feed) => ({ self_id, feed }),
  },
  unlike_qzone_feed: {
    wait: false,
    build: (self_id, feed) => ({ self_id, feed }),
  },
  get_group_list: {
    wait: true,
    build: (self_id) => ({ self_id }),
  },
  get_group_member_list: {
    wait: true,
    build: (self_id, group_id) => ({ self_id, group_id }),
  },
  get_group_system_notifications: {
    wait: true,
    build: (self_id) => ({ self_id }),
  },
  approve_group_apply: {
    wait: true,
    build: (self_id, group_id, request_id, request_type, request_extra) => {
      const p = { self_id, group_id, request_id, request_type }
      if (request_extra !== undefined) p.request_extra = request_extra
      return p
    },
  },
  reject_group_apply: {
    wait: true,
    build: (self_id, group_id, request_id, request_type, reason, request_extra) => {
      const p = { self_id, group_id, request_id, request_type }
      if (reason !== undefined) p.reason = reason
      if (request_extra !== undefined) p.request_extra = request_extra
      return p
    },
  },
  approve_group_invite: {
    wait: true,
    build: (self_id, group_id, msgseq) => ({ self_id, group_id, msgseq }),
  },
  get_pskey: {
    wait: true,
    build: (self_id, domain) => ({ self_id, domain }),
  },
  get_red_packet_info: {
    wait: true,
    timeout: 60 * 1000,
    build: (self_id, group_id, sender_uin, red_packet) => ({
      ...red_packet,
      self_id,
      group_id,
      sender_uin,
    }),
  },
  grab_red_packet: {
    wait: true,
    timeout: 60 * 1000,
    build: (self_id, group_id, sender_uin, red_packet, pre_grap_token) => ({
      ...red_packet,
      self_id,
      group_id,
      sender_uin,
      pre_grap_token,
    }),
  },
  get_group_red_packets: {
    wait: true,
    timeout: 60 * 1000,
    build: (self_id, group_id) => ({ self_id, group_id }),
  },
  get_up_for_grabs: {
    wait: true,
    timeout: 60 * 1000,
    build: (self_id, group_id) => ({ self_id, group_id }),
  },
  set_qq_avatar: {
    wait: true,
    timeout: 60 * 1000,
    build: (self_id, file_path) => ({ self_id, file_path }),
  },
  upload_group_image: {
    wait: true,
    timeout: 60 * 1000,
    build: (self_id, group_id, file_path) => ({ self_id, group_id, file_path }),
  },
  upload_friend_image: {
    wait: true,
    timeout: 60 * 1000,
    build: (self_id, user_id, file_path) => ({ self_id, user_id, file_path }),
  },
  upload_group_voice: {
    wait: true,
    timeout: 5 * 60 * 1000,
    build: (self_id, group_id, file_path) => ({ self_id, group_id, file_path }),
  },
  upload_group_video: {
    wait: true,
    timeout: 5 * 60 * 1000,
    build: (self_id, group_id, file_path) => ({ self_id, group_id, file_path }),
  },
  get_summary_card: {
    wait: true,
    build: (self_id, target_uin) => {
      const p = { self_id }
      if (target_uin !== undefined) p.target_uin = target_uin
      return p
    },
  },
  like_summary_card: {
    wait: true,
    build: (self_id, target_uin, like_count = 1) => ({ self_id, target_uin, like_count }),
  },
  get_bot_list: {
    wait: true,
    build: () => ({}),
  },
  get_bot_info: {
    wait: true,
    build: self_id => ({ self_id }),
  },
  get_protocol_list: {
    wait: true,
    build: () => ({}),
  },
  get_device_profile_list: {
    wait: true,
    build: () => ({}),
  },
  add_account: {
    wait: true,
    resultMessage: '账号添加成功',
    resultData: false,
    build: (self_id, password, protocol_id, device_profile_id) => ({ self_id, password, protocol_id, device_profile_id }),
  },
  update_account: {
    wait: true,
    resultMessage: '账号编辑成功',
    resultData: false,
    build: (self_id, password, protocol_id, device_profile_id) => ({ self_id, password, protocol_id, device_profile_id }),
  },
  offline_account: {
    wait: true,
    resultMessage: '账号已离线',
    resultData: false,
    build: self_id => ({ self_id }),
  },
  delete_account: {
    wait: true,
    resultMessage: '账号删除成功',
    resultData: false,
    build: self_id => ({ self_id }),
  },
  login_account: {
    wait: true,
    build: self_id => ({ self_id }),
  },
  check_cache: {
    wait: true,
    build: self_id => ({ self_id }),
  },
  cache_login: {
    wait: true,
    build: self_id => ({ self_id }),
  },
  submit_slider: {
    wait: true,
    build: (self_id, ticket, randstr) => ({ self_id, ticket, randstr }),
  },
  get_security_verify_methods: {
    wait: true,
    build: self_id => ({ self_id }),
  },
  get_sms: {
    wait: true,
    build: (self_id, verify_type, sign) => ({ self_id, verify_type, sign }),
  },
  check_sms: {
    wait: true,
    build: (self_id, verify_type, sign, code) => ({ self_id, verify_type, sign, code }),
  },
  create_login_qr: {
    wait: true,
    build: self_id => ({ self_id }),
  },
  query_login_qr_status: {
    wait: true,
    build: (self_id, guarantee_token) => ({ self_id, guarantee_token }),
  },
  set_group_admin: {
    wait: true,
    build: (self_id, group_id, target_uin, set_admin) => ({ self_id, group_id, target_uin, set_admin }),
  },
  group_sign: {
    wait: true,
    build: (self_id, group_id) => ({ self_id, group_id }),
  },
  set_group_mute: {
    wait: true,
    build: (self_id, group_id, target_uin, duration_sec) => ({ self_id, group_id, target_uin, duration_sec }),
  },
  set_group_mute_all: {
    wait: true,
    build: (self_id, group_id, mute) => ({ self_id, group_id, mute }),
  },
  set_group_special_title: {
    wait: true,
    build: (self_id, group_id, user_id, title) => ({ self_id, group_id, user_id, title }),
  },
  kick_group_member: {
    wait: true,
    build: (self_id, group_id, user_id, reject_add_request) => ({ self_id, group_id, user_id, reject_add_request }),
  },
  recall_group_msg: {
    wait: true,
    build: (self_id, group_id, msg_seq, msg_random) => ({ self_id, group_id, msg_seq, msg_random }),
  },
  get_group_forward_msg: {
    wait: true,
    build: (self_id, sender_uin, res_id) => ({ self_id, sender_uin, res_id }),
  },
  send_group_forward_msg: {
    wait: true,
    build: (self_id, group_id, messages) => ({ self_id, group_id, messages }),
  },
  delete_friend: {
    wait: true,
    build: (self_id, target_uin) => ({ self_id, target_uin }),
  },
  get_level_tasks: {
    wait: true,
    build: (self_id) => ({ self_id }),
  },
  execute_level_tasks: {
    wait: true,
    timeout: 5 * 60 * 1000,
    build: (self_id, tasks) => ({ self_id, tasks }),
  },
  register_captcha_proxy: {
    wait: true,
    timeout: 30 * 1000,
    build: (self_id, url, proxy_base = '') => ({ self_id, url, proxy_base }),
  },
  captcha_proxy: {
    wait: true,
    timeout: 30 * 1000,
    build: (self_id, url, method = 'GET', headers = {}, body = '') => ({ self_id, url, method, headers, body }),
  },
}

// ========== 事件分发 ==========
function dispatchEvent(listeners, event) {
  const { post_type, group_id } = event
  let key = null
  if (post_type === 'group_message')   key = 'group_message'
  if (post_type === 'friend_message')  key = 'friend_message'
  if (post_type === 'group_notice')    key = 'group_notice'
  if (post_type === 'friend_notice')   key = 'friend_notice'
  if (post_type === 'bot_offline')     key = 'bot_offline'
  if (key && listeners[key]) {
    try { listeners[key](event) } catch (e) { log.err('事件回调异常:', e) }
  }
}

// ========== createAPI ==========
export function createAPI(config) {
  const { host = '127.0.0.1', port = 3001, token, name, version, author } = config
  if (!token)  throw new Error('token 必填')
  if (!name)   throw new Error('name 必填')
  if (!version) throw new Error('version 必填')
  if (!author) throw new Error('author 必填')

  const listeners = {}       // { group_message: fn, ... }
  const pending = new Map()  // id → { resolve, reject, timer, resultMessage, resultData }
  let ws = null
  let nextId = 0
  let connected = false

  function _send(obj) {
    if (!ws || ws.readyState !== WebSocket.OPEN) return
    ws.send(JSON.stringify(obj))
  }

  function call(action, params, resultMessage = '', resultData = true, timeoutMs = 30000) {
    return new Promise((resolve, reject) => {
      const id = String(++nextId)
      const timer = setTimeout(() => {
        pending.delete(id)
        const error = `action ${action} 超时 (30s)`
        if (resultMessage) resolve({ code: 1, msg: error })
        else reject(new Error(error))
      }, timeoutMs)
      pending.set(id, { resolve, reject, timer, resultMessage, resultData })
      _send({ type: 'action', id, action, params })
    })
  }

  function connect() {
    const url = `ws://${host}:${port}/`
    log.info(`连接 ${url} ...`)
    return new Promise((resolve, reject) => {
      ws = new WebSocket(url)
      ws.on('open', () => {
        const p = {
          group_message:  !!listeners['group_message'],
          friend_message: !!listeners['friend_message'],
          group_event:    !!listeners['group_notice'],
          friend_event:   !!listeners['friend_notice'],
          bot_offline:    !!listeners['bot_offline'],
        }
        _send({ type: 'auth', token, name, version, author, permissions: p })
      })
      ws.on('message', (data) => {
        let msg
        try { msg = JSON.parse(data.toString()) } catch { return }
        switch (msg.type) {
          case 'auth_ok':
            connected = true
            log.ok('认证成功')
            resolve()
            startPing()
            break
          case 'auth_failed':
            reject(new Error(msg.message || '认证失败'))
            break
          case 'event':
            dispatchEvent(listeners, msg.data)
            break
          case 'action_result':
            if (msg.id && pending.has(msg.id)) {
              const { resolve: res, reject: rej, timer, resultMessage, resultData } = pending.get(msg.id)
              clearTimeout(timer)
              pending.delete(msg.id)
              if (resultMessage) {
                if (msg.ok) {
                  const result = { code: 0, msg: resultMessage }
                  if (resultData) result.data = msg.data
                  res(result)
                }
                else res({ code: 1, msg: msg.error || 'action failed' })
              }
              else if (msg.ok) res(msg.data)
              else rej(new Error(msg.error || 'action failed'))
            }
            break
          case 'pong': break
        }
      })
      ws.on('close', (code) => {
        connected = false
        for (const [, p] of pending) {
          clearTimeout(p.timer)
          if (p.resultMessage) p.resolve({ code: 1, msg: '连接断开' })
          else p.reject(new Error('连接断开'))
        }
        pending.clear()
        log.warn(`连接断开 code=${code}`)
      })
      ws.on('error', (err) => { reject(err) })
    })
  }

  let pingTimer = null
  function startPing() {
    pingTimer = setInterval(() => _send({ type: 'ping' }), 30000)
  }

  function on(eventType, fn) {
    if (!EVENTS.includes(eventType)) return
    listeners[eventType] = fn
  }

  function disconnect() {
    if (pingTimer) clearInterval(pingTimer)
    if (ws) ws.close()
  }

  const api = { on, connect, disconnect }

  // action 方法直接挂 api 上
  for (const [apiName, def] of Object.entries(apiDefs)) {
    api[apiName] = (...args) => {
      const params = def.build(...args)
      if (def.wait) return call(apiName, params, def.resultMessage, def.resultData !== false, def.timeout)
      _send({ type: 'action', action: apiName, params })
    }
  }

  return api
}
