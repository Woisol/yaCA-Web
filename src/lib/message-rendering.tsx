export type MessageRenderMode = 'markdown' | 'html';

export function getMessageRenderMode(text: string): MessageRenderMode {
  return /^\s*<!doctype html>/i.test(text) ? 'html' : 'markdown';
}

export function createSandboxedHtmlDocument(html: string): string {
  const body = html.trim();
  const csp = "default-src 'none'; img-src data: blob:; style-src 'unsafe-inline'; font-src data:; media-src data:; connect-src 'none';";
  const meta = `<meta http-equiv="Content-Security-Policy" content="${escapeHtmlAttribute(csp)}">`;

  if (/^\s*<!doctype html>/i.test(body)) {
    if (/<head[^>]*>/i.test(body)) {
      return body.replace(/<head([^>]*)>/i, `<head$1>${meta}`);
    }
    if (/<html[^>]*>/i.test(body)) {
      return body.replace(/<html([^>]*)>/i, `<html$1><head>${meta}<meta charset="utf-8"></head>`);
    }
    return body;
  }

  return `<!doctype html><html><head><meta charset="utf-8">${meta}</head><body>${body}</body></html>`;
}

function escapeHtmlAttribute(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}
