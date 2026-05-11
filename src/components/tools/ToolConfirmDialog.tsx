import { Check, Terminal, X } from 'lucide-react';
import type { PendingToolConfirm } from '../../hooks/useYacaWeb.js';
import './ToolConfirmDialog.css';

export function ToolConfirmDialog({
  pending,
  onResolve
}: {
  pending: PendingToolConfirm;
  onResolve(approved: boolean): void;
}) {
  return (
    <div className="modal-backdrop">
      <div className="confirm-dialog" role="dialog" aria-modal="true">
        <div className="confirm-icon"><Terminal size={20} /></div>
        <h2>{pending.kind === 'command' ? 'Allow command execution?' : `Allow tool call ${pending.call.name}?`}</h2>
        <pre>{pending.kind === 'command' ? String(pending.call.args.command ?? '') : JSON.stringify(pending.call.args, null, 2)}</pre>
        <div className="confirm-actions">
          <button className="secondary-button" type="button" onClick={() => onResolve(false)}>
            <X size={16} /> No
          </button>
          <button className="send-button" type="button" onClick={() => onResolve(true)}>
            <Check size={16} /> Yes
          </button>
        </div>
      </div>
    </div>
  );
}
