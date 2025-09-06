import { join } from 'path';

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
export const ALLOWED_MIME_TYPES =
  /^(image\/jpeg|image\/png|image\/webp|video\/mp4|application\/pdf)$/;
export const UPLOAD_ROOT = join(process.cwd(), 'uploads');
