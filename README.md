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

运行前在 `index.js` 中填写管理后台配置的主机和端口，并通过 `MENGKA_SERVICE_TOKEN` 环境变量提供服务令牌。

## 反向 WebSocket

插件监听 WebSocket 地址，萌卡NT主动连接插件：

```bash
cd 反向WebSocket/Node.js
npm install
npm start
```

运行前通过 `MENGKA_SERVICE_TOKEN` 环境变量提供服务令牌，并在萌卡NT管理后台配置对应的 WebSocket 地址。

## API 与事件

`sdk.js` 负责连接、事件分发和 API 调用封装。API 参数、返回值、消息段和事件结构请查看萌卡NT文档站。

正向与反向 SDK 暴露相同的 API 和事件，仅连接方向与初始化方法不同。

设置好友备注：`await api.set_friend_remark(self_id, platform, user_id, remark)`。`remark` 必须是字符串；传 `''` 清除备注，不可省略或传 `null`。

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
  sender_id,
  red_packet, // 收到的 red_packet 消息段的 data，需包含 listid 和 title
  file_path,
)
```

`sender_id` 是发红包人的 QQ 号。`file_path` 支持后端本地路径、`file://`、后端可访问的 HTTP(S) 地址，以及 `base64://` / Base64 data URL。音频支持 MP3、WAV 和 QQ Silk。SDK 等待超时为 5 分钟。

完整 API 请求按 UTF-8 计算最多 4 MiB，SDK 会在发送前拒绝超限请求并保留连接。Base64 也计入上限，3 MiB 原始音频加上请求字段后就会超限；较大音频请使用文件地址。自定义客户端直接发送超限请求会导致连接关闭（关闭码 `1009`）。

匹配成功返回 `{ status: 1, voice_rate_id: '...', matched: true }`。将 `voice_rate_id` 原样传给领取接口；匹配未通过时 `matched` 为 `false`，不能继续领取。调用失败时抛出错误。

## 群聊语音红包专用领取

```js
const match = await api.upload_red_packet_voice(self_id, platform, sender_id, red_packet, file_path)
if (match.matched) {
  const voice = await api.upload_group_voice(self_id, platform, group_id, file_path)
  await api.send_group_msg(self_id, platform, group_id, [voice])
  const result = await api.grab_group_voice_red_packet(
    self_id, platform, group_id, sender_id, red_packet, match.voice_rate_id,
  )
  console.log(result)
}
```

`red_packet` 使用收到的红包消息段 `data`，需包含 `listid`、`authkey` 和 `channel: 65536`。`voice_rate_id` 必须使用该红包匹配成功返回的值；超时为 60 秒，检查领取结果的 `retcode` 判断是否成功。

`upload_group_voice` 返回的语音消息段需在 2 分钟内发送到上传时指定的群。图片和视频的发送标识也有 2 分钟使用期限，超时或萌卡NT重启后需重新上传。

通用 `grab_red_packet` 遇到 `channel=65536` 时会抛出“群聊语音红包请使用 grab_group_voice_red_packet 专用 API 领取”。文字口令和其他红包仍按原接口调用。

### 实测

1. 使用包含 `upload_red_packet_voice` 和 `grab_group_voice_red_packet` 的新版后端，重启后确认目标账号在线，正向 WebSocket 插件服务已启用，群消息事件可接收。
2. 准备大于 0.5 秒的清晰录音，例如朗读“恭喜发财”。音频路径必须能由后端读取。
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

## 返回字段约定

正向与反向 SDK 直接返回后端业务数据。更新后端时需同步更新调用代码中的字段读取：

- 好友、群成员、用户资料使用 `user_id`，当前账号及扫码登录结果使用 `self_id`。
- 群人数上限使用 `max_member_count`，当前人数仍为 `member_count`。
- 名片点赞总数使用 `like_count`，当前 Bot 已对目标用户点赞次数为 `sent_like_count`，仍可点赞次数为 `available_like_count`。
- 名片其他字段使用下划线命名，例如 `group_name`、`group_nick`、`photo_count`、`status_text`；返回业务资料字段以 API 文档为准。
- 群通知的 `presentation` 中，人员使用 `user_id`，群聊使用 `group_id`；被移出成员和标题字段为 `outed_member`、`nav_title`。

不提供旧字段别名。

## 用户资料与点赞

正向与反向 SDK 均提供以下方法：

```js
const me = await api.get_user_profile(self_id, platform)
const profile = await api.get_user_profile(self_id, platform, user_id)
const result = await api.like_user_profile(self_id, platform, user_id, 1)
const sent = await api.get_sent_profile_likes(self_id, platform)
const received = await api.get_received_profile_likes(self_id, platform)

if (sent.next_mid !== '-1') {
  if (typeof sent.next_mid !== 'string' || !/^\d+$/.test(sent.next_mid)) {
    throw new Error('分页游标无法安全使用')
  }
  const nextPage = await api.get_sent_profile_likes(self_id, platform, 30, sent.next_mid)
}
```

两个列表方法的参数顺序为 `self_id, platform, page_size = 30, next_mid = '0'`，返回 `{ likes, next_mid }`。`likes` 中每项包含 `user_id`、`nickname`、`time`、`like_count`、`available_like_count`。`time` 使用 Unix 秒；`like_count` 按列表方向表示发出或收到的次数，`available_like_count` 始终表示当前 Bot 仍可对该用户点赞的次数。

`page_size` 的自定义范围为 `1`～`53`，省略时为 `30`，超出范围或传 `null` 报错。`next_mid` 为非负十进制整数字符串，首次传 `"0"`；响应中 `"-1"` 表示结束，不要将游标转为 number。没有记录时 `likes` 为 `[]`。

上述方法使用统一的新 API 名称，不提供旧名称别名。

客户端配置使用 `get_client_profile_list()` 返回项目的 `id`，账号参数名为 `client_profile_id`。客户端列表只返回 `id`、`name`、`platform`、`version`，设备列表只返回 `id`、`name`。

合并转发使用 `upload_group_forward_msg` 上传内容，再将结果中的 `message` 交给 `send_group_msg` 发送；群打卡使用 `sign_group`。凭据接口为 `get_client_key`、`get_ps_key`，分别返回 `client_key`、`ps_key`。

红包请求保留嵌套 `red_packet` 对象。普通红包领取前必须取得 `claim_token`：可先调用 `get_red_packet_info`，再将返回的 token 作为 `grab_red_packet` 的第 6 个参数传入；省略时后端会自动预查询，拿不到有效 token 就报错，不会继续领取。文字口令红包不使用该参数。群邀请的消息序号参数为 `msg_seq`，群 @ 消息段使用 `{ type: 'at', data: { user_id: 123456789 } }`，@ 全体使用 `user_id: 'all'`。

文字口令红包先发送口令，再将发送结果的 `client_seq` 和 `msg_random` 分别填入 `red_packet.client_seq` 和 `red_packet.msg_random`。旧领取参数 `red_packet.msg_seq` 已移除，不提供兼容；发送结果的 `msg_seq` 继续用于撤回消息。
