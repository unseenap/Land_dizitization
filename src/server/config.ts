import "server-only";
import { z } from "zod";

const schema = z
  .object({
    APP_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    APP_URL: z.url(),
    DATABASE_URL: z.string().regex(/^postgres(ql)?:\/\//),
    DATABASE_POOL_MAX: z.coerce.number().int().min(1).max(50).default(10),
    SESSION_SECRET: z.string().min(32),
    SESSION_HOURS: z.coerce.number().int().min(1).max(24).default(8),
    STORAGE_PROVIDER: z.enum(["local"]).default("local"),
    STORAGE_PATH: z.string().min(1).default(".local-storage"),
    MAX_UPLOAD_MB: z.coerce.number().int().min(1).max(25).default(25),
    MAX_DOCUMENT_PAGES: z.coerce.number().int().min(1).max(100).default(100),
    MAX_BATCH_FILES: z.coerce.number().int().min(1).max(20).default(20),
  })
  .superRefine((value, context) => {
    if (
      value.APP_ENV === "production" &&
      !value.APP_URL.startsWith("https://")
    ) {
      context.addIssue({
        code: "custom",
        path: ["APP_URL"],
        message: "Production requires HTTPS",
      });
    }
  });

export function getConfig() {
  const result = schema.safeParse(process.env);
  if (!result.success)
    throw new Error(
      `Invalid server configuration: ${result.error.issues.map((i) => i.path.join(".")).join(", ")}`,
    );
  return result.data;
}
