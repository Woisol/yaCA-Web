import type { MessagePart } from '@yaca/types';

export type DroppedMessage = {
  text: string;
  content: string | MessagePart[];
  fileCount: number;
};

export type DroppedPayload = Pick<DroppedMessage, 'text' | 'content'>;

const textFilePattern = /^(text\/|application\/(json|xml|javascript|typescript|x-javascript|x-typescript|yaml|x-yaml|toml|sql))/;
const textExtensions = new Set([
  '.c',
  '.cc',
  '.config',
  '.cpp',
  '.cs',
  '.css',
  '.csv',
  '.env',
  '.go',
  '.h',
  '.html',
  '.java',
  '.js',
  '.json',
  '.jsx',
  '.log',
  '.md',
  '.mjs',
  '.py',
  '.rs',
  '.sql',
  '.svg',
  '.toml',
  '.ts',
  '.tsx',
  '.txt',
  '.xml',
  '.yaml',
  '.yml'
]);

export async function droppedFilesToMessage(files: File[]): Promise<DroppedMessage> {
  const parts: MessagePart[] = [];
  for (const file of files) {
    const path = displayPath(file);
    if (file.type.startsWith('image/')) {
      parts.push({
        type: 'image_url',
        image_url: { url: await readAsDataUrl(file) },
        meta: { path }
      });
      continue;
    }

    if (isTextFile(file)) {
      parts.push({ type: 'text', text: await readTextFilePart(file, path) });
      continue;
    }

    parts.push({ type: 'text', text: `\n\n[File: ${path}]\nUnsupported dropped file type: ${file.type || 'unknown'}\n[End of File]\n\n` });
  }

  const merged = mergeTextParts(parts);
  return {
    text: merged.map(formatPreviewPart).join(''),
    content: merged.every((part) => part.type === 'text') ? merged.map((part) => part.text).join('') : merged,
    fileCount: files.length
  };
}

export function mergePromptWithDropped(prompt: string, dropped: DroppedPayload): DroppedPayload {
  const normalizedPrompt = prompt.trim();
  if (!normalizedPrompt) {
    return dropped;
  }

  const textPrefix = joinPromptPrefix(normalizedPrompt, dropped.text);
  const text = `${textPrefix}${dropped.text}`;
  if (typeof dropped.content === 'string') {
    return {
      text,
      content: `${textPrefix}${dropped.content}`
    };
  }

  const content = [...dropped.content];
  if (content[0]?.type === 'text') {
    content[0] = { ...content[0], text: `${joinPromptPrefix(normalizedPrompt, content[0].text)}${content[0].text}` };
  } else {
    content.unshift({ type: 'text', text: `${normalizedPrompt}\n\n` });
  }

  return { text, content };
}

export function mergeDroppedMessages(current: DroppedMessage, incoming: DroppedMessage): DroppedMessage {
  const mergedParts = mergeTextParts([...toMessageParts(current.content), ...toMessageParts(incoming.content)]);
  return {
    text: `${current.text}${incoming.text}`,
    content: mergedParts.every((part) => part.type === 'text') ? mergedParts.map((part) => part.text).join('') : mergedParts,
    fileCount: current.fileCount + incoming.fileCount
  };
}

function joinPromptPrefix(prompt: string, nextText: string): string {
  return nextText.startsWith('\n') ? prompt : `${prompt}\n\n`;
}

function displayPath(file: File): string {
  return file.webkitRelativePath || file.name;
}

function isTextFile(file: File): boolean {
  if (textFilePattern.test(file.type)) return true;
  const extension = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
  return textExtensions.has(extension);
}

async function readTextFilePart(file: File, path: string): Promise<string> {
  return `\n\n[File: ${path}]\n${await file.text()}\n[End of File]\n\n`;
}

function readAsDataUrl(file: File): Promise<string> {
  return file.arrayBuffer().then((buffer) => {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (const byte of bytes) {
      binary += String.fromCharCode(byte);
    }
    const base64 = btoa(binary);
    const mime = file.type || 'application/octet-stream';
    return `data:${mime};base64,${base64}`;
  });
}

function mergeTextParts(parts: MessagePart[]): MessagePart[] {
  const merged: MessagePart[] = [];
  for (const part of parts) {
    const previous = merged.at(-1);
    if (part.type === 'text' && previous?.type === 'text') {
      previous.text += part.text;
    } else {
      merged.push(part);
    }
  }
  return merged;
}

function toMessageParts(content: string | MessagePart[]): MessagePart[] {
  if (typeof content === 'string') {
    return content ? [{ type: 'text', text: content }] : [];
  }
  return [...content];
}

function formatPreviewPart(part: MessagePart): string {
  if (part.type === 'text') return part.text;
  return `\n\n[Image:${part.meta?.path ?? 'dropped image'}]\n\n`;
}
