export abstract class StorageService {
  abstract getPublicUrl(relativePath: string): string;
}
