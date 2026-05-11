import type http from 'node:http';
import type { ApiError } from '../api/types.js';

export async function readJson<T>(request: http.IncomingMessage): Promise<T> {
  const raw = await readRequestBody(request);
  return raw ? JSON.parse(raw) as T : {} as T;
}

export function json(response: http.ServerResponse, body: unknown, status = 200): void {
  response.writeHead(status, { 'content-type': 'application/json' });
  response.end(JSON.stringify(body));
}

export function notFound(response: http.ServerResponse): void {
  json(response, { error: { code: 'NOT_FOUND', message: 'not found' } }, 404);
}

export function toApiError(error: unknown): ApiError {
  return {
    code: 'INTERNAL_ERROR',
    message: error instanceof Error ? error.message : String(error)
  };
}

function readRequestBody(request: http.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = '';
    request.on('data', (chunk: Buffer) => { body += chunk.toString(); });
    request.on('end', () => resolve(body));
    request.on('error', reject);
  });
}
