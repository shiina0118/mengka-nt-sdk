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
    build: (self_id, platform) => ({ self_id, platform }),
  },
  get_user_agent: {
    wait: true,
    build: (self_id, platform) => ({ self_id, platform }),
  },
  get_client_key: {
    wait: true,
    build: (self_id, platform) => ({ self_id, platform }),
  },
  send_group_msg: {
    wait: true,
    build: (self_id, platform, group_id, message) => ({ self_id, platform, group_id, message }),
  },
  send_friend_msg: {
    wait: true,
    build: (self_id, platform, user_id, message) => ({ self_id, platform, user_id, message }),
  },
  get_friend_list: {
    wait: true,
    build: (self_id, platform) => ({ self_id, platform }),
  },
  set_friend_remark: {
    wait: true,
    build: (self_id, platform, user_id, remark) => ({ self_id, platform, user_id, remark }),
  },
  get_qzone_friend_feeds: {
    wait: true,
    build: (self_id, platform) => ({ self_id, platform }),
  },
  publish_qzone_feed: {
    wait: true,
    build: (self_id, platform, content, visibility = 1, self_delete_after_one_day = false, declare_ai_generated = false) => ({
      self_id,
      platform,
      content,
      visibility,
      self_delete_after_one_day,
      declare_ai_generated,
    }),
  },
  like_qzone_feed: {
    wait: false,
    build: (self_id, platform, feed) => ({ self_id, platform, feed }),
  },
  unlike_qzone_feed: {
    wait: false,
    build: (self_id, platform, feed) => ({ self_id, platform, feed }),
  },
  get_group_list: {
    wait: true,
    build: (self_id, platform) => ({ self_id, platform }),
  },
  get_group_member_list: {
    wait: true,
    build: (self_id, platform, group_id) => ({ self_id, platform, group_id }),
  },
  get_group_system_notifications: {
    wait: true,
    build: (self_id, platform) => ({ self_id, platform }),
  },
  approve_group_apply: {
    wait: true,
    build: (self_id, platform, group_id, request_id, request_type, request_extra) => {
      const p = { self_id, platform, group_id, request_id, request_type }
      if (request_extra !== undefined) p.request_extra = request_extra
      return p
    },
  },
  reject_group_apply: {
    wait: true,
    build: (self_id, platform, group_id, request_id, request_type, reason, request_extra) => {
      const p = { self_id, platform, group_id, request_id, request_type }
      if (reason !== undefined) p.reason = reason
      if (request_extra !== undefined) p.request_extra = request_extra
      return p
    },
  },
  approve_group_invite: {
    wait: true,
    build: (self_id, platform, group_id, msg_seq) => ({ self_id, platform, group_id, msg_seq }),
  },
  get_ps_key: {
    wait: true,
    build: (self_id, platform, domain) => ({ self_id, platform, domain }),
  },
  get_red_packet_info: {
    wait: true,
    timeout: 60 * 1000,
    build: (self_id, platform, group_id, sender_id, red_packet) => ({
      red_packet,
      self_id,
      platform,
      group_id,
      sender_id,
    }),
  },
  grab_red_packet: {
    wait: true,
    timeout: 60 * 1000,
    build: (self_id, platform, group_id, sender_id, red_packet, claim_token) => {
      const params = {
        red_packet,
        self_id,
        platform,
        group_id,
        sender_id,
      }
      if (claim_token !== undefined && claim_token !== '') {
        params.claim_token = claim_token
      }
      return params
    },
  },
  // Claim a group voice packet using the successful voice match result.
  grab_group_voice_red_packet: {
    wait: true,
    timeout: 60 * 1000,
    build: (self_id, platform, group_id, sender_id, red_packet, voice_rate_id) => ({
      red_packet,
      self_id,
      platform,
      group_id,
      sender_id,
      voice_rate_id,
    }),
  },
  get_group_red_packets: {
    wait: true,
    timeout: 60 * 1000,
    build: (self_id, platform, group_id) => ({ self_id, platform, group_id }),
  },
  set_qq_avatar: {
    wait: true,
    timeout: 60 * 1000,
    build: (self_id, platform, file_path) => ({ self_id, platform, file_path }),
  },
  upload_group_image: {
    wait: true,
    timeout: 60 * 1000,
    build: (self_id, platform, group_id, file_path) => ({ self_id, platform, group_id, file_path }),
  },
  upload_friend_image: {
    wait: true,
    timeout: 60 * 1000,
    build: (self_id, platform, user_id, file_path) => ({ self_id, platform, user_id, file_path }),
  },
  upload_group_voice: {
    wait: true,
    timeout: 5 * 60 * 1000,
    build: (self_id, platform, group_id, file_path) => ({ self_id, platform, group_id, file_path }),
  },
  // Upload wallet voice for matching; returns status/degree/voice_rate_id/matched.
  upload_red_packet_voice: {
    wait: true,
    timeout: 5 * 60 * 1000,
    build: (self_id, platform, sender_id, red_packet, file_path) => ({
      red_packet,
      self_id,
      platform,
      sender_id,
      file_path,
    }),
  },
  upload_group_video: {
    wait: true,
    timeout: 5 * 60 * 1000,
    build: (self_id, platform, group_id, file_path) => ({ self_id, platform, group_id, file_path }),
  },
  get_user_profile: {
    wait: true,
    build: (self_id, platform, user_id) => {
      const p = { self_id, platform }
      if (user_id !== undefined) p.user_id = user_id
      return p
    },
  },
  like_user_profile: {
    wait: true,
    build: (self_id, platform, user_id, like_count = 1) => ({ self_id, platform, user_id, like_count }),
  },
  get_sent_profile_likes: {
    wait: true,
    build: (self_id, platform, page_size = 30, next_mid = '0') => ({ self_id, platform, page_size, next_mid }),
  },
  get_received_profile_likes: {
    wait: true,
    build: (self_id, platform, page_size = 30, next_mid = '0') => ({ self_id, platform, page_size, next_mid }),
  },
  get_bot_list: {
    wait: true,
    build: () => ({}),
  },
  get_bot_info: {
    wait: true,
    build: (self_id, platform) => ({ self_id, platform }),
  },
  get_client_profile_list: {
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
    build: (self_id, platform, password, client_profile_id, device_profile_id) => ({ self_id, platform, password, client_profile_id, device_profile_id }),
  },
  update_account: {
    wait: true,
    resultMessage: '账号编辑成功',
    resultData: false,
    build: (self_id, platform, password, client_profile_id, device_profile_id) => ({ self_id, platform, password, client_profile_id, device_profile_id }),
  },
  offline_account: {
    wait: true,
    resultMessage: '账号已离线',
    resultData: false,
    build: (self_id, platform) => ({ self_id, platform }),
  },
  delete_account: {
    wait: true,
    resultMessage: '账号删除成功',
    resultData: false,
    build: (self_id, platform) => ({ self_id, platform }),
  },
  login_account: {
    wait: true,
    build: (self_id, platform) => ({ self_id, platform }),
  },
  check_cache: {
    wait: true,
    build: (self_id, platform) => ({ self_id, platform }),
  },
  cache_login: {
    wait: true,
    build: (self_id, platform) => ({ self_id, platform }),
  },
  submit_slider: {
    wait: true,
    build: (self_id, platform, ticket, randstr) => ({ self_id, platform, ticket, randstr }),
  },
  submit_identity_captcha: {
    wait: true,
    build: (self_id, platform, ticket, randstr) => ({ self_id, platform, ticket, randstr }),
  },
  submit_identity_phone: {
    wait: true,
    build: (self_id, platform, mobile, area_code) => ({ self_id, platform, mobile, area_code }),
  },
  confirm_identity_sms: {
    wait: true,
    build: (self_id, platform, mobile, area_code) => ({ self_id, platform, mobile, area_code }),
  },
  get_security_verify_methods: {
    wait: true,
    build: (self_id, platform) => ({ self_id, platform }),
  },
  get_sms: {
    wait: true,
    build: (self_id, platform, verify_type, sign) => ({ self_id, platform, verify_type, sign }),
  },
  check_sms: {
    wait: true,
    build: (self_id, platform, verify_type, sign, code) => ({ self_id, platform, verify_type, sign, code }),
  },
  get_security_verify_qr: {
    wait: true,
    build: (self_id, platform) => ({ self_id, platform }),
  },
  query_security_verify_qr: {
    wait: true,
    build: (self_id, platform, guarantee_token) => ({ self_id, platform, guarantee_token }),
  },
  get_login_qr: {
    wait: true,
    build: (self_id, platform, client_profile_id, device_profile_id) => ({ self_id, platform, client_profile_id, device_profile_id }),
  },
  query_login_qr: {
    wait: true,
    build: (self_id, platform) => ({ self_id, platform }),
  },
  scan_qr: {
    wait: true,
    build: (self_id, platform, k) => ({ self_id, platform, k }),
  },
  auth_qr: {
    wait: true,
    build: (self_id, platform, k, skip_phone_confirm = false) => ({ self_id, platform, k, skip_phone_confirm }),
  },
  set_group_admin: {
    wait: true,
    build: (self_id, platform, group_id, user_id, set_admin) => ({ self_id, platform, group_id, user_id, set_admin }),
  },
  sign_group: {
    wait: true,
    build: (self_id, platform, group_id) => ({ self_id, platform, group_id }),
  },
  set_group_mute: {
    wait: true,
    build: (self_id, platform, group_id, user_id, duration_sec) => ({ self_id, platform, group_id, user_id, duration_sec }),
  },
  set_group_mute_all: {
    wait: true,
    build: (self_id, platform, group_id, mute) => ({ self_id, platform, group_id, mute }),
  },
  set_group_special_title: {
    wait: true,
    build: (self_id, platform, group_id, user_id, title) => ({ self_id, platform, group_id, user_id, title }),
  },
  kick_group_member: {
    wait: true,
    build: (self_id, platform, group_id, user_id, reject_add_request) => ({ self_id, platform, group_id, user_id, reject_add_request }),
  },
  recall_group_msg: {
    wait: true,
    build: (self_id, platform, group_id, msg_seq, msg_random) => ({ self_id, platform, group_id, msg_seq, msg_random }),
  },
  get_group_forward_msg: {
    wait: true,
    build: (self_id, platform, sender_id, res_id) => ({ self_id, platform, sender_id, res_id }),
  },
  upload_group_forward_msg: {
    wait: true,
    build: (self_id, platform, group_id, messages) => ({ self_id, platform, group_id, messages }),
  },
  delete_friend: {
    wait: true,
    build: (self_id, platform, user_id) => ({ self_id, platform, user_id }),
  },
  get_level_tasks: {
    wait: true,
    build: (self_id, platform) => ({ self_id, platform }),
  },
  execute_level_tasks: {
    wait: true,
    timeout: 5 * 60 * 1000,
    build: (self_id, platform, tasks) => ({ self_id, platform, tasks }),
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
    const payload = JSON.stringify(obj)
    if (obj.type === 'action' && Buffer.byteLength(payload, 'utf8') > 4 * 1024 * 1024) {
      throw new Error('API 请求超过 4 MiB，请改用后端可访问的文件地址')
    }
    if (!ws || ws.readyState !== WebSocket.OPEN) return
    ws.send(payload)
  }

  function call(action, params, resultMessage = '', resultData = true, timeoutMs = 30000) {
    return new Promise((resolve, reject) => {
      const id = String(++nextId)
      const timer = setTimeout(() => {
        pending.delete(id)
        const error = `action ${action} 超时 (${Math.ceil(timeoutMs / 1000)}s)`
        if (resultMessage) resolve({ code: 1, msg: error })
        else reject(new Error(error))
      }, timeoutMs)
      pending.set(id, { resolve, reject, timer, resultMessage, resultData })
      try {
        _send({ type: 'action', id, action, params })
      } catch (error) {
        clearTimeout(timer)
        pending.delete(id)
        if (resultMessage) resolve({ code: 1, msg: error.message })
        else reject(error)
      }
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
