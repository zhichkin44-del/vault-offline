import { argon2idAsync } from "@noble/hashes/argon2.js";

const enc = new TextEncoder();
const dec = new TextDecoder();

function bytesToB64(b: Uint8Array): string {
  let s = "";
  for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
  return btoa(s);
}

export function b64ToBytes(s: string): Uint8Array {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export type KdfInfo =
  | { id: "pbkdf2"; iterations: number }
  | { id: "argon2id"; iterations: number; memory: number; parallelism: number };

export const ARGON2_DEFAULT: KdfInfo = {
  id: "argon2id",
  iterations: 3,
  memory: 65536,
  parallelism: 1,
};

export const PBKDF2_DEFAULT_ITER = 600_000;
export const LEGACY_PBKDF2_ITER = 250_000;

// Bounds for KDF parameters read from a file. A crafted file could otherwise ask
// for gigabytes of memory or billions of iterations and hang the app.
export const KDF_LIMITS = {
  pbkdf2: { minIterations: 100_000, maxIterations: 10_000_000 },
  argon2id: {
    minIterations: 1,
    maxIterations: 16,
    minMemory: 8192, // KiB = 8 MiB
    maxMemory: 1_048_576, // KiB = 1 GiB
    minParallelism: 1,
    maxParallelism: 8,
  },
} as const;

function inRange(n: unknown, min: number, max: number): n is number {
  return typeof n === "number" && Number.isInteger(n) && n >= min && n <= max;
}

/** Returns a clean KdfInfo, or null when the parameters are unknown or out of bounds. */
export function parseKdf(raw: unknown): KdfInfo | null {
  if (!raw || typeof raw !== "object") return null;
  const k = raw as Record<string, unknown>;
  if (k.id === "pbkdf2") {
    const L = KDF_LIMITS.pbkdf2;
    if (!inRange(k.iterations, L.minIterations, L.maxIterations)) return null;
    return { id: "pbkdf2", iterations: k.iterations };
  }
  if (k.id === "argon2id") {
    const L = KDF_LIMITS.argon2id;
    if (
      !inRange(k.iterations, L.minIterations, L.maxIterations) ||
      !inRange(k.memory, L.minMemory, L.maxMemory) ||
      !inRange(k.parallelism, L.minParallelism, L.maxParallelism)
    )
      return null;
    return {
      id: "argon2id",
      iterations: k.iterations,
      memory: k.memory,
      parallelism: k.parallelism,
    };
  }
  return null;
}

export function legacyKdf(v: number): KdfInfo {
  return { id: "pbkdf2", iterations: v === 1 ? LEGACY_PBKDF2_ITER : PBKDF2_DEFAULT_ITER };
}

export function randomSaltB64(): string {
  const s = new Uint8Array(16);
  crypto.getRandomValues(s);
  return bytesToB64(s);
}

async function deriveRaw(master: string, salt: Uint8Array, kdf: KdfInfo): Promise<Uint8Array> {
  if (kdf.id === "pbkdf2") {
    const base = await crypto.subtle.importKey(
      "raw",
      enc.encode(master) as BufferSource,
      "PBKDF2",
      false,
      ["deriveBits"],
    );
    const bits = await crypto.subtle.deriveBits(
      { name: "PBKDF2", salt: salt as BufferSource, iterations: kdf.iterations, hash: "SHA-256" },
      base,
      256,
    );
    return new Uint8Array(bits);
  }
  // The async variant yields to the event loop every few ms, so the UI can
  // show a busy state instead of freezing for the whole derivation.
  return argon2idAsync(enc.encode(master), salt, {
    t: kdf.iterations,
    m: kdf.memory,
    p: kdf.parallelism,
    dkLen: 32,
    version: 0x13,
    asyncTick: 10,
  });
}

export async function deriveKey(
  master: string,
  salt: Uint8Array,
  kdf: KdfInfo,
): Promise<CryptoKey> {
  const raw = await deriveRaw(master, salt, kdf);
  return crypto.subtle.importKey(
    "raw",
    raw as BufferSource,
    "AES-GCM",
    false,
    ["encrypt", "decrypt"],
  );
}

export async function encryptJSON(
  key: CryptoKey,
  obj: unknown,
): Promise<{ iv: string; ct: string }> {
  const iv = new Uint8Array(12);
  crypto.getRandomValues(iv);
  const data = enc.encode(JSON.stringify(obj));
  const buf = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv as BufferSource },
    key,
    data as BufferSource,
  );
  return { iv: bytesToB64(iv), ct: bytesToB64(new Uint8Array(buf)) };
}

export async function decryptJSON(
  key: CryptoKey,
  blob: { iv: string; ct: string },
): Promise<unknown> {
  const plain = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: b64ToBytes(blob.iv) as BufferSource },
    key,
    b64ToBytes(blob.ct) as BufferSource,
  );
  return JSON.parse(dec.decode(plain));
}
