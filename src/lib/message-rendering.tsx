import type { ReactNode } from 'react';

export type MessageRenderMode = 'markdown' | 'html';

export type MarkdownBlock =
  | { type: 'heading'; level: 1 | 2 | 3 | 4 | 5 | 6; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'list'; ordered: boolean; items: string[] }
  | { type: 'code'; language?: string; text: string };

export function getMessageRenderMode(text: string): MessageRenderMode {
  return /^\s*<!doctype html>/i.test(text) ? 'html' : 'markdown';
}

// woc 你 tm 手拼 md 渲染的啊？？？
export function parseMarkdownBlocks(text: string): MarkdownBlock[] {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const blocks: MarkdownBlock[] = [];
  let cursor = 0;

  while (cursor < lines.length) {
    const line = lines[cursor] ?? '';
    if (!line.trim()) {
      cursor += 1;
      continue;
    }

    const headingMatch = /^(#{1,6})\s+(.*)$/.exec(line);
    if (headingMatch) {
      blocks.push({
        type: 'heading',
        level: headingMatch[1].length as MarkdownBlock extends { type: 'heading' } ? 1 | 2 | 3 | 4 | 5 | 6 : never,
        text: headingMatch[2] ?? ''
      });
      cursor += 1;
      continue;
    }

    const fenceMatch = /^```(\w+)?\s*$/.exec(line);
    if (fenceMatch) {
      const language = fenceMatch[1] || undefined;
      const body: string[] = [];
      cursor += 1;
      while (cursor < lines.length && !/^```\s*$/.test(lines[cursor] ?? '')) {
        body.push(lines[cursor] ?? '');
        cursor += 1;
      }
      if (cursor < lines.length) cursor += 1;
      blocks.push({ type: 'code', language, text: body.join('\n') });
      continue;
    }

    const listMatch = /^(\s*)([-*+]|\d+\.)\s+(.*)$/.exec(line);
    if (listMatch) {
      const ordered = /\d+\./.test(listMatch[2] ?? '');
      const items: string[] = [];
      while (cursor < lines.length) {
        const current = lines[cursor] ?? '';
        const currentMatch = /^(\s*)([-*+]|\d+\.)\s+(.*)$/.exec(current);
        if (!currentMatch || (/\d+\./.test(currentMatch[2] ?? '') !== ordered)) break;
        items.push(currentMatch[3] ?? '');
        cursor += 1;
      }
      blocks.push({ type: 'list', ordered, items });
      continue;
    }

    const paragraph: string[] = [line.trim()];
    cursor += 1;
    while (cursor < lines.length) {
      const current = lines[cursor] ?? '';
      if (!current.trim()) break;
      if (/^(#{1,6})\s+/.test(current) || /^```/.test(current) || /^(\s*)([-*+]|\d+\.)\s+/.test(current)) break;
      paragraph.push(current.trim());
      cursor += 1;
    }
    blocks.push({ type: 'paragraph', text: paragraph.join(' ') });
  }

  return blocks;
}

export function renderMarkdownBlocks(blocks: MarkdownBlock[]): ReactNode[] {
  return blocks.map((block, index) => {
    if (block.type === 'heading') {
      const Tag = `h${block.level}` as const;
      return <Tag key={index} className="message-md-heading">{renderInlineMarkdown(block.text)}</Tag>;
    }
    if (block.type === 'list') {
      const ListTag = block.ordered ? 'ol' : 'ul';
      return (
        <ListTag key={index} className="message-md-list">
          {block.items.map((item, itemIndex) => <li key={itemIndex}>{renderInlineMarkdown(item)}</li>)}
        </ListTag>
      );
    }
    if (block.type === 'code') {
      return (
        <pre key={index} className="message-md-code">
          <code>{block.text}</code>
        </pre>
      );
    }
    return <p key={index} className="message-md-paragraph">{renderInlineMarkdown(block.text)}</p>;
  });
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

function renderInlineMarkdown(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let cursor = 0;
  let key = 0;

  while (cursor < text.length) {
    const next = findNextInlineToken(text, cursor);
    if (!next) {
      nodes.push(text.slice(cursor));
      break;
    }

    if (next.index > cursor) {
      nodes.push(text.slice(cursor, next.index));
    }

    if (next.type === 'code') {
      nodes.push(<code key={key++} className="message-md-inline-code">{next.content}</code>);
    } else if (next.type === 'bold') {
      nodes.push(<strong key={key++}>{renderInlineMarkdown(next.content)}</strong>);
    } else if (next.type === 'italic') {
      nodes.push(<em key={key++}>{renderInlineMarkdown(next.content)}</em>);
    } else if (next.type === 'link') {
      nodes.push(<a key={key++} href={sanitizeHref(next.href)} target="_blank" rel="noreferrer">{next.label}</a>);
    }
    cursor = next.end;
  }

  return nodes;
}

type InlineToken =
  | { type: 'code'; index: number; end: number; content: string }
  | { type: 'bold'; index: number; end: number; content: string }
  | { type: 'italic'; index: number; end: number; content: string }
  | { type: 'link'; index: number; end: number; label: string; href: string };

function findNextInlineToken(text: string, startIndex: number): InlineToken | null {
  const candidates: InlineToken[] = [];
  const codeIndex = text.indexOf('`', startIndex);
  if (codeIndex >= 0) {
    const end = text.indexOf('`', codeIndex + 1);
    if (end > codeIndex + 1) {
      candidates.push({ type: 'code', index: codeIndex, end: end + 1, content: text.slice(codeIndex + 1, end) });
    }
  }

  const boldIndex = text.indexOf('**', startIndex);
  if (boldIndex >= 0) {
    const end = text.indexOf('**', boldIndex + 2);
    if (end > boldIndex + 2) {
      candidates.push({ type: 'bold', index: boldIndex, end: end + 2, content: text.slice(boldIndex + 2, end) });
    }
  }

  const italicIndex = findSingleItalicIndex(text, startIndex);
  if (italicIndex >= 0) {
    const end = text.indexOf('*', italicIndex + 1);
    if (end > italicIndex + 1) {
      candidates.push({ type: 'italic', index: italicIndex, end: end + 1, content: text.slice(italicIndex + 1, end) });
    }
  }

  const linkMatch = /\[([^\]]+)\]\(([^)]+)\)/g;
  linkMatch.lastIndex = startIndex;
  const found = linkMatch.exec(text);
  if (found && found.index >= startIndex) {
    candidates.push({
      type: 'link',
      index: found.index,
      end: found.index + found[0].length,
      label: found[1] ?? '',
      href: found[2] ?? ''
    });
  }

  candidates.sort((a, b) => a.index - b.index);
  return candidates[0] ?? null;
}

function findSingleItalicIndex(text: string, startIndex: number): number {
  const index = text.indexOf('*', startIndex);
  if (index < 0) return -1;
  if (text[index + 1] === '*') return findSingleItalicIndex(text, index + 2);
  return index;
}

function sanitizeHref(href: string): string {
  const trimmed = href.trim();
  if (/^(https?:|mailto:|tel:|\/|#)/i.test(trimmed)) return trimmed;
  return '#';
}

function escapeHtmlAttribute(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}
