import { z } from "zod";
export const roleCodes = [
  "administrator",
  "operator",
  "verifier",
  "gis_officer",
  "supervisor",
] as const;
export const loginSchema = z
  .object({
    email: z
      .email()
      .max(254)
      .transform((v) => v.toLowerCase()),
    password: z.string().min(1).max(128),
  })
  .strict();
export const createUserSchema = z
  .object({
    email: z
      .email()
      .max(254)
      .transform((v) => v.toLowerCase()),
    name: z.string().trim().min(2).max(100),
    password: z.string().min(12).max(128),
    role: z.enum(roleCodes),
    scopeIds: z
      .array(z.uuid())
      .min(1)
      .max(50)
      .refine((v) => new Set(v).size === v.length),
  })
  .strict();
export const updateUserSchema = z
  .object({
    expectedRevision: z.number().int().positive(),
    active: z.boolean(),
    role: z.enum(roleCodes),
    scopeIds: z
      .array(z.uuid())
      .min(1)
      .max(50)
      .refine((v) => new Set(v).size === v.length),
  })
  .strict();
export type Actor = {
  id: string;
  name: string;
  email: string;
  departmentId: string;
  departmentName: string;
  roles: string[];
  permissions: string[];
  scopes: { id: string; name: string }[];
};
