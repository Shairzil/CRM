import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';

/**
 * File storage for student documents.
 *
 * Files are written to STORAGE_DIR on disk (default: backend/storage/documents)
 * and only the generated key is saved in Postgres — never the file bytes.
 *
 * To move to S3 / Cloudflare R2 / Firebase Storage later, keep these three
 * method signatures (save / createReadStream / delete) and swap the bodies;
 * nothing else in the app needs to change.
 */
@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly root: string;

  constructor(config: ConfigService) {
    this.root = path.resolve(config.get<string>('STORAGE_DIR') || path.join(process.cwd(), 'storage', 'documents'));
    fs.mkdirSync(this.root, { recursive: true });
    this.logger.log(`Document storage: ${this.root}`);
  }

  /** Saves a file and returns its storage key, e.g. "students/12/3f1c...-passport.pdf". */
  async save(folder: string, originalName: string, buffer: Buffer): Promise<string> {
    const safeFolder = folder.replace(/[^a-zA-Z0-9/_-]/g, '_').replace(/\.\./g, '_');
    const ext = path.extname(originalName || '').toLowerCase().replace(/[^a-z0-9.]/g, '').slice(0, 10);
    const base = path
      .basename(originalName || 'file', path.extname(originalName || ''))
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .slice(0, 60);
    const key = `${safeFolder}/${randomUUID()}-${base}${ext}`;
    const fullPath = this.resolveKey(key);
    await fs.promises.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.promises.writeFile(fullPath, buffer);
    return key;
  }

  createReadStream(key: string): fs.ReadStream {
    const fullPath = this.resolveKey(key);
    if (!fs.existsSync(fullPath)) {
      throw new NotFoundException('File not found in storage.');
    }
    return fs.createReadStream(fullPath);
  }

  async delete(key: string | null | undefined): Promise<void> {
    if (!key) return;
    try {
      await fs.promises.unlink(this.resolveKey(key));
    } catch (err: any) {
      if (err?.code !== 'ENOENT') this.logger.warn(`Could not delete ${key}: ${err?.message}`);
    }
  }

  /** Maps a key to a path inside the storage root and blocks path traversal. */
  private resolveKey(key: string): string {
    const fullPath = path.resolve(this.root, key);
    if (!fullPath.startsWith(this.root + path.sep)) {
      throw new NotFoundException('Invalid file key.');
    }
    return fullPath;
  }
}
