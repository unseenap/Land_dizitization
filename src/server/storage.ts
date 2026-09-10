import "server-only";
import { mkdir, writeFile, readFile, unlink } from "node:fs/promises";
import path from "node:path";
import { getConfig } from "./config";
import { AppError } from "./errors";
export interface ObjectStorage {
  put(key: string, bytes: Buffer): Promise<void>;
  get(key: string): Promise<Buffer>;
  remove(key: string): Promise<void>;
}
function objectPath(key: string) {
  if (!/^[a-f0-9-]{36}\/(original\.bin|preview\.webp)$/.test(key))
    throw new Error("Invalid object key");
  const root = path.resolve(getConfig().STORAGE_PATH),
    publicRoot = path.resolve("public");
  if (
    root === process.cwd() ||
    root === publicRoot ||
    root.startsWith(publicRoot + path.sep)
  )
    throw new Error("Document storage must be a private directory.");
  const target = path.resolve(root, key);
  if (!target.startsWith(root + path.sep))
    throw new Error("Invalid storage path");
  return target;
}
export const storage: ObjectStorage = {
  async put(key, bytes) {
    const target = objectPath(key);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, bytes, { flag: "wx", mode: 0o600 });
  },
  async get(key) {
    try {
      return await readFile(objectPath(key));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT")
        throw new AppError(
          503,
          "FILE_UNAVAILABLE",
          "The stored file is temporarily unavailable.",
        );
      throw error;
    }
  },
  async remove(key) {
    await unlink(objectPath(key)).catch((error) => {
      if (error.code !== "ENOENT") throw error;
    });
  },
};
