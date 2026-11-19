import { randomUUID } from 'node:crypto';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { config } from '../../../config.js';

const CONTENT_TYPES = Object.freeze({
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
});

export const SUPPORTED_IMAGE_TYPES = Object.keys(CONTENT_TYPES);
const KEY_PATTERN = /^[0-9a-f-]{36}\.(jpg|png|webp)$/;

/** Local filesystem adapter for development. Production adapters implement the same port. */
const localProvider = {
  name: 'local',
  directory: path.resolve(process.cwd(), config.storageLocalDir),

  async put(contentType, bytes) {
    const key = `${randomUUID()}${CONTENT_TYPES[contentType]}`;
    await mkdir(this.directory, { recursive: true });
    await writeFile(path.join(this.directory, key), bytes, { flag: 'wx' });
    return key;
  },

  async assertStored(key) {
    if (!KEY_PATTERN.test(key)) throw new Error('Invalid object key.');
    await readFile(path.join(this.directory, key));
    return true;
  },

  async get(key) {
    if (!KEY_PATTERN.test(key)) throw new Error('Invalid object key.');
    const bytes = await readFile(path.join(this.directory, key));
    const extension = path.extname(key);
    const contentType = Object.entries(CONTENT_TYPES).find(([, ext]) => ext === extension)?.[0];
    return { bytes, contentType };
  },

  async remove(key) {
    if (!KEY_PATTERN.test(key)) return false;
    await unlink(path.join(this.directory, key)).catch(() => {});
    return true;
  },
};

export function getMediaStorageProvider() {
  return config.storageProvider === 'local' ? localProvider : null;
}
