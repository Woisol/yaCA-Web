import { Suspense, createContext, isValidElement, lazy, useCallback, useContext, useEffect, useMemo, useRef, useState, type ComponentPropsWithoutRef, type ReactElement, type ReactNode } from 'react';
import { MessagePrimitive, ThreadPrimitive, useMessage } from '@assistant-ui/react';
import { RotateCcw } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { ChatMessage } from '../../api/types.js';
import { type Theme, useTheme } from '../../hooks/useTheme.js';
import { createHighlightedSandboxedHtmlPayload, createSandboxedHtmlPayload, createSandboxedHtmlShell, getMessageRenderMode, LLM_HTML_MESSAGE_CHANNEL } from '../../lib/message-rendering.js';
import './ThreadView.css';

type HighlightedCodeProps = {
  code: string;
  language: string;
  theme: Theme;
};

const LazySyntaxHighlighter = lazy(async () => {
  const [{ Prism: SyntaxHighlighter }, { oneLight, oneDark }] = await Promise.all([
    import('react-syntax-highlighter'),
    import('react-syntax-highlighter/dist/esm/styles/prism')
  ]);

  return {
    default: function HighlightedCode({ code, language, theme }: HighlightedCodeProps) {
      return (
        <SyntaxHighlighter
          PreTag="div"
          className="message-md-code message-md-highlight"
          codeTagProps={{ className: 'message-md-code-tag' }}
          customStyle={{ margin: 0 }}
          language={language}
          style={theme === 'dark' ? oneDark : oneLight}
        >
          {code}
        </SyntaxHighlighter>
      );
    }
  };
});

type ThreadViewProps = {
  onRewind(index: number): void;
  busy: boolean;
  messageCount: number;
};

type ThreadViewContextValue = ThreadViewProps;

const ThreadViewContext = createContext<ThreadViewContextValue | null>(null);
const THREAD_MESSAGE_COMPONENTS = { Message: ChatBubble };

export function ThreadView({ onRewind, busy, messageCount }: ThreadViewProps) {
  const contextValue = useMemo(() => ({ onRewind, busy, messageCount }), [busy, messageCount, onRewind]);

  return (
    <ThreadViewContext.Provider value={contextValue}>
      <ThreadPrimitive.Root className="thread-root">
        <ThreadPrimitive.Viewport className="thread-viewport">
          <ThreadPrimitive.Empty>
            <div className="empty-thread">
              <strong>YACA Web ready.</strong>
              <span>Start a session or resume one from the sidebar.</span>
            </div>
          </ThreadPrimitive.Empty>
          <ThreadPrimitive.Messages components={THREAD_MESSAGE_COMPONENTS} />
        </ThreadPrimitive.Viewport>
      </ThreadPrimitive.Root>
    </ThreadViewContext.Provider>
  );
}

/**
 * 简单来说，之前用的是 <ThreadPrimitive.Messages components={{ Message: () => <ChatBubble ... /> }} />
 * ThreadView 因为流式数据更新时，()=>{} 创建出来的组件虽然类型相同但不是同一个组件，导致 React diff 算法认为需要销毁重构
 * + iframe 的销毁重构是性能灾难，加上 ResizeObserver 事件……
 *
 * 而这里通过 context，切断渲染传递阿巴阿巴，总之更新更精确了
 *
 * 没用 React Profiler 是因为可能现在直接 server static dist 或者 dist 没有 sourcemap 的原因 React DevTools Profiler 显示 unsupported。
 */
function ChatBubble() {
  // TODO 尝试一下不用 context 是否同样解决问题，如果解决那根因就只是 ()=> MessageBubble
  const { onRewind, busy, messageCount } = useThreadViewContext();
  const message = useMessage();
  const source = readYacaMessage(message?.metadata.custom.yaca);
  const streaming = message.index === messageCount - 1 && busy && source?.kind === 'assistant';

  return (
    <MessagePrimitive.Root className="message">
      <MessagePrimitive.If user>
        <button className="rewind-chat" type="button" onClick={() => onRewind(message.index)}>
          <RotateCcw size={13} /> 回溯到这里
        </button>
        <RenderedMessageBubble className="message-bubble user" text={source?.text ?? ''} streaming={false} />
      </MessagePrimitive.If>
      <MessagePrimitive.If assistant>
        {source?.kind === 'tool' ? <ToolCard message={source} /> : <RenderedMessageBubble className="message-bubble assistant" text={source?.text ?? ''} streaming={streaming} />}
      </MessagePrimitive.If>
    </MessagePrimitive.Root>
  );
}

function useThreadViewContext(): ThreadViewContextValue {
  const context = useContext(ThreadViewContext);
  if (!context) throw new Error('ThreadView context is missing');
  return context;
}

