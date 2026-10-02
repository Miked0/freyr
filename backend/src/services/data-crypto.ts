import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes } from 'crypto';

const SEALED = 'v1:';
const TOKEN = 't1:';
const IV_BYTES = 12;
const TAG_BYTES = 16;

function seal(key: Buffer, plain: Buffer): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const body = Buffer.concat([cipher.update(plain), cipher.final()]);
  return SEALED + Buffer.concat([iv, cipher.getAuthTag(), body]).toString('base64url');
}

function open(key: Buffer, sealed: string): Buffer {
  if (!sealed.startsWith(SEALED)) throw new Error('Valor não cifrado.');
  const raw = Buffer.from(sealed.slice(SEALED.length), 'base64url');
  const decipher = createDecipheriv('aes-256-gcm', key, raw.subarray(0, IV_BYTES));
  decipher.setAuthTag(raw.subarray(IV_BYTES, IV_BYTES + TAG_BYTES));
  return Buffer.concat([decipher.update(raw.subarray(IV_BYTES + TAG_BYTES)), decipher.final()]);
}

/** One user's data key: encrypts their sensitive fields and turns texts into lookup tokens. */
export interface UserKey {
  encrypt(text: string): string;
  decrypt(sealed: string): string;
  /** Deterministic, one-way stand-in for a text, so equal texts can still be matched in SQL. */
  token(text: string): string;
}

export interface Keyring {
  /** A new random user key, sealed with the master key, ready to be stored with the user. */
  newWrappedKey(): string;
  unwrap(wrapped: string): UserKey;
  isSealed(value: string | null): boolean;
  isToken(value: string | null): boolean;
}

/**
 * Envelope encryption: the master key (DATA_ENCRYPTION_KEY) only seals the per-user keys stored in the
 * database. Deleting a user's key makes everything sealed with it unreadable.
 */
export function createKeyring(masterSecret: string): Keyring {
  const master = createHash('sha256').update(masterSecret).digest();
  return {
    newWrappedKey: () => seal(master, randomBytes(32)),
    unwrap(wrapped) {
      const key = open(master, wrapped);
      const tokenKey = createHmac('sha256', key).update('token').digest();
      return {
        encrypt: text => seal(key, Buffer.from(text, 'utf8')),
        decrypt: sealed => open(key, sealed).toString('utf8'),
        token: text => TOKEN + createHmac('sha256', tokenKey).update(text).digest('base64url'),
      };
    },
    isSealed: value => !!value && value.startsWith(SEALED),
    isToken: value => !!value && value.startsWith(TOKEN),
  };
}
