import type http from 'node:http';
import { applyRewindSelection, renderSessionMessages } from '@woisol-g/yaca/web-runtime.js';
import { json, notFound, readJson } from './response.js';
import type { YacaWebRuntime } from './types.js';

export async function handleSessionApi(
  request: http.IncomingMessage,
  response: http.ServerResponse,
  runtime: YacaWebRuntime,
  sessionId: string,
  action?: string
): Promise<void> {
  if (!action && request.method === 'GET') {
    return json(response, { session: await runtime.store.getSession(sessionId) ?? null });
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