function RenderedMessageBubble({ className, text, streaming }: { className: string; text: string; streaming: boolean }) {
  if (getMessageRenderMode(text) === 'html') {
    return (
      <div className={`${className} html-bubble`}>
        <LlmHtmlFrame text={text} streaming={streaming} />
      </div>
    );
  }

  return (
    <div className={`${className} markdown-bubble`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
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

function LlmHtmlFrame({ text, streaming }: { text: string; streaming: boolean }) {
  const { theme } = useTheme();
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const latestPayloadRef = useRef('');
  const lastPostedPayloadRef = useRef('');
  const [loaded, setLoaded] = useState(false);
  const [height, setHeight] = useState(120);
  const frameConfig = useMemo(() => createFrameConfig(), []);
  const shell = useMemo(() => createSandboxedHtmlShell(frameConfig), [frameConfig]);
  const mode = streaming ? 'stream' : 'final';
  const payload = useMemo(() => createSandboxedHtmlPayload(text, mode), [mode, text]);

  const postPayload = useCallback((force = false) => {
    const target = iframeRef.current?.contentWindow;
    if (!target) return;
    const html = latestPayloadRef.current;
    if (!force && html === lastPostedPayloadRef.current) return;
    lastPostedPayloadRef.current = html;
    target.postMessage({
      channel: LLM_HTML_MESSAGE_CHANNEL,
      type: 'update',
      frameId: frameConfig.frameId,
      token: frameConfig.token,
      theme,
      html
    }, '*');
  }, [frameConfig.frameId, frameConfig.token, theme]);

  useEffect(() => {
    latestPayloadRef.current = payload;
    if (loaded && !streaming) postPayload(true);
  }, [loaded, payload, postPayload, streaming]);

  useEffect(() => {
    if (loaded) postPayload(true);
  }, [loaded, postPayload, theme]);

  useEffect(() => {
    if (!loaded || streaming) return;
    let cancelled = false;
    void createHighlightedSandboxedHtmlPayload(text).then((highlightedPayload) => {
      if (cancelled) return;
      latestPayloadRef.current = highlightedPayload;
      postPayload(true);
    });
    return () => {
      cancelled = true;
    };
  }, [loaded, postPayload, streaming, text]);

  useEffect(() => {
    if (!loaded || !streaming) return;
    postPayload(true);
    const interval = window.setInterval(() => postPayload(), 100);
    return () => window.clearInterval(interval);
  }, [loaded, postPayload, streaming]);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      const data = event.data;
      if (!data || typeof data !== 'object') return;
      if (data.channel !== LLM_HTML_MESSAGE_CHANNEL || data.type !== 'height') return;
      if (data.frameId !== frameConfig.frameId || data.token !== frameConfig.token) return;
      if (typeof data.height !== 'number' || !Number.isFinite(data.height)) return;
      setHeight(Math.max(80, Math.ceil(data.height)));
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [frameConfig.frameId, frameConfig.token]);

  return (
    <iframe
      ref={iframeRef}
      className="message-html-frame"
      sandbox="allow-scripts"
      srcDoc={shell}
      style={{ height }}
      title="HTML preview"
      onLoad={() => {
        setLoaded(true);
        window.setTimeout(() => postPayload(true), 0);
      }}
    />
  );
}

function createFrameConfig(): { frameId: string; token: string } {
  const token = createFrameToken();
  return {
    frameId: `llm-html-${token.replace(/[^a-zA-Z0-9]/g, '')}`,
    token
  };
}

function createFrameToken(): string {
  const bytes = new Uint8Array(18);
  if (globalThis.crypto?.getRandomValues && typeof btoa === 'function') {
    globalThis.crypto.getRandomValues(bytes);
    return btoa(String.fromCharCode(...bytes));
  }
  return Math.random().toString(36).slice(2);
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
  const { theme } = useTheme();
  const code = getCodeElement(children);
  const className = code?.props.className;
  const language = getCodeLanguage(className);
  const source = code ? toText(code.props.children).replace(/\n$/, '') : '';
  if (code && language) {
    return (
      <Suspense fallback={<CodeFallback code={source} />}>
        <LazySyntaxHighlighter code={source} language={language} theme={theme} />
      </Suspense>
    );
  }

  return (
    <pre className="message-md-code" {...props}>
      {children}
    </pre>
  );
}

function CodeFallback({ code }: { code: string }) {
  return (
    <pre className="message-md-code">
      <code>{code}</code>
    </pre>
  );
}

type CodeElementProps = {
  className?: string;
  children?: ReactNode;
};

function getCodeElement(children: ReactNode): ReactElement<CodeElementProps> | null {
  if (isValidElement<CodeElementProps>(children)) {
    return children;
  }
  if (Array.isArray(children) && children.length === 1 && isValidElement<CodeElementProps>(children[0])) {
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
