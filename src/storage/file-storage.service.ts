import { Injectable } from '@nestjs/common';
import { StorageService } from './storage.service';

@Injectable()
export class FileStorageService implements StorageService {
  getPublicUrl(relativePath: string): string {
    return `/public/files/${relativePath.replace(/\\/g, '/')}`;
  }
}
