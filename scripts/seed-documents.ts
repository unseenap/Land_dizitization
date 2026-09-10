import type { PoolClient } from "pg";
import {
  defaultFields,
  jsonSchema,
} from "../src/modules/document-types/contracts";
export async function seedDocumentFoundation(client: PoolClient) {
  const grants: Record<string, string[]> = {
    administrator: [
      "documents.read",
      "document-types.manage",
      "master-data.manage",
    ],
    operator: ["documents.read", "documents.upload"],
    verifier: ["documents.read"],
    gis_officer: ["documents.read"],
    supervisor: ["documents.read"],
  };
  for (const [role, permissions] of Object.entries(grants))
    for (const permission of permissions) {
      await client.query(
        "INSERT INTO permissions(code) VALUES($1) ON CONFLICT DO NOTHING",
        [permission],
      );
      await client.query(
        "INSERT INTO role_permissions(role_code,permission_code) VALUES($1,$2) ON CONFLICT DO NOTHING",
        [role, permission],
      );
    }
  for (const department of (
    await client.query(
      "SELECT id,code FROM departments WHERE code IN ('SYN-A','SYN-B')",
    )
  ).rows) {
    await client.query(
      "INSERT INTO states(department_id,code,name) VALUES($1,$2,$3) ON CONFLICT DO NOTHING",
      [department.id, "DEMO-STATE", "Synthetic State"],
    );
    const state = (
      await client.query(
        "SELECT id FROM states WHERE department_id=$1 AND code=$2",
        [department.id, "DEMO-STATE"],
      )
    ).rows[0].id;
    for (const jurisdiction of (
      await client.query(
        "SELECT id,code,name FROM jurisdictions WHERE department_id=$1",
        [department.id],
      )
    ).rows) {
      await client.query(
        "INSERT INTO districts(department_id,state_id,jurisdiction_id,code,name) VALUES($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING",
        [
          department.id,
          state,
          jurisdiction.id,
          jurisdiction.code,
          jurisdiction.name,
        ],
      );
      const district = (
        await client.query(
          "SELECT id FROM districts WHERE jurisdiction_id=$1",
          [jurisdiction.id],
        )
      ).rows[0].id;
      await client.query(
        "INSERT INTO tehsils(department_id,district_id,code,name) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING",
        [
          department.id,
          district,
          "DEMO-TEHSIL",
          `Synthetic ${jurisdiction.code} Tehsil`,
        ],
      );
      const tehsil = (
        await client.query(
          "SELECT id FROM tehsils WHERE district_id=$1 AND code=$2",
          [district, "DEMO-TEHSIL"],
        )
      ).rows[0].id;
      await client.query(
        "INSERT INTO villages(department_id,tehsil_id,code,name) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING",
        [
          department.id,
          tehsil,
          "DEMO-VILLAGE",
          `Synthetic ${jurisdiction.code} Village`,
        ],
      );
    }
    for (const [code, name] of [
      ["record-of-rights", "Record of Rights"],
      ["mutation", "Mutation Record"],
    ]) {
      await client.query(
        "INSERT INTO document_types(department_id,code,name) VALUES($1,$2,$3) ON CONFLICT DO NOTHING",
        [department.id, code, name],
      );
      const type = (
        await client.query(
          "SELECT id FROM document_types WHERE department_id=$1 AND code=$2",
          [department.id, code],
        )
      ).rows[0].id;
      const fields =
        code === "mutation"
          ? [
              ...defaultFields,
              {
                key: "mutation_number",
                label: "Mutation number",
                type: "text" as const,
                required: true,
                critical: true,
              },
            ]
          : defaultFields;
      await client.query(
        "INSERT INTO document_schema_versions(type_id,department_id,version,fields,json_schema,reason) VALUES($1,$2,1,$3,$4,$5) ON CONFLICT DO NOTHING",
        [
          type,
          department.id,
          JSON.stringify(fields),
          JSON.stringify(jsonSchema(fields)),
          "Synthetic initial schema",
        ],
      );
    }
  }
}
