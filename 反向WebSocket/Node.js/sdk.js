import WebSocket, { WebSocketServer } from 'ws'

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

// ========== createReverseAPI ==========
export function createReverseAPI(config = {}) {
  const { host = '0.0.0.0', port = 3002, path = '/', token } = config
  if (!token) throw new Error('token 必填')

  const listeners = {}
  const pending = new Map()
  const connectionWaiters = new Set()
  let wss = null
  let ws = null
  let ready = false
  let closing = false
  let nextId = 0
  let connectionInfo = null

  function requestToken(req) {
    const authorization = String(req.headers.authorization || '')
    const bearer = authorization.match(/^Bearer\s+(.+)$/i)
    return bearer?.[1] || String(req.headers['x-mengka-token'] || '')
  }

  function rejectPending(message) {
    for (const [, item] of pending) {
      clearTimeout(item.timer)
      if (item.resultMessage) item.resolve({ code: 1, msg: message })
      else item.reject(new Error(message))
    }
    pending.clear()
  }

  function resolveConnectionWaiters() {
    for (const waiter of connectionWaiters) {
      clearTimeout(waiter.timer)
      waiter.resolve(connectionInfo)
    }
    connectionWaiters.clear()
  }

  function _send(obj) {
    if (!ready || !ws || ws.readyState !== WebSocket.OPEN) {
      throw new Error('萌卡NT 后台尚未建立反向 WebSocket 连接')
    }
    ws.send(JSON.stringify(obj))
  }

  function handleActionResult(msg) {
    if (!msg.id || !pending.has(msg.id)) return
    const item = pending.get(msg.id)
    clearTimeout(item.timer)
    pending.delete(msg.id)
    if (item.resultMessage) {
      if (msg.ok) {
        const result = { code: 0, msg: item.resultMessage }
        if (item.resultData) result.data = msg.data
        item.resolve(result)
      } else {
        item.resolve({ code: 1, msg: msg.error || 'action failed' })
      }
    } else if (msg.ok) {
      item.resolve(msg.data)
    } else {
      item.reject(new Error(msg.error || 'action failed'))
    }
  }

  function handleConnection(socket, req) {
    if (ws && ws.readyState === WebSocket.OPEN) {
      socket.close(1013, '已有后台连接')
      return
    }

    ws = socket
    ready = false
    connectionInfo = {
      service: String(req.headers['x-mengka-service'] || ''),
      node_id: Number(req.headers['x-mengka-node-id'] || 0),
      mode: 'reverse',
    }

    socket.on('message', data => {
      let msg
      try { msg = JSON.parse(data.toString()) } catch { return }
      if (msg.type === 'ready') {
        ready = true
        connectionInfo = { ...connectionInfo, ...msg }
        log.ok(`后台已连接 服务=${connectionInfo.service || '-'} 节点=${connectionInfo.node_id || '-'}`)
        resolveConnectionWaiters()
      } else if (msg.type === 'event') {
        dispatchEvent(listeners, msg.data)
      } else if (msg.type === 'action_result') {
        handleActionResult(msg)
      }
    })

    socket.on('close', code => {
      if (ws !== socket) return
      ws = null
      ready = false
      connectionInfo = null
      rejectPending('连接断开')
      if (!closing) log.warn(`后台连接断开 code=${code}，等待自动重连`)
    })
    socket.on('error', err => log.err('WebSocket 连接异常:', err.message))
  }

  function listen() {
    if (wss) return Promise.resolve()
    closing = false
    return new Promise((resolve, reject) => {
      const server = new WebSocketServer({
        host,
        port,
        path,
        verifyClient: ({ req }, done) => {
          if (requestToken(req) === token) done(true)
          else done(false, 401, 'Invalid token')
        },
      })
      wss = server
      server.on('connection', handleConnection)
      server.once('listening', () => {
        log.info(`反向 WebSocket 服务已监听 ws://${host}:${port}${path}`)
        resolve()
      })
      server.once('error', err => {
        if (!server.address()) wss = null
        reject(err)
      })
    })
  }

  function waitForConnection(timeoutMs = 0) {
    if (ready) return Promise.resolve(connectionInfo)
    if (closing) return Promise.reject(new Error('反向 WebSocket 服务已关闭'))
    return new Promise((resolve, reject) => {
      const waiter = { resolve, reject, timer: null }
      if (timeoutMs > 0) {
        waiter.timer = setTimeout(() => {
          connectionWaiters.delete(waiter)
          reject(new Error(`等待后台连接超时 (${timeoutMs}ms)`))
        }, timeoutMs)
      }
      connectionWaiters.add(waiter)
    })
  }

  function call(action, params, resultMessage = '', resultData = true, timeoutMs = 30000) {
    if (!ready || !ws || ws.readyState !== WebSocket.OPEN) {
      return Promise.reject(new Error('萌卡NT 后台尚未建立反向 WebSocket 连接'))
    }
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

  function on(eventType, fn) {
    if (!EVENTS.includes(eventType)) return
    listeners[eventType] = fn
  }

  function close() {
    closing = true
    ready = false
    rejectPending('服务已关闭')
    for (const waiter of connectionWaiters) {
      clearTimeout(waiter.timer)
      waiter.reject(new Error('反向 WebSocket 服务已关闭'))
    }
    connectionWaiters.clear()
    if (ws) ws.close(1000, 'server shutdown')
    ws = null
    connectionInfo = null
    if (!wss) return Promise.resolve()
    const server = wss
    wss = null
    return new Promise(resolve => server.close(() => resolve()))
  }

  const api = { on, listen, waitForConnection, close }
  Object.defineProperty(api, 'connected', { enumerable: true, get: () => ready })

  for (const [apiName, def] of Object.entries(apiDefs)) {
    api[apiName] = (...args) => {
      const params = def.build(...args)
      if (def.wait) return call(apiName, params, def.resultMessage, def.resultData !== false, def.timeout)
      _send({ type: 'action', action: apiName, params })
    }
  }

  return api
}
