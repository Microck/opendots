import { randomInt } from 'node:crypto';

import { and, eq, isNull } from 'drizzle-orm';
import { dbInstance as db } from '../db/db.js';
import { publisherBundle } from '../db/schema/publisher.js';

const BASE62_ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
const SHORT_CODE_LENGTH = 5;
const SHORT_CODE_REGEX = /^[0-9][0-9A-Za-z]{4}$/;

const BASE = 62;
const REST_LENGTH = SHORT_CODE_LENGTH - 1;
const REST_SPACE = BASE ** REST_LENGTH; // 62^4

function isUniqueConstraintError(error: unknown): boolean {
  const code = (error as { code?: string })?.code;
  if (code === 'SQLITE_CONSTRAINT' || code === 'SQLITE_CONSTRAINT_UNIQUE') {
    return true;
  }

  const message = String((error as { message?: string })?.message ?? '').toLowerCase();
  return message.includes('unique constraint failed');
}

function encodeBase62Fixed(value: number, length: number): string {
  let v = value;
  let out = '';
  for (let i = 0; i < length; i += 1) {
    const remainder = v % BASE;
    out = `${BASE62_ALPHABET[remainder]}${out}`;
    v = Math.floor(v / BASE);
  }
  return out;
}

export function isShortShareCode(code: string): boolean {
  return SHORT_CODE_REGEX.test(code.trim());
}

export function generateShortShareCode(): string {
  // Force a digit prefix so share codes don't collide with common routes/words.
  // Total space: 10 * 62^4 ~= 147 million.
  const prefixIdx = randomInt(0, 10);
  const rest = randomInt(0, REST_SPACE);

  const prefix = BASE62_ALPHABET[prefixIdx];
  return `${prefix}${encodeBase62Fixed(rest, REST_LENGTH)}`;
}

export async function getBundleShareCode(bundleId: string): Promise<string | null> {
  const rows = await db.select({ shareCode: publisherBundle.shareCode })
    .from(publisherBundle)
    .where(eq(publisherBundle.id, bundleId))
    .limit(1);
  const shareCode = rows[0]?.shareCode ?? null;
  return typeof shareCode === 'string' ? shareCode : null;
}

export async function ensureBundleShareCode(bundleId: string): Promise<string | null> {
  const existing = await getBundleShareCode(bundleId);
  if (existing && isShortShareCode(existing)) {
    return existing;
  }

  // Only set shareCode if it is currently null to avoid unstable share URLs.
  for (let attempt = 0; attempt < 24; attempt += 1) {
      const candidate = generateShortShareCode();
      try {
        await db.update(publisherBundle)
          .set({ shareCode: candidate })
          .where(and(eq(publisherBundle.id, bundleId), isNull(publisherBundle.shareCode)));

      const updated = await getBundleShareCode(bundleId);
      if (updated) {
        return updated;
      }
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        continue;
      }
      throw error;
    }
  }

  // If we failed to allocate a short code for any reason, do not block the request.
  return existing;
}

export async function resolveBundleIdFromShortShareCode(code: string): Promise<string | null> {
  const normalized = code.trim();
  if (!isShortShareCode(normalized)) {
    return null;
  }

  const rows = await db.select({ id: publisherBundle.id })
    .from(publisherBundle)
    .where(eq(publisherBundle.shareCode, normalized))
    .limit(1);

  return rows[0]?.id ?? null;
}
