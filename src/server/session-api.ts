import type http from 'node:http';
import { applyRewindSelection, renderSessionMessages } from '@woisol-g/yaca/web-runtime.js';
import { json, notFound, readJson } from './response.js';
import type { UpdateSessionRequest } from './api-types.js';
import type { YacaWebRuntime } from './types.js';
import type { WebSocketHub } from './transport.js';

export async function handleSessionApi(
  request: http.IncomingMessage,
  response: http.ServerResponse,
  runtime: YacaWebRuntime,
  hub: WebSocketHub,
  sessionId: string,
  action?: string
): Promise<void> {
  if (!action && request.method === 'GET') {
    return json(response, { session: await runtime.store.getSession(sessionId) ?? null });
  }
  if (!action && request.method === 'PATCH') {
    const body = await readJson<UpdateSessionRequest>(request);
    const session = await runtime.store.renameSession(sessionId, body.name ?? '');
    hub.broadcast({ type: 'session.list', id: 'sessions', sessions: await runtime.store.listSessions() });
    return json(response, { session });
  }
  if (!action && request.method === 'DELETE') {
    const session = await runtime.store.deleteSession(sessionId);
    if (runtime.state.sessionId === sessionId) runtime.state.sessionId = undefined;
    hub.broadcast({ type: 'session.list', id: 'sessions', sessions: await runtime.store.listSessions() });
    return json(response, { session });
  }
  if (action === 'messages' && request.method === 'GET') {
    return json(response, { messages: renderSessionMessages(await runtime.store.readMessages(sessionId)) });
  }
  if (action === 'rewind' && request.method === 'POST') {
    const body = await readJson<{ selectedIndex?: number }>(request);
    const messages = renderSessionMessages(await runtime.store.readMessages(sessionId));
    const result = applyRewindSelection(messages, body.selectedIndex ?? -1);
    await runtime.store.replaceMessages(sessionId, result.storedMessages);
    return json(response, { messages: result.messages, input: result.input });
  }
  return notFound(response);
}
