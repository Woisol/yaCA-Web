import { ChevronsLeft, Plus } from 'lucide-react';
import type { SessionMeta } from '../../api/types.js';
import { formatSessionDate } from '../../lib/dates.js';
import './SessionSidebar.css';

export function SessionSidebar({
  open,
  sessions,
  activeSessionId,
  onClose,
  onCreate,
  onSelect
}: {
  open: boolean;
  sessions: SessionMeta[];
  activeSessionId?: string;
  onClose(): void;
  onCreate(): void;
  onSelect(id: string): void;
}) {
  return (
    <>
      <aside className={`sidebar ${open ? 'is-open' : ''}`}>
        <div className="sidebar-header">
          <div>
            <div className="brand">yaCA</div>
            <div className="sidebar-subtitle">sessions</div>
          </div>
          <button className="icon-button desktop-hidden" type="button" aria-label="Close sessions" onClick={onClose}>
            <ChevronsLeft size={18} />
          </button>
        </div>
        <button className="new-session" type="button" onClick={onCreate}>
          <Plus size={16} /> New session
        </button>
        <nav className="session-list" aria-label="Conversation history">
          {sessions.map((session) => (
            <button
              className={`session-item ${session.id === activeSessionId ? 'active' : ''}`}
              key={session.id}
              type="button"
              onClick={() => onSelect(session.id)}
            >
              <span>{session.name || 'New session'}</span>
              <small>{formatSessionDate(session.updated_at)} - {session.message_count} msg</small>
            </button>
          ))}
          {sessions.length === 0 ? <div className="empty-sidebar">No sessions yet.</div> : null}
        </nav>
      </aside>
      {open ? <button className="scrim" type="button" aria-label="Close sessions" onClick={onClose} /> : null}
    </>
  );
}
