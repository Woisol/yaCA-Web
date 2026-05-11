import { MessagePrimitive, ThreadPrimitive, useMessage } from '@assistant-ui/react';
import { RotateCcw } from 'lucide-react';
import type { ChatMessage } from '../../api/types.js';
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
        <div className="message-bubble user"><MessagePrimitive.Parts /></div>
      </MessagePrimitive.If>
      <MessagePrimitive.If assistant>
        {source?.kind === 'tool' ? <ToolCard message={source} /> : <div className="message-bubble assistant"><MessagePrimitive.Parts /></div>}
      </MessagePrimitive.If>
    </MessagePrimitive.Root>
  );
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
      {/* {args ? <pre className="tool-output tool-args">{args}</pre> : null} */}
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
