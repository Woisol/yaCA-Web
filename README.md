# yaCA-Web
<p align="center">
    <a href="https://linux.do" alt="LINUX DO">
        <img
            src="https://img.shields.io/badge/LINUX-DO-FFB003.svg?logo=data:image/svg%2bxml;base64,DQo8c3ZnIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgd2lkdGg9IjEwMCIgaGVpZ2h0PSIxMDAiPjxwYXRoIGQ9Ik00Ni44Mi0uMDU1aDYuMjVxMjMuOTY5IDIuMDYyIDM4IDIxLjQyNmM1LjI1OCA3LjY3NiA4LjIxNSAxNi4xNTYgOC44NzUgMjUuNDV2Ni4yNXEtMi4wNjQgMjMuOTY4LTIxLjQzIDM4LTExLjUxMiA3Ljg4NS0yNS40NDUgOC44NzRoLTYuMjVxLTIzLjk3LTIuMDY0LTM4LjAwNC0yMS40M1EuOTcxIDY3LjA1Ni0uMDU0IDUzLjE4di02LjQ3M0MxLjM2MiAzMC43ODEgOC41MDMgMTguMTQ4IDIxLjM3IDguODE3IDI5LjA0NyAzLjU2MiAzNy41MjcuNjA0IDQ2LjgyMS0uMDU2IiBzdHlsZT0ic3Ryb2tlOm5vbmU7ZmlsbC1ydWxlOmV2ZW5vZGQ7ZmlsbDojZWNlY2VjO2ZpbGwtb3BhY2l0eToxIi8+PHBhdGggZD0iTTQ3LjI2NiAyLjk1N3EyMi41My0uNjUgMzcuNzc3IDE1LjczOGE0OS43IDQ5LjcgMCAwIDEgNi44NjcgMTAuMTU3cS00MS45NjQuMjIyLTgzLjkzIDAgOS43NS0xOC42MTYgMzAuMDI0LTI0LjM4N2E2MSA2MSAwIDAgMSA5LjI2Mi0xLjUwOCIgc3R5bGU9InN0cm9rZTpub25lO2ZpbGwtcnVsZTpldmVub2RkO2ZpbGw6IzE5MTkxOTtmaWxsLW9wYWNpdHk6MSIvPjxwYXRoIGQ9Ik03Ljk4IDcwLjkyNmMyNy45NzctLjAzNSA1NS45NTQgMCA4My45My4xMTNRODMuNDI2IDg3LjQ3MyA2Ni4xMyA5NC4wODZxLTE4LjgxIDYuNTQ0LTM2LjgzMi0xLjg5OC0xNC4yMDMtNy4wOS0yMS4zMTctMjEuMjYyIiBzdHlsZT0ic3Ryb2tlOm5vbmU7ZmlsbC1ydWxlOmV2ZW5vZGQ7ZmlsbDojZjlhZjAwO2ZpbGwtb3BhY2l0eToxIi8+PC9zdmc+" /></a>
            </a>
</p>

`@woisol-g/yaca-web` 是 yaCA 的 Web UI 包。它提供一个本地 HTTP/WebSocket 服务和 React 前端，用于在浏览器中使用 yaCA runtime、管理 workspace 会话、发送多模态输入，并渲染 Markdown 与 HTML-first LLM 输出。

## 使用方式

在已安装 `@woisol-g/yaca` 的前提下安装 Web 包：

```bash
pnpm i -g @woisol-g/yaca-web
yaca --serve 3000
```

本仓库开发模式：

```bash
pnpm install
pnpm dev:web
```

或单独构建 Web 包：

```bash
pnpm --filter @woisol-g/yaca-web run build
```

## 功能概览

