export interface GenOptions {
  length: number;
  lower: boolean;
  upper: boolean;
  digits: boolean;
  symbols: boolean;
}

const SETS = {
  lower: "abcdefghijkmnopqrstuvwxyz",
  upper: "ABCDEFGHJKLMNPQRSTUVWXYZ",
  digits: "23456789",
  symbols: "!@#$%^&*()-_=+[]{};:,.<>?",
};

export function generatePassword(opts: GenOptions): string {
  const pool =
    (opts.lower ? SETS.lower : "") +
    (opts.upper ? SETS.upper : "") +
    (opts.digits ? SETS.digits : "") +
    (opts.symbols ? SETS.symbols : "");
  const len = Math.max(1, Math.floor(opts.length || 1));
  if (pool.length === 0) return "";
  const out: string[] = new Array(len);
  const buf = new Uint32Array(len);
  crypto.getRandomValues(buf);
  for (let i = 0; i < len; i++) out[i] = pool[buf[i] % pool.length];
  return out.join("");
}
