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

/**
 * Never trust the browser's Content-Type. Decode the first bytes and derive the
 * real image type; anything unexpected is rejected before it reaches storage.
 */
export function detectImageContentType(bytes) {
  const b = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes || []);
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
  if (b.length >= 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (b.length >= 12 && b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP') return 'image/webp';
  return null;
}

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
