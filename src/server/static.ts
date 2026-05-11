import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type http from 'node:http';
import { notFound } from './response.js';

export async function serveAsset(response: http.ServerResponse, pathname: string): Promise<void> {
  const packageRoot = findPackageRoot(path.dirname(fileURLToPath(import.meta.url)));
  const root = path.join(packageRoot, 'dist');
  const relative = pathname === '/' ? 'index.html' : pathname.slice(1);
  const assetPath = path.resolve(root, relative);
  if (!assetPath.startsWith(root)) {
    return notFound(response);
  }
  try {
    const content = await readFile(assetPath);
    response.writeHead(200, { 'content-type': contentType(assetPath) });
    response.end(content);
  } catch {
    const fallback = await readFile(path.join(root, 'index.html'));
    response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    response.end(fallback);
  }
}

function findPackageRoot(startDirectory: string): string {
  let current = path.resolve(startDirectory);
  for (let depth = 0; depth < 8; depth += 1) {
    if (path.basename(current) === 'yaca-web') {
      return current;
    }
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return path.resolve(startDirectory, '../../..');
}

function contentType(filePath: string): string {
  if (filePath.endsWith('.html')) return 'text/html; charset=utf-8';
  if (filePath.endsWith('.js')) return 'text/javascript; charset=utf-8';
  if (filePath.endsWith('.css')) return 'text/css; charset=utf-8';
  if (filePath.endsWith('.svg')) return 'image/svg+xml';
  if (filePath.endsWith('.png')) return 'image/png';
  return 'application/octet-stream';
}
