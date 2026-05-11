import type { AppendMessage, ThreadMessage } from '@assistant-ui/react';
import type { ChatMessage } from '@yaca/ui/chat/types.js';

export function toThreadMessages(messages: ChatMessage[], cwd = getDefaultCwd()): ThreadMessage[] {
  return messages.map((message, index) => {
    const displayMessage = reduceDisplayMessage(message, cwd);
    const id = `${index}-${message.kind}-${message.callId ?? ''}`;
    const createdAt = new Date(index);
    if (message.kind === 'user') {
      return {
        id,
        role: 'user',
        createdAt,
        content: [{ type: 'text', text: displayMessage.text ?? '' }],
        attachments: [],
        metadata: { custom: { yaca: displayMessage } }
      };
    }
    if (message.kind === 'assistant') {
      return createAssistantThreadMessage(id, createdAt, displayMessage.text ?? '', displayMessage);
    }
    if (message.kind === 'tool') {
      return createAssistantThreadMessage(id, createdAt, formatToolMessage(displayMessage), displayMessage);
    }
    return createAssistantThreadMessage(id, createdAt, displayMessage.text ?? '', displayMessage);
  });
}

export function appendMessageText(message: AppendMessage): string {
  return message.content
    .map((part) => part.type === 'text' ? part.text : '')
    .filter(Boolean)
    .join('\n\n');
}

function createAssistantThreadMessage(id: string, createdAt: Date, text: string, source: ChatMessage): ThreadMessage {
  return {
    id,
    role: 'assistant',
    createdAt,
    content: [{ type: 'text', text }],
    status: source.kind === 'tool' && source.status === 'running'
      ? { type: 'running' }
      : source.kind === 'error' || source.status === 'error'
        ? { type: 'incomplete', reason: 'error', error: text }
        : { type: 'complete', reason: 'stop' },
    metadata: {
      unstable_state: null,
      unstable_annotations: [],
      unstable_data: [],
      steps: [],
      custom: { yaca: source }
    }
  };
}

function formatToolMessage(message: ChatMessage): string {
  const args = message.args ? JSON.stringify(message.args, null, 2) : '';
  const result = message.result ? `\n\n${message.result}` : '';
  return `${message.toolName ?? 'tool'} ${message.status ?? 'running'}\n${args}${result}`;
}

function reduceDisplayMessage(message: ChatMessage, cwd?: string): ChatMessage {
  return {
    ...message,
    text: message.text === undefined ? undefined : reduceDisplayFileBlocks(message.text, cwd),
    result: message.result === undefined ? undefined : reduceDisplayFileBlocks(message.result, cwd)
  };
}

// 为了避免 Node-only node:path 进入浏览器，我会把 Web 显示压缩函数局部化：只做前端展示需要的 “取文件路径 basename / 项目相对路径近似” 逻辑，并移除刚加的 @yaca/utils app 路径。回溯恢复仍然走后端共享函数。
function reduceDisplayFileBlocks(rawMessage: string, cwd?: string): string {
  const filePattern = /\n\n\[File: (.+?)\]\n[\s\S]*?\[End of File\]\n\n/g;
  const imagePattern = /\n\n\[Image: (.+?)\]\n\[End of Image\]\n\n/g;
  return rawMessage.replace(filePattern, (_match, filePath: string) => {
    return `[File:${toDisplayPath(filePath, cwd)}]`;
  }).replace(imagePattern, (_match, filePath: string) => {
    return `[Image:${toDisplayPath(filePath, cwd)}]`;
  });
}

function toDisplayPath(filePath: string, cwd?: string): string {
  const trimmed = filePath.trim();
  if (!cwd) return trimmed;
  const displaySeparator = trimmed.includes('\\') ? '\\' : '/';
  const normalizedPath = normalizePath(trimmed);
  const normalizedCwd = normalizePath(cwd).replace(/\/+$/, '');
  const pathForCompare = normalizedPath.toLowerCase();
  const cwdForCompare = normalizedCwd.toLowerCase();
  if (!pathForCompare.startsWith(`${cwdForCompare}/`)) return trimmed;
  return normalizedPath.slice(normalizedCwd.length + 1).replaceAll('/', displaySeparator);
}

function normalizePath(value: string): string {
  return value.trim().replaceAll('\\', '/').replace(/\/+/g, '/');
}

function getDefaultCwd(): string | undefined {
  return typeof process !== 'undefined' ? process.cwd() : undefined;
}
