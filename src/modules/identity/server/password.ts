import "server-only";
import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

function derive(password: string, salt: string): Promise<Buffer> {
  return new Promise((resolve, reject) =>
    scrypt(
      password,
      salt,
      64,
      { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 },
      (error, key) => (error ? reject(error) : resolve(key)),
    ),
  );
}
export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  return `scrypt$32768$${salt}$${(await derive(password, salt)).toString("hex")}`;
}
export async function verifyPassword(password: string, stored?: string) {
  const parts = stored?.split("$");
  const valid =
    parts?.length === 4 &&
    parts[0] === "scrypt" &&
    parts[1] === "32768" &&
    /^[a-f0-9]{32}$/.test(parts[2]) &&
    /^[a-f0-9]{128}$/.test(parts[3]);
  const actual = await derive(password, valid ? parts[2] : "0".repeat(32));
  const expected = valid ? Buffer.from(parts[3], "hex") : Buffer.alloc(64);
  return timingSafeEqual(actual, expected) && Boolean(valid);
}
