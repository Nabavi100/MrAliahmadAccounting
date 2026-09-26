/**
 * Advanced Cryptographic Shield & Anti-Reversing Security Engine
 *
 * Implements one-way salted cryptographic digests for confidential master access.
 * Plain-text passwords are NEVER stored in source code, bundles, or compiled assets
 * to prevent de-compilation, string extraction, memory dumping, or reverse engineering.
 */

// Secret cryptographic salt used for one-way verification
const SHIELD_SALT_V4 = '__SECURE_VAULT_SHIELD_2026_X9__';

// Pre-computed one-way cryptographic digest of the confidential master key with SHIELD_SALT_V4
const MASTER_KEY_DIGEST = '66c804958eb4e18e486ef7f8c917df612b3b01b5a176f73a885da4295e1e6516';

/**
 * High-performance synchronous bitwise SHA-256 implementation.
 * Zero external dependencies, runs offline in any JavaScript / Web runtime.
 */
function computeDigest(ascii: string): string {
  function rightRotate(value: number, amount: number) {
    return (value >>> amount) | (value << (32 - amount));
  }

  const mathPow = Math.pow;
  const maxWord = mathPow(2, 32);
  const lengthProperty = 'length';
  let i = 0;
  let j = 0;
  let result = '';
  const words: number[] = [];
  const asciiBitLength = ascii[lengthProperty] * 8;
  const hash: number[] = [];
  const k: number[] = [];
  let primeCounter = 0;
  const isComposite: Record<number, boolean> = {};

  for (let candidate = 2; primeCounter < 64; candidate++) {
    if (!isComposite[candidate]) {
      for (i = 0; i < 313; i += candidate) {
        isComposite[i] = true;
      }
      hash[primeCounter] = (mathPow(candidate, 0.5) * maxWord) | 0;
      k[primeCounter++] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
    }
  }

  ascii += '\x80';
  while ((ascii[lengthProperty] % 64) !== 56) ascii += '\x00';

  for (i = 0; i < ascii[lengthProperty]; i++) {
    const code = ascii.charCodeAt(i);
    if (code >> 8) return '';
    words[i >> 2] |= code << ((3 - (i % 4)) * 8);
  }

  words[words[lengthProperty]] = (asciiBitLength / maxWord) | 0;
  words[words[lengthProperty]] = asciiBitLength | 0;

  for (j = 0; j < words[lengthProperty]; ) {
    const w = words.slice(j, (j += 16));
    const oldHash = hash.slice(0);
    for (i = 0; i < 64; i++) {
      const w15 = w[i - 15];
      const w2 = w[i - 2];
      const a = hash[0];
      const e = hash[4];
      const temp1 =
        hash[7] +
        (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25)) +
        ((e & hash[5]) ^ (~e & hash[6])) +
        k[i] +
        (w[i] =
          i < 16
            ? w[i]
            : (w[i - 16] +
                (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3)) +
                w[i - 7] +
                (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10))) |
              0);
      const temp2 =
        (rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22)) +
        ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]));

      hash[7] = hash[6];
      hash[6] = hash[5];
      hash[5] = hash[4];
      hash[4] = (hash[3] + temp1) | 0;
      hash[3] = hash[2];
      hash[2] = hash[1];
      hash[1] = hash[0];
      hash[0] = (temp1 + temp2) | 0;
    }
    for (i = 0; i < 8; i++) {
      hash[i] = (hash[i] + oldHash[i]) | 0;
    }
  }

  for (i = 0; i < 8; i++) {
    for (let i2 = 3; i2 >= 0; i2--) {
      const b = (hash[i] >> (i2 * 8)) & 255;
      result += (b < 16 ? '0' : '') + b.toString(16);
    }
  }
  return result;
}

/**
 * Constant-time comparison to prevent timing attacks.
 */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

/**
 * Verifies if the entered password matches the confidential master key.
 * Compares one-way cryptographic salted hashes without storing or revealing the key.
 */
export function verifyMasterSecurityPassword(input: string): boolean {
  if (!input) return false;
  const trimmed = input.trim();
  if (!trimmed) return false;
  const hash = computeDigest(`${SHIELD_SALT_V4}:${trimmed}`);
  return safeEqual(hash, MASTER_KEY_DIGEST);
}

/**
 * Verifies the company branding & settings protection lock password.
 * Accepts the confidential master password OR a custom password if configured by the user.
 */
export function verifyProtectionLockPassword(
  input: string,
  customPassword?: string,
  adminPassword?: string
): boolean {
  if (!input) return false;
  const trimmed = input.trim();
  if (!trimmed) return false;

  // Master confidential password always unlocks
  if (verifyMasterSecurityPassword(trimmed)) {
    return true;
  }

  // Admin user password fallback if provided
  if (adminPassword && trimmed === adminPassword.trim()) {
    return true;
  }

  // Custom user-defined protection password if set
  if (customPassword && customPassword.trim()) {
    return trimmed === customPassword.trim();
  }

  return false;
}

/**
 * Verifies the license / limit lock master secret PIN.
 */
export function verifyLicenseMasterPin(
  input: string,
  customMasterPin?: string
): boolean {
  if (!input) return false;
  const trimmed = input.trim();
  if (!trimmed) return false;

  // Master confidential password always unlocks
  if (verifyMasterSecurityPassword(trimmed)) {
    return true;
  }

  // Custom master PIN if updated by user
  if (customMasterPin && customMasterPin.trim()) {
    return trimmed === customMasterPin.trim();
  }

  return false;
}
