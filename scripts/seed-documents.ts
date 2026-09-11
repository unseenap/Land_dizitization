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

  for (const department of (
    await client.query(
      "SELECT id,code FROM departments WHERE code IN ('SYN-A','SYN-B')",
    )
  ).rows) {
    const villages = (
      await client.query(
        `SELECT v.id,j.code
         FROM villages v
         JOIN tehsils t ON t.id=v.tehsil_id
         JOIN districts d ON d.id=t.district_id
         JOIN jurisdictions j ON j.id=d.jurisdiction_id
         WHERE v.department_id=$1`,
        [department.id],
      )
    ).rows;
    for (const [index, village] of villages.entries()) {
      const longitude = 77 + index * 0.05 + (department.code === "SYN-B" ? 0.8 : 0);
      const latitude = 28 + index * 0.04 + (department.code === "SYN-B" ? 0.6 : 0);
      for (const sequence of [1, 2, 3]) {
        const parcelNumber = `SYN-${department.code}-${village.code}-${String(sequence).padStart(3, "0")}`;
        const geometry =
          sequence === 3
            ? null
            : JSON.stringify({
                type: "Polygon",
                coordinates: [
                  [
                    [longitude, latitude],
                    [longitude + 0.01, latitude],
                    [longitude + 0.01, latitude + 0.008],
                    [longitude, latitude + 0.008],
                    [longitude, latitude],
                  ],
                ],
              });
        await client.query(
          `INSERT INTO gis_parcels(
             department_id,village_id,parcel_number,source_name,source_reference,source_crs,target_crs,
             geometry,missing_geometry_reason,provenance,synthetic
           ) VALUES($1,$2,$3,$4,$5,'EPSG:4326','EPSG:4326',$6,$7,$8,true)
           ON CONFLICT(department_id,village_id,parcel_number) DO NOTHING`,
          [
            department.id,
            village.id,
            parcelNumber,
            "Synthetic cadastral fixture",
            `synthetic-cadastral/${department.code}/${village.code}/${sequence}`,
            geometry,
            sequence === 3
              ? "Synthetic fixture intentionally omits geometry to exercise missing-geometry handling."
              : null,
            JSON.stringify({
              synthetic: true,
              generatedBy: "Local seed script",
              sourceDataset: "Synthetic cadastral fixtures",
              coordinateGeneration: "Static fixture coordinates",
              note: "Not a real-world cadastral boundary",
            }),
          ],
        );
      }
    }
  }
}
