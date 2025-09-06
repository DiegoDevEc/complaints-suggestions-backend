import { join, extname, relative } from 'path';
import * as fs from 'fs';
import { randomUUID } from 'crypto';
import { UPLOAD_ROOT } from './upload.constants';

export function ensureUploadPath(): string {
  const now = new Date();
  const dest = join(
    UPLOAD_ROOT,
    now.getFullYear().toString(),
    (now.getMonth() + 1).toString().padStart(2, '0'),
  );
  fs.mkdirSync(dest, { recursive: true });
  return dest;
}

export function generateFilename(originalName: string): string {
  const ext = extname(originalName).toLowerCase();
  return `${randomUUID()}${ext}`;
}

export function getRelativePath(fullPath: string): string {
  return relative(UPLOAD_ROOT, fullPath).replace(/\\/g, '/');
}
