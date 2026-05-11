import http from 'node:http';
import { attachWebSocketServer } from './server/ws.js';
import { handleHttpRequest } from './server/http.js';
import { WebSocketHub } from './server/transport.js';
import type { StartYacaWebServerOptions, YacaWebRuntime } from './server/types.js';

export type { StartYacaWebServerOptions, YacaWebRuntime } from './server/types.js';

export function startYacaWebServer(options: StartYacaWebServerOptions): http.Server {
  const runtime: YacaWebRuntime = options;
  const hub = new WebSocketHub();
  const server = http.createServer((request, response) => {
    void handleHttpRequest({
      request,
      response,
      runtime,
      hub,
      serveStatic: options.serveStatic ?? true
    });
  });

  attachWebSocketServer({ server, runtime, hub });
  server.listen(options.port, options.host);
  return server;
}
