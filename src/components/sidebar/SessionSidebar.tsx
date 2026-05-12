import { ChevronsLeft, Check, Moon, Pencil, Plus, Sun, Trash2, X } from 'lucide-react';
import { useEffect, useRef, useState, type KeyboardEvent, type MouseEvent } from 'react';
import type { SessionMeta } from '../../api/types.js';
import { useTheme } from '../../hooks/useTheme.js';
import { formatSessionDate } from '../../lib/dates.js';
import './SessionSidebar.css';

export function SessionSidebar({
  open,
  sessions,
  activeSessionId,
  onClose,
  onCreate,
  onSelect,
  onRename,
  onDelete
}: {
  open: boolean;
  sessions: SessionMeta[];
  activeSessionId?: string;
  onClose(): void;
  onCreate(): void;
  onSelect(id: string): void;
  onRename(id: string, name: string): void;
  onDelete(id: string): void;
}) {
  const { theme, toggleTheme } = useTheme();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<SessionMeta | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (editingId) inputRef.current?.focus();
  }, [editingId]);

  function beginRename(event: MouseEvent, session: SessionMeta) {
    event.stopPropagation();
    setEditingId(session.id);
    setEditingName(session.name || 'New session');
  }

  function confirmRename() {
    if (!editingId) return;
    const nextName = editingName.trim();
    if (nextName) onRename(editingId, nextName);
    setEditingId(null);
  }

  function cancelRename() {
    setEditingId(null);
    setEditingName('');
  }

  function onRenameKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      event.preventDefault();
      confirmRename();
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      cancelRename();
    }
  }

  function askDelete(event: MouseEvent, session: SessionMeta) {
    event.stopPropagation();
    setDeleteTarget(session);
  }

  return (
    <>
      <aside className={`sidebar ${open ? 'is-open' : ''}`}>
        <div className="sidebar-header">
          <div>
            <div className="brand">yaCA Web</div>
            <div className="sidebar-subtitle">sessions</div>
          </div>
          <div className="sidebar-action">
            <button className="icon-button theme-toggle" type="button" aria-label="Toggle dark mode" onClick={toggleTheme}>
              <Sun size={18} className={`theme-icon ${theme === 'light' ? 'is-visible' : ''}`} />
              <Moon size={18} className={`theme-icon ${theme === 'dark' ? 'is-visible' : ''}`} />
            </button>
            <button className="icon-button desktop-hidden" type="button" aria-label="Close sessions" onClick={onClose}>
              <ChevronsLeft size={18} />
            </button>
          </div>
        </div>
        <button className="new-session" type="button" onClick={onCreate}>
          <Plus size={16} /> New session
        </button>
        <nav className="session-list" aria-label="Conversation history">
          {sessions.map((session) => (
            <div className={`session-row ${session.id === activeSessionId ? 'active' : ''}`} key={session.id}>
              <button
                className="session-item"
                type="button"
                onClick={() => {
                  if (editingId === session.id) return;
                  onSelect(session.id);
                }}
              >
                <span className="session-main">
                  {editingId === session.id ? (
                    <input
                      ref={inputRef}
                      className="session-name-input"
                      value={editingName}
                      onChange={(event) => setEditingName(event.target.value)}
                      onClick={(event) => event.stopPropagation()}
                      onKeyDown={onRenameKeyDown}
                    />
                  ) : (
                    <span className="session-name">{session.name || 'New session'}</span>
                  )}
                  <small>{formatSessionDate(session.updated_at)} - {session.message_count} msg</small>
                </span>
              </button>
              <span className="session-action-group">
                {editingId === session.id ? (
                  <>
                    <button className="icon-button session-action" type="button" aria-label="Confirm rename" onClick={confirmRename}>
                      <Check size={14} />
                    </button>
                    <button className="icon-button session-action" type="button" aria-label="Cancel rename" onClick={cancelRename}>
                      <X size={14} />
                    </button>
                  </>
                ) : (
                  <>
                    <button className="icon-button session-action" type="button" aria-label="Rename session" onClick={(event) => beginRename(event, session)}>
                      <Pencil size={14} />
                    </button>
                    <button className="icon-button session-action danger" type="button" aria-label="Delete session" onClick={(event) => askDelete(event, session)}>
                      <Trash2 size={14} />
                    </button>
                  </>
                )}
              </span>
            </div>
          ))}
          {sessions.length === 0 ? <div className="empty-sidebar">No sessions yet.</div> : null}
        </nav>
      </aside>
      <button className={`scrim ${open ? 'open' : ''}`} type="button" aria-label="Close sessions" onClick={onClose} />
      {deleteTarget ? (
        <div className="modal-backdrop">
          <div className="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="delete-session-title">
            <div className="confirm-icon"><Trash2 size={20} /></div>
            <h2 id="delete-session-title">Delete session?</h2>
            <p className="delete-session-copy">{deleteTarget.name || 'New session'}</p>
            <div className="confirm-actions">
              <button className="secondary-button" type="button" onClick={() => setDeleteTarget(null)}>
                <X size={16} /> Cancel
              </button>
              <button
                className="send-button delete-session-confirm"
                type="button"
                onClick={() => {
                  onDelete(deleteTarget.id);
                  setDeleteTarget(null);
                }}
              >
                <Trash2 size={16} /> Delete
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
