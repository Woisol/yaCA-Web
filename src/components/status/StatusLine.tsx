import { Hammer, Shield, ShieldAlert } from 'lucide-react';
import type { RuntimeInfo, ToolDefinitionView } from '../../api/types.js';
import { ToolPopover } from '../tools/ToolPopover.js';
import './StatusLine.css';

export function StatusLine({
  connected,
  runtime,
  tools,
  allowTools,
  allowCommands,
  toolsOpen,
  onToolsOpenChange,
  onAllowChange,
  onTrustChange
}: {
  connected: boolean;
  runtime?: RuntimeInfo;
  tools: ToolDefinitionView[];
  allowTools: string[];
  allowCommands: string[];
  toolsOpen: boolean;
  onToolsOpenChange(open: boolean): void;
  onAllowChange(tools: string[], commands: string[]): void;
  onTrustChange(trusted: boolean): void;
}) {
  const trusted = runtime?.trustMode ?? false;
  return (
    <footer className="status-line">
      <span className={`connection-dot ${connected ? 'online' : ''}`} />
      <span className="status-chip">{runtime?.model ?? 'model'}</span>
      <span className="status-chip truncate">{runtime?.baseUrl ?? 'baseurl'}</span>
      <span className="status-chip truncate">{runtime?.cwd ?? 'cwd'}</span>
      <div className="status-spacer" />
      <div className="tool-popover-wrap">
        <button className="status-button" type="button" onClick={() => onToolsOpenChange(!toolsOpen)}>
          <Hammer size={14} /> Tools
        </button>
        {toolsOpen ? (
          <ToolPopover
            tools={tools}
            allowTools={allowTools}
            allowCommands={allowCommands}
            onChange={onAllowChange}
          />
        ) : null}
      </div>
      <button
        className={`trust-toggle ${trusted ? 'trusted' : ''}`}
        type="button"
        aria-pressed={trusted}
        onClick={() => onTrustChange(!trusted)}
      >
        {trusted ? <ShieldAlert size={14} /> : <Shield size={14} />}
        {trusted ? 'trust' : 'untrust'}
      </button>
    </footer>
  );
}
