import "./env";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

async function files(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  return (
    await Promise.all(
      entries.map((entry) =>
        entry.isDirectory()
          ? files(path.join(directory, entry.name))
          : [path.join(directory, entry.name)],
      ),
    )
  ).flat();
}
async function main() {
  const keys = [
    "DATABASE_URL",
    "MIGRATION_DATABASE_URL",
    "SESSION_SECRET",
    "MODEL_API_KEY",
    "S3_SECRET_KEY",
  ];
  const secrets = keys.flatMap((key) =>
    process.env[key] ? [{ key, value: process.env[key]! }] : [],
  );
  let inspected = 0;
  for (const file of await files(".next/static")) {
    if (!/\.(js|json|map)$/.test(file)) continue;
    const content = await readFile(file, "utf8");
    inspected++;
    for (const secret of secrets)
      if (content.includes(secret.value))
        throw new Error(
          `Server secret ${secret.key} found in client output. Value redacted.`,
        );
  }
  if (!inspected)
    throw new Error("No client JavaScript output found. Build the app first.");
  console.log(
    `Checked ${inspected} client build files: configured server secrets were not found.`,
  );
}
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