- 与 yaCA CLI 共用 `SessionStore`、配置、工具 registry 和工具权限控制。
- 原生 History API session 路由，路径格式为 `/:sessionId`。
- 会话侧边栏支持创建、选择、重命名和软删除。
- 新会话发送首条消息后会自动用消息内容重命名。
- 支持 Markdown、GFM、代码高亮和工具调用卡片。
- 支持拖拽文本文件和图片到输入区。
- 支持 trust mode、工具 allow-list 和工具确认弹窗。
- 支持 HTML-first 输出：模型可直接输出 `<body>...</body>` 内容，由 iframe 安全渲染。

## 服务端接口

Web 包导出：

```ts
import { startYacaWebServer } from '@woisol-g/yaca-web/server.js';
```

CLI 中通过 `yaca --serve <port>` 动态加载该包。服务端由 Node `http` + `ws` 实现，静态资源默认从 Web 包的 `dist` 目录读取，非 API 路径会 fallback 到 `index.html`，因此 `/:sessionId` 可直接刷新。

主要 REST API：

```text
GET    /api/sessions
POST   /api/sessions
GET    /api/sessions/:id
PATCH  /api/sessions/:id
DELETE /api/sessions/:id
GET    /api/sessions/:id/messages
POST   /api/sessions/:id/rewind
GET    /api/config
PATCH  /api/config
GET    /api/tools
POST   /api/tools/allow
```

WebSocket 用于发送对话、流式接收消息、同步 session 列表、配置变更和工具确认请求。

## 会话管理

会话数据仍由 yaCA core 管理，按 workspace hash 存储。Web 删除和 CLI `/delete` 一样是软删除：只把 session 从当前 workspace 的 `meta.json` 中移除，不删除磁盘上的会话目录。

侧边栏行为：

- `New session` 创建空会话并进入 `/:sessionId`。
- 点击会话加载历史消息并 push history。
- 重命名按钮会把会话标题从 `span` 切换为 `input`。
- `Enter` 确认重命名，`Esc` 取消。
- 删除按钮弹出确认框；确认后软删除会话。
- 删除当前会话会清空当前消息并回到 `/`。

## HTML-first 输出协议

当回答适合结构化展示时，yaCA Web 会鼓励模型输出 body-only HTML：

```html
<body>
  <h2>Plan</h2>
  <div class="steps">
    <div class="step">Read context</div>
    <div class="step">Patch code</div>
    <div class="step">Run tests</div>
  </div>
</body>
```

重要约束：

- 只输出 `<body>...</body>`，不要输出 `<!doctype>`、`<html>`、`<head>`、`<style>`、`<script>`。
- 不依赖 inline style 或自定义 CSS。
- 低重要性内容适合放进 `details.collapse`。
- 关联内容适合用 `.col-con`、`.tabs`、`.steps` 提高信息密度。

可用预设：

```text
note-info, note-success, note-warning, note-danger
details.collapse
.tabs > .tab[data-label]
.col-con with .col-1/.col-2/...
.steps > .step
tag-blue, tag-green, tag-yellow, tag-red
tag-bg-blue, tag-bg-green, tag-bg-yellow, tag-bg-red
```

## iframe 渲染策略

HTML-first 内容在 sandboxed iframe 中渲染：

- iframe shell 只初始化一次，后续通过 `postMessage` 更新 body payload，避免流式阶段反复重建 iframe。
- 流式阶段使用轻量 HTML payload，最终阶段异步加载完整代码高亮分包。
- iframe 内使用 `ResizeObserver` 上报高度，父页面自适应 iframe 高度。
- 父页面主题通过 `postMessage` 同步到 iframe，iframe 内支持 dark/light 配色。
- CSP 禁止外部脚本和网络连接，模型输出中的 `script`、`style`、事件属性和不安全 URL 会被过滤。

## 开发命令

```bash
pnpm --filter @woisol-g/yaca-web run build
pnpm --filter @woisol-g/yaca-web run dev
pnpm --filter @woisol-g/yaca-web run preview
```

根仓库常用校验：

```bash
pnpm run typecheck
pnpm test
pnpm run build
```

## 友链

* Linux Do：https://linux.do