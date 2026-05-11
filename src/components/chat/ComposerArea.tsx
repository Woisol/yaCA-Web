import { ComposerPrimitive } from '@assistant-ui/react';
import { Send, X } from 'lucide-react';
import './ComposerArea.css';

export function ComposerArea({ busy }: { busy: boolean }) {
  return (
    <ComposerPrimitive.Root className="composer">
      <ComposerPrimitive.Input className="composer-input" placeholder="Enter something creative..." autoFocus rows={3} />
      {/* <div className="composer-action"> */}
      {busy ? (
        <ComposerPrimitive.Cancel asChild>
          <button className="composer-command is-stop" type="button" aria-label="Stop response">
            <X size={16} /> Stop
          </button>
        </ComposerPrimitive.Cancel>
      ) : (
        <ComposerPrimitive.Send asChild>
            <button className="composer-command is-send" type="button" aria-label="Send message">
            <Send size={16} /> Send
          </button>
        </ComposerPrimitive.Send>
      )}
      {/* </div> */}
    </ComposerPrimitive.Root>
  );
}
