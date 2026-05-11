import { ComposerPrimitive, useAui, useAuiState } from '@assistant-ui/react';
import { FileText, Send, X } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import type { DroppedMessage } from '../../lib/drop-files.js';
import './ComposerArea.css';

type ComposerAreaProps = {
  busy: boolean;
  pendingDrop: DroppedMessage | null;
  onSendDropped(inputText: string): void;
  onClearDropped(): void;
};

export function ComposerArea({ busy, pendingDrop, onSendDropped, onClearDropped }: ComposerAreaProps) {
  const aui = useAui();
  const inputText = useAuiState((state) => state.composer.text);
  const [sentDropped, setSentDropped] = useState(false);
  const isRunning = busy || sentDropped;

  useEffect(() => {
    if (!busy) setSentDropped(false);
  }, [busy]);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    if (!pendingDrop || isRunning) return;
    event.preventDefault();
    event.stopPropagation();
    setSentDropped(true);
    onSendDropped(inputText);
    aui.composer().setText('');
  };

  return (
    <ComposerPrimitive.Root className="composer" onSubmit={onSubmit}>
      {pendingDrop ? (
        <div className="composer-drop-preview">
          <span className="composer-drop-icon" aria-hidden="true">
            <FileText size={15} />
          </span>
          <span className="composer-drop-text">{pendingDrop.fileCount} staged file{pendingDrop.fileCount === 1 ? '' : 's'}</span>
          <button className="composer-drop-clear" type="button" aria-label="Remove staged files" onClick={onClearDropped}>
            <X size={14} />
          </button>
        </div>
      ) : null}
      <ComposerPrimitive.Input className="composer-input" placeholder="Enter something creative..." autoFocus rows={3} />
      {isRunning ? (
        <ComposerPrimitive.Cancel asChild>
          <button className="composer-command is-stop" type="button" aria-label="Stop response">
            <X size={16} /> Stop
          </button>
        </ComposerPrimitive.Cancel>
      ) : pendingDrop ? (
        <button className="composer-command is-send" type="submit" aria-label="Send message with staged files">
          <Send size={16} /> Send
        </button>
      ) : (
        <ComposerPrimitive.Send asChild>
          <button className="composer-command is-send" type="button" aria-label="Send message">
            <Send size={16} /> Send
          </button>
        </ComposerPrimitive.Send>
      )}
    </ComposerPrimitive.Root>
  );
}
