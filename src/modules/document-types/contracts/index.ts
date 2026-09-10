import { z } from "zod";
export const fieldSchema = z
  .object({
    key: z
      .string()
      .regex(/^[a-z][a-z0-9_]{0,49}$/)
      .refine((k) => !["__proto__", "prototype", "constructor"].includes(k)),
    label: z.string().trim().min(1).max(100),
    type: z.enum(["text", "number", "date", "boolean"]),
    required: z.boolean(),
    critical: z.boolean(),
  })
  .strict();
export const fieldsSchema = z
  .array(fieldSchema)
  .min(1)
  .max(50)
  .refine(
    (fields) => new Set(fields.map((f) => f.key)).size === fields.length,
    "Field keys must be unique.",
  );
export type FieldDefinition = z.infer<typeof fieldSchema>;
export const typeSchema = z
  .object({
    code: z
      .string()
      .trim()
      .regex(/^[a-z][a-z0-9_-]{1,39}$/),
    name: z.string().trim().min(2).max(100),
    fields: fieldsSchema,
    reason: z.string().trim().min(3).max(500),
  })
  .strict();
export const versionSchema = z
  .object({
    expectedVersion: z.number().int().positive(),
    fields: fieldsSchema,
    reason: z.string().trim().min(3).max(500),
  })
  .strict();
export type TypeSummary = {
  id: string;
  code: string;
  name: string;
  schemaVersionId: string;
  version: number;
  fields: FieldDefinition[];
};
export function jsonSchema(fields: FieldDefinition[]) {
  return {
    type: "object",
    additionalProperties: false,
    properties: Object.fromEntries(
      fields.map((f) => [
        f.key,
        {
          type: [
            f.type === "text" || f.type === "date" ? "string" : f.type,
            "null",
          ],
          ...(f.type === "date" ? { format: "date" } : {}),
          title: f.label,
        },
      ]),
    ),
    required: fields.map((f) => f.key),
  };
}
export const defaultFields: FieldDefinition[] = [
  {
    key: "owner_name",
    label: "Owner name",
    type: "text",
    required: true,
    critical: true,
  },
  {
    key: "survey_number",
    label: "Survey number",
    type: "text",
    required: true,
    critical: true,
  },
  {
    key: "area",
    label: "Area",
    type: "number",
    required: false,
    critical: false,
  },
];
