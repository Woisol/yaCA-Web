import { MessagePrimitive, ThreadPrimitive } from '@assistant-ui/react';
import './ThreadView.css';

export function ThreadView() {
  return (
    <ThreadPrimitive.Root className="thread-root">
      <ThreadPrimitive.Viewport className="thread-viewport">
        <ThreadPrimitive.Empty>
          <div className="empty-thread">
            <strong>YACA Web ready.</strong>
            <span>Start a session or resume one from the sidebar.</span>
          </div>
        </ThreadPrimitive.Empty>
        <ThreadPrimitive.Messages components={{ Message: ChatBubble }} />
      </ThreadPrimitive.Viewport>
    </ThreadPrimitive.Root>
  );
}

function ChatBubble() {
  return (
    <MessagePrimitive.Root className="message">
      <MessagePrimitive.If user>
        <div className="message-bubble user"><MessagePrimitive.Parts /></div>
      </MessagePrimitive.If>
      <MessagePrimitive.If assistant>
        <div className="message-bubble assistant"><MessagePrimitive.Parts /></div>
      </MessagePrimitive.If>
    </MessagePrimitive.Root>
  );
}
