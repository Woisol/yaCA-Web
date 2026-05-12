import { existsSync, readFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type http from 'node:http';
import { notFound } from './response.js';

export async function serveAsset(response: http.ServerResponse, pathname: string): Promise<void> {
  const packageRoot = findPackageRoot(path.dirname(fileURLToPath(import.meta.url)));
  const root = path.resolve(packageRoot, 'dist');
  const relative = pathname === '/' ? 'index.html' : pathname.slice(1);
  const assetPath = path.resolve(root, relative);
  if (!isInsideDirectory(root, assetPath)) {
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
    if (isYacaWebPackageRoot(current)) {
      return current;
    }
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return path.resolve(startDirectory, '../../..');
}

function isYacaWebPackageRoot(directory: string): boolean {
  const packageJsonPath = path.join(directory, 'package.json');
  if (!existsSync(packageJsonPath)) {
    return false;
  }
  try {
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as { name?: string };
    return packageJson.name === '@woisol-g/yaca-web';
  } catch {
    return path.basename(directory) === 'yaca-web';
  }
}

function isInsideDirectory(root: string, candidate: string): boolean {
  const relative = path.relative(root, candidate);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

function contentType(filePath: string): string {
  if (filePath.endsWith('.html')) return 'text/html; charset=utf-8';
  if (filePath.endsWith('.js')) return 'text/javascript; charset=utf-8';
  if (filePath.endsWith('.css')) return 'text/css; charset=utf-8';
  if (filePath.endsWith('.svg')) return 'image/svg+xml';
  if (filePath.endsWith('.png')) return 'image/png';
  return 'application/octet-stream';
}
