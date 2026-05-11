import { Menu } from 'lucide-react';
import { useState } from 'react';
import { ComposerArea } from '../chat/ComposerArea.js';
import { ThreadView } from '../chat/ThreadView.js';
import { SessionSidebar } from '../sidebar/SessionSidebar.js';
import { StatusLine } from '../status/StatusLine.js';
import { ToolConfirmDialog } from '../tools/ToolConfirmDialog.js';
import { Toast } from '../common/Toast.js';
import type { useYacaWeb } from '../../hooks/useYacaWeb.js';
import '../common/controls.css';
import './AppShell.css';

type YacaWebController = ReturnType<typeof useYacaWeb>;

export function AppShell({ yaca }: { yaca: YacaWebController }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);

  return (
    <div className="app-shell">
      <SessionSidebar
        open={sidebarOpen}
        sessions={yaca.sessions}
        activeSessionId={yaca.sessionId}
        onClose={() => setSidebarOpen(false)}
        onCreate={() => void yaca.createSession()}
        onSelect={(id) => {
          setSidebarOpen(false);
          void yaca.selectSession(id);
        }}
      />
      <main className="workspace">
        <header className="mobile-topbar">
          <button className="icon-button" type="button" aria-label="Open sessions" onClick={() => setSidebarOpen(true)}>
            <Menu size={18} />
          </button>
          <span>yaCA</span>
        </header>
        <ThreadView />
        <ComposerArea busy={yaca.busy} />
        <StatusLine
          connected={yaca.connected}
          runtime={yaca.runtime}
          tools={yaca.tools}
          allowTools={yaca.allowTools}
          allowCommands={yaca.allowCommands}
          toolsOpen={toolsOpen}
          onToolsOpenChange={setToolsOpen}
          onAllowChange={(tools, commands) => void yaca.updateAllow(tools, commands)}
          onTrustChange={(trusted) => void yaca.updateTrustMode(trusted)}
        />
      </main>
      {yaca.pendingToolConfirm ? <ToolConfirmDialog pending={yaca.pendingToolConfirm} onResolve={yaca.resolveToolConfirm} /> : null}
      {yaca.error ? <Toast message={yaca.error} /> : null}
    </div>
  );
}
