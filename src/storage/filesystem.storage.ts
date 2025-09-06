import { Injectable } from '@nestjs/common';
import { StorageService } from './storage.service';

@Injectable()
export class FilesystemStorageService implements StorageService {
  getPublicUrl(relativePath: string): string {
    return `/public/files/${relativePath.replace(/\\/g, '/')}`;
  }
}
