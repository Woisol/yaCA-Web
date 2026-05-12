import { isValidElement, type ComponentPropsWithoutRef, type ReactElement, type ReactNode } from 'react';
import { MessagePrimitive, ThreadPrimitive, useMessage } from '@assistant-ui/react';
import { RotateCcw } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import type { ChatMessage } from '../../api/types.js';
import { createSandboxedHtmlDocument, getMessageRenderMode } from '../../lib/message-rendering.js';
import './ThreadView.css';

type ThreadViewProps = {
  onRewind(index: number): void;
};

export function ThreadView({ onRewind }: ThreadViewProps) {
  return (
    <ThreadPrimitive.Root className="thread-root">
      <ThreadPrimitive.Viewport className="thread-viewport">
        <ThreadPrimitive.Empty>
          <div className="empty-thread">
            <strong>YACA Web ready.</strong>
            <span>Start a session or resume one from the sidebar.</span>
          </div>
        </ThreadPrimitive.Empty>
        <ThreadPrimitive.Messages components={{ Message: () => <ChatBubble onRewind={onRewind} /> }} />
      </ThreadPrimitive.Viewport>
    </ThreadPrimitive.Root>
  );
}

function ChatBubble({ onRewind }: ThreadViewProps) {
  const message = useMessage();
  const source = readYacaMessage(message?.metadata.custom.yaca);

  return (
    <MessagePrimitive.Root className="message">
      <MessagePrimitive.If user>
        <button className="rewind-chat" type="button" onClick={() => onRewind(message.index)}>
          <RotateCcw size={13} /> 回溯到这里
        </button>
        <RenderedMessageBubble className="message-bubble user" text={source?.text ?? ''} />
      </MessagePrimitive.If>
      <MessagePrimitive.If assistant>
        {source?.kind === 'tool' ? <ToolCard message={source} /> : <RenderedMessageBubble className="message-bubble assistant" text={source?.text ?? ''} />}
      </MessagePrimitive.If>
    </MessagePrimitive.Root>
  );
}

function RenderedMessageBubble({ className, text }: { className: string; text: string }) {
  if (getMessageRenderMode(text) === 'html') {
    return (
      <div className={`${className} html-bubble`}>
        <iframe className="message-html-frame" sandbox="" srcDoc={createSandboxedHtmlDocument(text)} title="HTML preview" />
      </div>
    );
  }

  return (
    <div className={`${className} markdown-bubble`}>
      <ReactMarkdown
        components={{
          a: MarkdownLink,
          code: MarkdownCode,
          pre: MarkdownPre
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}

function MarkdownLink({ href, children, ...props }: ComponentPropsWithoutRef<'a'>) {
  return (
    <a href={sanitizeMarkdownHref(href)} target="_blank" rel="noreferrer" {...props}>
      {children}
    </a>
  );
}

function MarkdownCode({ className, children, ...props }: ComponentPropsWithoutRef<'code'>) {
  return (
    <code className={className ?? 'message-md-inline-code'} {...props}>
      {children}
    </code>
  );
}

function MarkdownPre({ children, ...props }: ComponentPropsWithoutRef<'pre'>) {
  const code = getCodeElement(children);
  const className = code?.props.className;
  const language = getCodeLanguage(className);
  if (code && language) {
    return (
      <SyntaxHighlighter
        PreTag="pre"
        className="message-md-code message-md-highlight"
        codeTagProps={{ className: 'message-md-code-tag' }}
        customStyle={{ margin: 0 }}
        language={language}
        style={oneDark}
      >
        {toText(code.props.children).replace(/\n$/, '')}
      </SyntaxHighlighter>
    );
  }

  return (
    <pre className="message-md-code" {...props}>
      {children}
    </pre>
  );
}

type CodeElementProps = {
  className?: string;
  children?: ReactNode;
};

function getCodeElement(children: ReactNode): ReactElement<CodeElementProps> | null {
  if (isValidElement<CodeElementProps>(children) && children.type === 'code') {
    return children;
  }
  if (Array.isArray(children) && children.length === 1 && isValidElement<CodeElementProps>(children[0]) && children[0].type === 'code') {
    return children[0];
  }
  return null;
}

function getCodeLanguage(className?: string): string | null {
  const match = /(?:^|\s)language-([^\s]+)/.exec(className ?? '');
  return match?.[1]?.toLowerCase() ?? null;
}

function toText(value: ReactNode): string {
  if (value === null || value === undefined || typeof value === 'boolean') return '';
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  if (Array.isArray(value)) return value.map(toText).join('');
  return '';
}

function sanitizeMarkdownHref(href?: string): string {
  const trimmed = href?.trim() ?? '';
  if (/^(https?:|mailto:|tel:|\/|#)/i.test(trimmed)) return trimmed;
  return '#';
}

function ToolCard({ message }: { message: ChatMessage }) {
  const status = message.status ?? 'running';
  const output = message.result ?? '';
  const title = message.orphan ? 'tool_result' : `${message.toolName ?? 'tool'}(${formatToolArgsInline(message.args)})`;

  return (
    <details className={`message-bubble assistant bubble-card tool-card ${message.orphan ? 'orphan-result' : ''}`} open={message.expanded}>
      <summary className="tool-summary">
        <div className="tool-card-header">
          <code className="tool-title" title={title}>{title}</code>
          <span className={`tool-status ${status}`}>{formatToolStatus(status)}</span>
        </div>
      </summary>
      {output ? <pre className="tool-output">{output}</pre> : null}
    </details>
  );
}

function readYacaMessage(value: unknown): ChatMessage | null {
  if (!value || typeof value !== 'object' || !('kind' in value)) return null;
  return value as ChatMessage;
}

function formatToolArgsInline(args: ChatMessage['args']): string {
  if (!args || Object.keys(args).length === 0) return '';
  return Object.values(args)
    .map((value) => typeof value === 'string' ? value : JSON.stringify(value))
    .join(', ');
}

function formatToolStatus(status: NonNullable<ChatMessage['status']>): string {
  if (status === 'success') return '成功';
  if (status === 'error') return '失败';
  return '执行中';
}
