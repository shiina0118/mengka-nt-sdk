# mengka-nt-sdk

萌卡NT WebSocket 插件的 Node.js SDK 与连接示例，包含正向 WebSocket 和反向 WebSocket 两种接入方式。

## 目录

```text
mengka-nt-sdk/
├─ 正向WebSocket/Node.js/
│  ├─ sdk.js
│  ├─ index.js
│  └─ package.json
└─ 反向WebSocket/Node.js/
   ├─ sdk.js
   ├─ index.js
   └─ package.json
```

## 环境要求

- Node.js 18 或更高版本
- 已在萌卡NT管理后台创建并启用插件服务
- 插件服务令牌

## 正向 WebSocket

插件主动连接萌卡NT提供的 WebSocket 服务：

```bash
cd 正向WebSocket/Node.js
npm install
npm start
```

运行前在 `index.js` 中填写管理后台配置的主机、端口和服务令牌。

## 反向 WebSocket

插件监听 WebSocket 地址，萌卡NT主动连接插件：

```bash
cd 反向WebSocket/Node.js
npm install
npm start
```

运行前在 `index.js` 中填写服务令牌，并在萌卡NT管理后台配置对应的 WebSocket 地址。

## API 与事件

`sdk.js` 负责连接、事件分发和 API 调用封装。API 参数、返回值、消息段和事件结构请查看萌卡NT文档站。

正向与反向 SDK 暴露相同的 API 和事件，仅连接方向与初始化方法不同。

## 注意事项

- 服务令牌不要提交到版本控制。
- 正向 SDK 需要在 `connect()` 前注册事件监听器。
- 反向 SDK 启动后，可通过 `waitForConnection()` 等待萌卡NT接入。

## 语音红包匹配上传

正向和反向 SDK 均支持：

```js
const result = await api.upload_red_packet_voice(
  self_id,
  platform,
  sender_uin,
  red_packet, // 收到的 red_packet 消息段的 data，需包含 listid 和 title
  file_path,
)
```

`sender_uin` 是发红包人的 QQ 号。`file_path` 支持后端本地路径、`file://` 和后端可访问的 HTTP(S) 地址。已有 QQ Silk 文件直接上传，其他音频通过后端现有 FFmpeg 容器转成 Silk。SDK 等待超时为 5 分钟。

匹配成功返回 `{ status: 1, degree: '...', voice_rate_id: '...', matched: true }`。`voice_rate_id` 是服务端返回的 `degree` 原值。匹配未通过返回 `matched: false` 和原始 `status/degree`，`voice_rate_id` 为空；上传、转换或响应解析异常则抛出错误。

## 群聊语音红包专用领取

```js
const match = await api.upload_red_packet_voice(self_id, platform, sender_uin, red_packet, file_path)
if (match.matched) {
  const voice = await api.upload_group_voice(self_id, platform, group_id, file_path)
  await api.send_group_msg(self_id, platform, group_id, [voice])
  const result = await api.grab_group_voice_red_packet(
    self_id, platform, group_id, sender_uin, red_packet, match.voice_rate_id,
  )
  console.log(result)
}
```

`red_packet` 使用收到的红包消息段 `data`，需包含 `listid`、`authkey` 和 `channel: 65536`。`voice_rate_id` 必须使用该红包匹配成功返回的值。此接口不要求 `msg_random`、`msg_seq`、`msg_md5` 或 `pre_grap_token`；超时为 60 秒，返回原始领取结果，检查 `retcode` 判断是否成功。

通用 `grab_red_packet` 遇到 `channel=65536` 时会抛出“群聊语音红包请使用 grab_group_voice_red_packet 专用 API 领取”。文字口令和其他红包仍按原接口调用。

### 实测

1. 使用包含 `upload_red_packet_voice` 和 `grab_group_voice_red_packet` 的新版后端，重启后确认目标账号在线，正向 WebSocket 插件服务已启用，群消息事件可接收。
2. 准备大于 0.5 秒的清晰录音，例如朗读“恭喜发财”。使用 WAV/MP3 时确认 FFmpeg 容器已运行；音频路径必须能由后端读取。
3. 在 PowerShell 中运行：

```powershell
Set-Location 'D:\萌卡NT\mengka-nt-sdk\正向WebSocket\Node.js'
$env:MENGKA_TOKEN = '后台插件服务令牌'
$env:MENGKA_SELF_ID = '321617964'
$env:MENGKA_GROUP_ID = '545309474'
$env:MENGKA_PLATFORM = 'android'
$env:MENGKA_WS_HOST = '127.0.0.1'
$env:MENGKA_WS_PORT = '3001'
node .\red_packet_voice_test.js 'D:\voices\answer.wav'
```

4. 看到“等待群…的新语音红包”后，用另一个 QQ 在目标群发送一个新语音红包，口令设为录音中的原文。脚本会提取红包 ID 和发送者，调用匹配上传 API 并打印结果。
5. 正向用例应得到 `status: 1`、`matched: true`、非空且相等的 `degree/voice_rate_id`。再用错误口令录音和一个新红包测试，检查服务端是否返回 `matched: false`。每次测试后脚本退出，重测时重新运行。

默认脚本只测试上传与匹配。完整领取测试使用 WAV/MP3 录音，运行前设置：

```powershell
$env:MENGKA_TEST_GRAB = '1'
node .\red_packet_voice_test.js 'D:\voices\answer.wav'
```

收到一个新红包后，脚本依次验证匹配通过、通用入口提示专用 API、向群内发送录音、调用专用领取 API。最终期望 `[领取结果]` 的 `retcode` 为 `0`。匹配失败时不会继续发送或领取。

测试只上传匹配时设置 `$env:MENGKA_TEST_GRAB = '0'`。测试缺失证明的校验时，可调用专用 API 并传空 `voice_rate_id`，应得到“请先调用 upload_red_packet_voice 并确认 matched=true”，不会发起领取请求。
