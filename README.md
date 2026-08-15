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
