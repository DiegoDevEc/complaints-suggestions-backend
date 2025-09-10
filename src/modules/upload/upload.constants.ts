// upload.constants.ts
import { join } from 'path';

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

export const UPLOAD_ROOT = join(process.cwd(), 'uploads');
