import { describe, it, expect } from 'vitest';
import { createKeyring } from './data-crypto';

describe('per-user data keys', () => {
  const keyring = createKeyring('chave-mestra-de-teste');

  it('reads back what it encrypts, with a fresh nonce every time', () => {
    const key = keyring.unwrap(keyring.newWrappedKey());

    const a = key.encrypt('Pix enviado - Fulano de Tal');
    const b = key.encrypt('Pix enviado - Fulano de Tal');

    expect(a).not.toContain('Fulano');
    expect(a).not.toBe(b);
    expect(key.decrypt(a)).toBe('Pix enviado - Fulano de Tal');
  });

  it("cannot read another user's data", () => {
    const ana = keyring.unwrap(keyring.newWrappedKey());
    const bia = keyring.unwrap(keyring.newWrappedKey());

    expect(() => bia.decrypt(ana.encrypt('segredo'))).toThrow();
  });

  it('rejects tampered ciphertext', () => {
    const key = keyring.unwrap(keyring.newWrappedKey());
    const sealed = key.encrypt('segredo');
    const tampered = sealed.slice(0, -2) + (sealed.endsWith('A') ? 'BB' : 'AA');

    expect(() => key.decrypt(tampered)).toThrow();
  });

  it('cannot open a user key with another master key', () => {
    const wrapped = keyring.newWrappedKey();

    expect(() => createKeyring('outra-chave').unwrap(wrapped)).toThrow();
  });

  it('turns the same text into the same token for one user, and a different one for another', () => {
    const ana = keyring.unwrap(keyring.newWrappedKey());
    const bia = keyring.unwrap(keyring.newWrappedKey());

    expect(ana.token('UBER TRIP')).toBe(ana.token('UBER TRIP'));
    expect(ana.token('UBER TRIP')).not.toBe(ana.token('UBER TRIP 2'));
    expect(ana.token('UBER TRIP')).not.toBe(bia.token('UBER TRIP'));
    expect(ana.token('UBER TRIP')).not.toContain('UBER');
  });

  it('tells sealed values and tokens apart from plain text', () => {
    const key = keyring.unwrap(keyring.newWrappedKey());

    expect(keyring.isSealed(key.encrypt('x'))).toBe(true);
    expect(keyring.isSealed('UBER TRIP')).toBe(false);
    expect(keyring.isToken(key.token('x'))).toBe(true);
    expect(keyring.isToken('UBER TRIP')).toBe(false);
  });
});
