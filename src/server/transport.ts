import type { WebSocket } from 'ws';
import type { ServerWsMessage } from './api-types.js';

export class WebSocketHub {
  private readonly clients = new Set<WebSocket>();

  add(client: WebSocket): void {
    this.clients.add(client);
  }

  remove(client: WebSocket): void {
    this.clients.delete(client);
  }

  send(client: WebSocket, message: ServerWsMessage): void {
    if (client.readyState === client.OPEN) {
      client.send(JSON.stringify(message));
    }
  }

  broadcast(message: ServerWsMessage): void {
    for (const client of this.clients) {
      this.send(client, message);
    }
  }
}
