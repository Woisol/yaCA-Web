import { LLM_HTML_INTERACTION_SCRIPT, LLM_HTML_STYLES } from '@woisol-g/llm-html';

export type MessageRenderMode = 'markdown' | 'html';

export function getMessageRenderMode(text: string): MessageRenderMode {
  return /^\s*<!doctype html>/i.test(text) ? 'html' : 'markdown';
}

export function createSandboxedHtmlDocument(html: string): string {
  const body = stripScripts(html.trim());
  const headInjection = createHeadInjection();

  if (/^\s*<!doctype html>/i.test(body)) {
    if (/<head[^>]*>/i.test(body)) {
      return body.replace(/<head([^>]*)>/i, `<head$1>${headInjection}`);
    }
    if (/<html[^>]*>/i.test(body)) {
      return body.replace(/<html([^>]*)>/i, `<html$1><head>${headInjection}</head>`);
    }
    return body.replace(/^\s*<!doctype html>/i, `<!doctype html><html><head>${headInjection}</head><body>`).concat('</body></html>');
  }

  return `<!doctype html><html><head>${headInjection}</head><body>${body}</body></html>`;
}

function createHeadInjection(): string {
  const csp = "default-src 'none'; img-src data: blob:; style-src 'unsafe-inline'; script-src 'unsafe-inline'; font-src data:; media-src data:; connect-src 'none'; base-uri 'none'; form-action 'none';";
  return [
    '<meta charset="utf-8">',
    `<meta http-equiv="Content-Security-Policy" content="${escapeHtmlAttribute(csp)}">`,
    `<style data-yaca-llm-html-style>${LLM_HTML_STYLES}</style>`,
    `<script data-yaca-llm-html-runtime>${LLM_HTML_INTERACTION_SCRIPT}</script>`
  ].join('');
}

function stripScripts(html: string): string {
  return html.replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, '');
}

function escapeHtmlAttribute(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}
