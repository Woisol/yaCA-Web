import { createLlmHtmlPayload, createLlmHtmlShellDocument, LLM_HTML_MESSAGE_CHANNEL, type LlmHtmlPayloadMode } from '@woisol-g/llm-html';

export type MessageRenderMode = 'markdown' | 'html';

export function getMessageRenderMode(text: string): MessageRenderMode {
  return /^\s*<body\b/i.test(text) ? 'html' : 'markdown';
}

export function createSandboxedHtmlShell(options: { frameId: string; token: string }): string {
  return createLlmHtmlShellDocument(options);
}

export function createSandboxedHtmlPayload(html: string, mode: LlmHtmlPayloadMode): string {
  return createLlmHtmlPayload(html, { mode });
}

export { LLM_HTML_MESSAGE_CHANNEL };
