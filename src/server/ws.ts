import type http from 'node:http';
import { WebSocketServer, type WebSocket } from 'ws';
import { renderSessionMessages } from '@woisol-g/yaca/web-runtime.js';
import type { ClientWsMessage } from './api-types.js';
import { toApiError } from './response.js';
import type { WebSocketHub } from './transport.js';
import type { PendingToolApproval, YacaWebRuntime } from './types.js';
import { runWebAgentTurn } from './agent-turn.js';

export function attachWebSocketServer({
  server,
  runtime,
  hub
}: {
  server: http.Server;
  runtime: YacaWebRuntime;
  hub: WebSocketHub;
}): void {
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (request, socket, head) => {
    const url = new URL(request.url ?? '/', `http://${request.headers.host ?? '127.0.0.1'}`);
    if (url.pathname !== '/api/ws') {
      socket.destroy();
      return;
    }
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  });

  wss.on('connection', (ws) => {
    handleConnection(ws, runtime, hub);
  });
}

function handleConnection(ws: WebSocket, runtime: YacaWebRuntime, hub: WebSocketHub): void {
  hub.add(ws);
  let pendingToolApproval: PendingToolApproval | null = null;
  let activeTurnController: AbortController | null = null;

  runtime.state.toolCallConfirm = async ({ kind, name, args }) => new Promise<boolean>((resolve) => {
    const callId = `${kind}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    pendingToolApproval = { call: { name, args, call_id: callId }, kind, resolve };
    hub.send(ws, { type: 'tool.confirm_request', id: callId, callId, call: pendingToolApproval.call, kind });
  });

  ws.on('message', (raw) => {
    void handleWsMessage(String(raw), ws, runtime, hub, {
      getPending: () => pendingToolApproval,
      setPending: (value) => { pendingToolApproval = value; },
      getController: () => activeTurnController,
      setController: (value) => { activeTurnController = value; }
    });
  });
  ws.on('close', () => {
    hub.remove(ws);
    activeTurnController?.abort();
    pendingToolApproval?.resolve(false);
  });
}

async function handleWsMessage(
  raw: string,
  ws: WebSocket,
  runtime: YacaWebRuntime,
  hub: WebSocketHub,
  state: {
    getPending(): PendingToolApproval | null;
    setPending(value: PendingToolApproval | null): void;
    getController(): AbortController | null;
    setController(value: AbortController | null): void;
  }
): Promise<void> {
  const message = JSON.parse(raw) as ClientWsMessage;
  if (message.type === 'tool.confirm') {
    resolveToolConfirmation(message.callId, message.approved, state);
    return;
  }
  if (message.type === 'chat.abort') {
    state.getController()?.abort();
    hub.send(ws, { type: 'chat.line', id: message.id, kind: 'status', text: 'Turn aborted.' });
    hub.send(ws, { type: 'chat.done', id: message.id, sessionId: message.sessionId });
    return;
  }
  if (message.type === 'session.resume') {
    const session = await runtime.store.resumeSession(message.sessionId);
    runtime.state.sessionId = session.id;
    hub.send(ws, {
      type: 'chat.messages',
      id: message.id,
      sessionId: session.id,
      messages: renderSessionMessages(await runtime.store.readMessages(session.id))
    });
    return;
  }
  if (message.type === 'chat.send') {
    await runChatSend(message, ws, runtime, hub, state);
  }
}

async function runChatSend(
  message: Extract<ClientWsMessage, { type: 'chat.send' }>,
  ws: WebSocket,
  runtime: YacaWebRuntime,
  hub: WebSocketHub,
  state: {
    getController(): AbortController | null;
    setController(value: AbortController | null): void;
  }
): Promise<void> {
  const controller = new AbortController();
  state.setController(controller);
  try {
    const result = await runWebAgentTurn(message.text, runtime, {
      sessionId: message.sessionId,
      content: message.content,
      signal: controller.signal,
      onMessages: (messages, sessionId) => hub.send(ws, { type: 'chat.messages', id: message.id, sessionId, messages }),
      onEvent: (event) => hub.send(ws, { type: 'agent.event', id: message.id, event })
    });
    hub.broadcast({ type: 'session.list', id: 'sessions', sessions: await runtime.store.listSessions() });
    hub.send(ws, { type: 'chat.messages', id: message.id, sessionId: result.sessionId, messages: result.messages });
    hub.send(ws, { type: 'chat.done', id: message.id, sessionId: result.sessionId });
  } catch (error) {
    hub.send(ws, { type: 'error', id: message.id, error: toApiError(error) });
  } finally {
    if (state.getController() === controller) {
      state.setController(null);
    }
  }
}

function resolveToolConfirmation(
  callId: string,
  approved: boolean,
  state: {
    getPending(): PendingToolApproval | null;
    setPending(value: PendingToolApproval | null): void;
  }
): void {
  const pending = state.getPending();
  if (pending && (pending.call.call_id ?? '') === callId) {
    pending.resolve(approved);
    state.setPending(null);
  }
}
