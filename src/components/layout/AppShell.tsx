import { Menu } from 'lucide-react';
import { useAui } from '@assistant-ui/react';
import { useState, type DragEvent } from 'react';
import { ComposerArea } from '../chat/ComposerArea.js';
import { ThreadView } from '../chat/ThreadView.js';
import { SessionSidebar } from '../sidebar/SessionSidebar.js';
import { StatusLine } from '../status/StatusLine.js';
import { ToolConfirmDialog } from '../tools/ToolConfirmDialog.js';
import { Toast } from '../common/Toast.js';
import type { useYacaWeb } from '../../hooks/useYacaWeb.js';
import { droppedFilesToMessage, mergeDroppedMessages, mergePromptWithDropped, type DroppedMessage } from '../../lib/drop-files.js';
import '../common/controls.css';
import './AppShell.css';

type YacaWebController = ReturnType<typeof useYacaWeb>;

export function AppShell({ yaca }: { yaca: YacaWebController }) {
  const aui = useAui();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [dragDepth, setDragDepth] = useState(0);
  const [dropError, setDropError] = useState<string | undefined>();
  const [pendingDrop, setPendingDrop] = useState<DroppedMessage | null>(null);
  const draggingFiles = dragDepth > 0;

  const onDragEnter = (event: DragEvent<HTMLDivElement>) => {
    if (!hasFiles(event)) return;
    event.preventDefault();
    setDragDepth((depth) => depth + 1);
  };

  const onDragOver = (event: DragEvent<HTMLDivElement>) => {
    if (!hasFiles(event)) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  };

  const onDragLeave = (event: DragEvent<HTMLDivElement>) => {
    if (!hasFiles(event)) return;
    event.preventDefault();
    setDragDepth((depth) => Math.max(0, depth - 1));
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    if (!hasFiles(event)) return;
    event.preventDefault();
    setDragDepth(0);
    const files = getDroppedFiles(event.dataTransfer);
    if (files.length === 0) return;
    void droppedFilesToMessage(files)
      .then((message) => {
        setDropError(undefined);
        setPendingDrop((current) => current ? mergeDroppedMessages(current, message) : message);
      })
      .catch((error: unknown) => setDropError(error instanceof Error ? error.message : String(error)));
  };

  const sendPendingDrop = (inputText: string) => {
    if (!pendingDrop) return;
    const merged = mergePromptWithDropped(inputText, pendingDrop);
    void yaca.sendContent(merged.text, merged.content);
    setPendingDrop(null);
  };

  const rewindToMessage = (index: number) => {
    void yaca.rewindToMessage(index)
      .then((input) => {
        if (input) aui.composer().setText(input);
      });
  };

  // useEffect(() => {
  //   const sessionId = window.location.pathname.slice(1);
  //   if (sessionId) void yaca.selectSession(decodeURIComponent(sessionId));
  // }, [])

  return (
    <div className="app-shell" onDragEnter={onDragEnter} onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}>
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
        {/* 移动适配 header */}
        <header className="mobile-topbar">
          <button className="icon-button" type="button" aria-label="Open sessions" onClick={() => setSidebarOpen(true)}>
            <Menu size={18} />
          </button>
          <span>yaCA Web</span>
        </header>
        <ThreadView onRewind={rewindToMessage} busy={yaca.busy} messageCount={yaca.messages.length} />
        <div className="action-area">
          <ComposerArea
            busy={yaca.busy}
            pendingDrop={pendingDrop}
            onSendDropped={sendPendingDrop}
            onClearDropped={() => setPendingDrop(null)}
          />
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
        </div>
      </main>
      {yaca.pendingToolConfirm ? <ToolConfirmDialog pending={yaca.pendingToolConfirm} onResolve={yaca.resolveToolConfirm} /> : null}
      {yaca.error ? <Toast message={yaca.error} /> : null}
      {dropError ? <Toast message={dropError} /> : null}
      {draggingFiles ? (
        <div className="drop-overlay" aria-hidden="true">
          <div className="drop-overlay-panel">
            <strong>Drop files to stage</strong>
            <span>Text files expand to prompt blocks, images stay as image content.</span>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function hasFiles(event: DragEvent<HTMLDivElement>): boolean {
  return Array.from(event.dataTransfer.types).includes('Files');
}

function getDroppedFiles(dataTransfer: DataTransfer): File[] {
  if (dataTransfer.items.length > 0) {
    const files = Array.from(dataTransfer.items)
      .map((item) => item.kind === 'file' ? item.getAsFile() : null)
      .filter((file): file is File => Boolean(file));
    if (files.length > 0) return files;
  }
  return Array.from(dataTransfer.files);
}
