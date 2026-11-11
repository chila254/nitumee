import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

// scrypt from Node's stdlib: no native build step on Vercel, and it is
// deliberately slow. Format: scrypt$N$r$p$salthex$keyhex
const N = 16384;
const r = 8;
const p = 1;
const KEY_LEN = 64;

function derive(password: string, salt: Buffer, n: number, rr: number, pp: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password.normalize("NFKC"), salt, KEY_LEN, { N: n, r: rr, p: pp, maxmem: 64 * 1024 * 1024 }, (err, key) =>
      err ? reject(err) : resolve(key),
    );
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await derive(password, salt, N, r, p);
  return `scrypt$${N}$${r}$${p}$${salt.toString("hex")}$${key.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;
  const [, n, rr, pp, saltHex, keyHex] = parts;
  const expected = Buffer.from(keyHex, "hex");
  const actual = await derive(password, Buffer.from(saltHex, "hex"), Number(n), Number(rr), Number(pp));
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
