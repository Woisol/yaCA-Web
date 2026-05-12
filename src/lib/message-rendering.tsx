import { createLlmHtmlDocument } from '@woisol-g/llm-html';

export type MessageRenderMode = 'markdown' | 'html';

export function getMessageRenderMode(text: string): MessageRenderMode {
  return /^\s*<!doctype html>/i.test(text) ? 'html' : 'markdown';
}

export function createSandboxedHtmlDocument(html: string): string {
  return createLlmHtmlDocument(html);
}
