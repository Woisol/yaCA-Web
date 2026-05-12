import type http from 'node:http';
import type { CreateSessionRequest, UpdateAllowToolsRequest, UpdateConfigRequest } from './api-types.js';
import { getRuntimeInfo, listTools, updateRuntimeConfig } from './config.js';
import { handleSessionApi } from './session-api.js';
import { json, notFound, readJson, toApiError } from './response.js';
import { serveAsset } from './static.js';
import type { WebSocketHub } from './transport.js';
import type { YacaWebRuntime } from './types.js';

export async function handleHttpRequest({
  request,
  response,
  runtime,
  hub,
  serveStatic
}: {
  request: http.IncomingMessage;
  response: http.ServerResponse;
  runtime: YacaWebRuntime;
  hub: WebSocketHub;
  serveStatic: boolean;
}): Promise<void> {
  const url = new URL(request.url ?? '/', `http://${request.headers.host ?? '127.0.0.1'}`);
  try {
    if (request.method === 'GET' && url.pathname === '/health') {
      return json(response, { ok: true });
    }
    if (url.pathname.startsWith('/api/')) {
      return await handleApiRequest(request, response, runtime, hub, url);
    }
    if (serveStatic) {
      return await serveAsset(response, url.pathname);
    }
    return notFound(response);
  } catch (error) {
    return json(response, { error: toApiError(error) }, 500);
  }
}

async function handleApiRequest(
  request: http.IncomingMessage,
  response: http.ServerResponse,
  runtime: YacaWebRuntime,
  hub: WebSocketHub,
  url: URL
): Promise<void> {
  if (request.method === 'GET' && url.pathname === '/api/sessions') {
    return json(response, { sessions: await runtime.store.listSessions() });
  }
  if (request.method === 'POST' && url.pathname === '/api/sessions') {
    const body = await readJson<CreateSessionRequest>(request);
    const session = await runtime.store.createSession(body.name || 'New session');
    runtime.state.sessionId = session.id;
    hub.broadcast({ type: 'session.list', id: 'sessions', sessions: await runtime.store.listSessions() });
    return json(response, { session }, 201);
  }

  const sessionMatch = /^\/api\/sessions\/([^/]+)(?:\/(messages|rewind))?$/.exec(url.pathname);
  if (sessionMatch) {
    return await handleSessionApi(request, response, runtime, sessionMatch[1] ?? '', sessionMatch[2]);
  }

  if (request.method === 'GET' && url.pathname === '/api/config') {
    await runtime.toolPermissions?.refreshConfigIfChanged();
    return json(response, { config: runtime.state.config, runtime: getRuntimeInfo(runtime) });
  }
  if (request.method === 'PATCH' && url.pathname === '/api/config') {
    const body = await readJson<UpdateConfigRequest>(request);
    await updateRuntimeConfig(runtime, body);
    hub.broadcast({ type: 'config', id: 'config', config: runtime.state.config, runtime: getRuntimeInfo(runtime) });
    return json(response, { config: runtime.state.config, runtime: getRuntimeInfo(runtime) });
  }

  if (request.method === 'GET' && url.pathname === '/api/tools') {
    return json(response, listTools(runtime));
  }
  if (request.method === 'POST' && url.pathname === '/api/tools/allow') {
    const body = await readJson<UpdateAllowToolsRequest>(request);
    await updateRuntimeConfig(runtime, { allowTools: body.allowTools, allowCommands: body.allowCommands });
    hub.broadcast({ type: 'config', id: 'config', config: runtime.state.config, runtime: getRuntimeInfo(runtime) });
    return json(response, listTools(runtime));
  }

  return notFound(response);
}
