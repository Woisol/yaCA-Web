import { ComposerPrimitive } from '@assistant-ui/react';
import { Send, X } from 'lucide-react';
import './ComposerArea.css';

export function ComposerArea({ busy }: { busy: boolean }) {
  return (
    <ComposerPrimitive.Root className="composer">
      <ComposerPrimitive.Input className="composer-input" placeholder="Message yaCA..." autoFocus rows={3} />
      <div className="composer-actions">
        <ComposerPrimitive.Cancel asChild>
          <button className="secondary-button" type="button" disabled={!busy}>
            <X size={16} /> Stop
          </button>
        </ComposerPrimitive.Cancel>
        <ComposerPrimitive.Send asChild>
          <button className="send-button" type="button">
            <Send size={16} /> Send
          </button>
        </ComposerPrimitive.Send>
      </div>
    </ComposerPrimitive.Root>
  );
}
