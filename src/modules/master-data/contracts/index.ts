import { z } from "zod";
export type Area = { id: string; name: string; code: string };
export type MasterTree = {
  states: Area[];
  districts: (Area & { stateId: string; jurisdictionId: string })[];
  tehsils: (Area & { districtId: string })[];
  villages: (Area & { tehsilId: string })[];
};
export const areaSchema = z
  .object({
    kind: z.enum(["state", "district", "tehsil", "village"]),
    name: z.string().trim().min(2).max(120),
    code: z
      .string()
      .trim()
      .regex(/^[A-Z0-9_-]{2,30}$/),
    parentId: z.uuid().optional(),
    jurisdictionId: z.uuid().optional(),
  })
  .strict();
