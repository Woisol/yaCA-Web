import { startTransition, useEffect, useState, type MouseEvent } from 'react';
import { ChevronsLeft, Moon, Plus, Sun } from 'lucide-react';
import type { SessionMeta } from '../../api/types.js';
import { formatSessionDate } from '../../lib/dates.js';
import './SessionSidebar.css';

type Theme = 'dark' | 'light';

const THEME_STORAGE_KEY = 'yaca-web-theme';

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
  // 是的 useState 初始值是可以用函数的
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === 'undefined') return 'dark';
    const savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (savedTheme === 'dark' || savedTheme === 'light') return savedTheme;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  const toggleTheme = (event: MouseEvent<HTMLButtonElement>) => {
    const nextTheme: Theme = theme === 'dark' ? 'light' : 'dark';
    const root = document.documentElement;
    root.style.setProperty('--theme-circle-x', `${event.clientX}px`);
    root.style.setProperty('--theme-circle-y', `${event.clientY}px`);
    root.style.viewTransitionName = 'theme';

    const withViewTransition = document as Document & {
      startViewTransition?: (update: () => void) => { finished: Promise<void> };
    };

    const cleanup = () => {
      root.style.viewTransitionName = '';
      root.style.removeProperty('--theme-circle-x');
      root.style.removeProperty('--theme-circle-y');
    };

    if (!withViewTransition.startViewTransition) {
      startTransition(() => setTheme(nextTheme));
      cleanup();
      return;
    }

    const transition = withViewTransition.startViewTransition(() => {
      startTransition(() => setTheme(nextTheme));
    });
    transition.finished.finally(cleanup);
  };

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
      <button className={`scrim ${open ? 'open' : ''}`} type="button" aria-label="Close sessions" onClick={onClose} />
    </>
  );
}
