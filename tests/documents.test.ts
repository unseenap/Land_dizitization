import "../scripts/env";
import { before, after, test } from "node:test";
import assert from "node:assert/strict";
import { randomBytes, randomUUID, createHash } from "node:crypto";
import { readFile, unlink, readdir, rm } from "node:fs/promises";
import path from "node:path";
import { Pool } from "pg";
import { PDFDocument, PDFName } from "pdf-lib";
import { NextRequest } from "next/server";
import { migrate } from "../scripts/migrate";
import { seed } from "../scripts/seed";
import { samplePdf, sampleImage } from "../scripts/document-fixtures";
import { getPool } from "../src/server/db";
import { storage } from "../src/server/storage";
import { readUpload } from "../src/server/upload-http";
import { login, createUser } from "../src/modules/identity/server/service";
import {
  getMasterData,
  createArea,
} from "../src/modules/master-data/server/service";
import {
  listTypes,
  publishVersion,
  createType,
} from "../src/modules/document-types/server/service";
import { defaultFields } from "../src/modules/document-types/contracts";
import {
  uploadDocument,
  getDocument,
  listDocuments,
  readDocumentFile,
  updateMetadata,
  getDocumentHistory,
  getDocumentPages,
} from "../src/modules/documents/server/service";
import { inspectDocument } from "../src/modules/documents/server/inspect";
import {
  submitProcessing,
  getProcessingJob,
  ingestModelResult,
} from "../src/modules/processing/server/service";
import { runProcessingOnce } from "../src/modules/processing/server/worker";
const suffix = randomBytes(8).toString("hex"),
  dbName = `land_docs_test_${suffix}`,
  accountFile = `.local-data/test-accounts-${suffix}.json`,
  storageRoot = path.resolve(`.local-data/storage-test-${suffix}`);
let owner: Pool,
  control: Pool,
  admin: string,
  operator: string,
  north: string,
  external: string,
  otherOperator: string,
  villageId: string,
  southVillage: string,
  foreignVillage: string,
  schemaId: string,
  typeId: string,
  pdf: Buffer,
  documentId: string;
const denied = (status: number) => (e: unknown) =>
  (e as { status: number }).status === status;
const metadata = () => ({
  title: "Synthetic record",
  villageId,
  schemaVersionId: schemaId,
  language: "English",
  reference: "SYN-001",
  notes: "Fictional test data",
});
const file = () => ({
  name: "synthetic.pdf",
  type: "application/pdf",
  bytes: pdf,
});
before(async () => {
  const original = process.env.MIGRATION_DATABASE_URL!;
  assert.ok(original);
  const root = new URL(original);
  root.pathname = "/postgres";
  owner = new Pool({ connectionString: root.toString() });
  await owner.query(`CREATE DATABASE ${dbName}`);
  const ownerUrl = new URL(original);
  ownerUrl.pathname = `/${dbName}`;
  process.env.MIGRATION_DATABASE_URL = ownerUrl.toString();
  control = new Pool({ connectionString: ownerUrl.toString() });
  const runtime = new URL(process.env.DATABASE_URL!);
  runtime.pathname = `/${dbName}`;
  process.env.DATABASE_URL = runtime.toString();
  process.env.APP_ENV = "test";
  process.env.STORAGE_PATH = storageRoot;
  await migrate();
  await seed(accountFile);
  const accounts = JSON.parse(await readFile(accountFile, "utf8"));
  const sign = async (email: string) =>
    (await login({ email, password: accounts[email].password }, randomUUID()))
      .token;
  admin = await sign("admin@demo.land");
  operator = await sign("operator@demo.land");
  north = await sign("north.admin@demo.land");
  external = await sign("external.admin@demo.land");
  const tree = await getMasterData(operator);
  villageId = tree.villages[0].id;
  southVillage = (await getMasterData(admin)).villages.find(
    (v) => v.id !== villageId,
  )!.id;
  foreignVillage = (await getMasterData(external)).villages[0].id;
  const type = (await listTypes(operator))[0];
  schemaId = type.schemaVersionId;
  typeId = type.id;
  pdf = await samplePdf();
  const password = randomUUID();
  await createUser(
    admin,
    {
      name: "Other Operator",
      email: "other@demo.land",
      password,
      role: "operator",
      scopeIds: accounts["operator@demo.land"].scopeIds,
    },
    randomUUID(),
  );
  otherOperator = (
    await login({ email: "other@demo.land", password }, randomUUID())
  ).token;
});
after(async () => {
  await getPool().end();
  await control?.end();
  if (owner && /^land_docs_test_[a-f0-9]{16}$/.test(dbName)) {
    await owner.query(`DROP DATABASE ${dbName} WITH (FORCE)`);
    await owner.end();
  }
  await unlink(accountFile).catch(() => {});
  const base = path.resolve(".local-data");
  assert.ok(
    storageRoot.startsWith(base + path.sep) &&
      /^storage-test-[a-f0-9]{16}$/.test(path.basename(storageRoot)),
  );
  await rm(storageRoot, { recursive: true, force: true });
});
test("valid upload preserves bytes, safe DTOs, page dimensions and history; retries are idempotent", async () => {
  const key = randomUUID();
  const result = await uploadDocument(
    operator,
    file(),
    metadata(),
    key,
    randomUUID(),
  );
  documentId = result.document.id;
  assert.equal(result.reused, false);
  assert.equal(result.document.pageCount, 2);
  assert.equal(
    result.document.sha256,
    createHash("sha256").update(pdf).digest("hex"),
  );
  assert.equal(
    (
      await readDocumentFile(operator, documentId, "original", randomUUID())
    ).bytes.compare(pdf),
    0,
  );
  assert.ok(!JSON.stringify(result.document).includes("objectKey"));
  assert.equal((await getDocumentPages(operator, documentId)).length, 2);
  assert.equal(
    (await getDocumentHistory(operator, documentId)).metadata.length,
    1,
  );
  const repeat = await uploadDocument(
    operator,
    file(),
    metadata(),
    key,
    randomUUID(),
  );
  assert.equal(repeat.document.id, documentId);
  assert.equal(repeat.reused, true);
  await assert.rejects(
    uploadDocument(
      operator,
      file(),
      { ...metadata(), title: "Changed" },
      key,
      randomUUID(),
    ),
    denied(409),
  );
  assert.equal((await listDocuments(operator)).total, 1);
});
test("scope and role checks protect uploads, originals, previews, pages and history", async () => {
  await assert.rejects(
    uploadDocument(admin, file(), metadata(), randomUUID(), randomUUID()),
    denied(403),
  );
  for (const forbiddenVillage of [southVillage, foreignVillage])
    await assert.rejects(
      uploadDocument(
        operator,
        file(),
        { ...metadata(), villageId: forbiddenVillage },
        randomUUID(),
        randomUUID(),
      ),
      denied(404),
    );
  for (const read of [
    () => getDocument(external, documentId),
    () => readDocumentFile(external, documentId, "original", randomUUID()),
    () => readDocumentFile(external, documentId, "preview", randomUUID()),
    () => getDocumentHistory(external, documentId),
    () => getDocumentPages(external, documentId),
  ])
    await assert.rejects(read(), denied(404));
  assert.equal((await listDocuments(external)).total, 0);
  assert.equal((await getDocument(north, documentId)).id, documentId);
  await assert.rejects(getDocument(undefined, documentId), denied(401));
});
test("schema publication is immutable, scoped and leaves uploaded version unchanged", async () => {
  const type = (await listTypes(admin)).find((t) => t.id === typeId)!;
  const input = {
    expectedVersion: type.version,
    fields: [
      ...type.fields,
      {
        key: "new_field",
        label: "New field",
        type: "text",
        required: false,
        critical: false,
      },
    ],
    reason: "Add optional test field",
  };
  await publishVersion(admin, typeId, input, randomUUID());
  assert.equal(
    (await getDocument(operator, documentId)).schemaVersion,
    type.version,
  );
  assert.equal(
    (await listTypes(operator)).find((t) => t.id === typeId)!.version,
    type.version + 1,
  );
  await assert.rejects(
    publishVersion(admin, typeId, input, randomUUID()),
    denied(409),
  );
  await assert.rejects(
    publishVersion(external, typeId, input, randomUUID()),
    denied(404),
  );
  await assert.rejects(
    createType(
      operator,
      {
        code: "test",
        name: "Test",
        fields: defaultFields,
        reason: "Test creation",
      },
      randomUUID(),
    ),
    denied(403),
  );
  await assert.rejects(
    control.query(
      "UPDATE document_schema_versions SET version=99 WHERE id=$1",
      [schemaId],
    ),
  );
});
test("metadata revisions retain originals and deny stale or other-uploader edits", async () => {
  const input = {
    expectedRevision: 1,
    title: "Corrected title",
    language: "English",
    reference: "SYN-001",
    notes: "Corrected description",
    reason: "Fix synthetic title",
  };
  await assert.rejects(
    updateMetadata(otherOperator, documentId, input, randomUUID()),
    denied(403),
  );
  await updateMetadata(operator, documentId, input, randomUUID());
  await assert.rejects(
    updateMetadata(operator, documentId, input, randomUUID()),
    denied(409),
  );
  const doc = await getDocument(operator, documentId);
  assert.equal(doc.revision, 2);
  assert.equal(doc.title, input.title);
  assert.equal(
    (await getDocumentHistory(operator, documentId)).metadata.length,
    2,
  );
  assert.equal(
    (
      await readDocumentFile(operator, documentId, "original", randomUUID())
    ).bytes.compare(pdf),
    0,
  );
  await assert.rejects(
    getPool().query(
      "UPDATE documents SET original_name='changed.pdf' WHERE id=$1",
      [documentId],
    ),
  );
  await assert.rejects(
    control.query("DELETE FROM document_metadata WHERE document_id=$1", [
      documentId,
    ]),
  );
  await assert.rejects(
    getPool().query("DELETE FROM documents WHERE id=$1", [documentId]),
  );
});
test("JPEG, PNG and single-page TIFF create reencoded private previews", async () => {
  for (const format of ["png", "jpeg", "tiff"] as const) {
    const bytes = await sampleImage(format);
    const result = await uploadDocument(
      operator,
      { name: `synthetic.${format}`, type: `image/${format}`, bytes },
      metadata(),
      randomUUID(),
      randomUUID(),
    );
    const preview = await readDocumentFile(
      operator,
      result.document.id,
      "preview",
      randomUUID(),
    );
    assert.equal(preview.mime, "image/webp");
    assert.equal(preview.bytes.subarray(8, 12).toString(), "WEBP");
    assert.equal(
      (
        await readDocumentFile(
          operator,
          result.document.id,
          "original",
          randomUUID(),
        )
      ).bytes.compare(bytes),
      0,
    );
  }
});
test("invalid files, PDF active content, oversized inputs and page counts are rejected", async () => {
  for (const [name, bytes, mime, status] of [
    ["bad.exe", pdf, "application/pdf", 415],
    ["bad.png", pdf, "image/png", 415],
    ["empty.pdf", Buffer.alloc(0), "application/pdf", 422],
    ["bad.pdf", Buffer.from("%PDF-1.7 corrupt %%EOF"), "application/pdf", 422],
    ["big.pdf", Buffer.alloc(26 * 1024 * 1024), "application/pdf", 413],
  ] as const)
    await assert.rejects(inspectDocument(name, bytes, mime), denied(status));
  const active = await PDFDocument.load(pdf);
  active.catalog.set(
    PDFName.of("OpenAction"),
    active.context.obj({ S: "JavaScript", JS: "app.alert(1)" }),
  );
  await assert.rejects(
    inspectDocument(
      "active.pdf",
      Buffer.from(await active.save()),
      "application/pdf",
    ),
    denied(422),
  );
  process.env.MAX_DOCUMENT_PAGES = "1";
  try {
    await assert.rejects(
      inspectDocument("two.pdf", pdf, "application/pdf"),
      denied(422),
    );
  } finally {
    delete process.env.MAX_DOCUMENT_PAGES;
  }
  await assert.rejects(storage.get("../../.env.local"));
});
test("master-data parents and state creation enforce department and jurisdiction scopes", async () => {
  const local = await getMasterData(north),
    foreign = await getMasterData(external),
    full = await getMasterData(admin);
  const result = await createArea(
    north,
    {
      kind: "village",
      parentId: local.tehsils[0].id,
      name: "Synthetic added village",
      code: "NEW-VILLAGE",
    },
    randomUUID(),
  );
  assert.ok(
    (await getMasterData(operator)).villages.some((v) => v.id === result.id),
  );
  for (const parentId of [
    foreign.tehsils[0].id,
    full.tehsils.find((t) => !local.tehsils.some((x) => x.id === t.id))!.id,
  ])
    await assert.rejects(
      createArea(
        north,
        { kind: "village", parentId, name: "Denied village", code: "DENIED" },
        randomUUID(),
      ),
      denied(404),
    );
  await assert.rejects(
    createArea(
      north,
      { kind: "state", name: "Denied State", code: "DENIED" },
      randomUUID(),
    ),
    denied(403),
  );
  await assert.rejects(
    createArea(
      operator,
      { kind: "state", name: "Denied State", code: "DENIED" },
      randomUUID(),
    ),
    denied(403),
  );
});
test("failed audit rolls back metadata and upload and removes uncommitted objects", async () => {
  const count = (await listDocuments(operator)).total;
  const files = await readdir(storageRoot, { recursive: true });
  await control.query(
    "CREATE FUNCTION fail_document_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.action LIKE 'document.%' THEN RAISE EXCEPTION 'Test audit failure'; END IF; RETURN NEW; END $$; CREATE TRIGGER fail_document_audit BEFORE INSERT ON audit_logs FOR EACH ROW EXECUTE FUNCTION fail_document_audit()",
  );
  try {
    await assert.rejects(
      uploadDocument(operator, file(), metadata(), randomUUID(), randomUUID()),
    );
    await assert.rejects(
      updateMetadata(
        operator,
        documentId,
        {
          expectedRevision: 2,
          title: "Should roll back",
          language: "",
          reference: "",
          notes: "",
          reason: "Rollback test",
        },
        randomUUID(),
      ),
    );
    await assert.rejects(
      readDocumentFile(operator, documentId, "original", randomUUID()),
    );
  } finally {
    await control.query(
      "DROP TRIGGER fail_document_audit ON audit_logs; DROP FUNCTION fail_document_audit()",
    );
  }
  assert.equal((await listDocuments(operator)).total, count);
  assert.equal((await getDocument(operator, documentId)).revision, 2);
  const actual = (await readdir(storageRoot, { recursive: true }))
    .filter((f) => f.endsWith(".bin") || f.endsWith(".webp"))
    .sort();
  assert.deepEqual(
    actual,
    files.filter((f) => f.endsWith(".bin") || f.endsWith(".webp")).sort(),
  );
});
test("multipart boundary parser rejects oversized and unexpected fields", async () => {
  await assert.rejects(
    readUpload(
      new NextRequest("http://localhost/upload", {
        method: "POST",
        headers: {
          "content-type": "multipart/form-data; boundary=test",
          "content-length": String(30 * 1024 * 1024),
        },
        body: "small",
      }),
    ),
    denied(413),
  );
  const form = new FormData();
  form.set(
    "file",
    new File([new Uint8Array(pdf)], "test.pdf", { type: "application/pdf" }),
  );
  form.set("metadata", JSON.stringify(metadata()));
  form.set("unexpected", "value");
  await assert.rejects(
    readUpload(
      new NextRequest("http://localhost/upload", {
        method: "POST",
        body: form,
      }),
    ),
    denied(422),
  );
});

test('same-department foreign district documents are hidden from narrow-scope readers',async()=>{
 const full=await getMasterData(admin);const own=await getMasterData(operator);const district=full.districts.find(d=>!own.districts.some(o=>o.id===d.id))!;
 const password=randomUUID();await createUser(admin,{name:'South Operator',email:'south@demo.land',password,role:'operator',scopeIds:[district.jurisdictionId]},randomUUID());
 const token=(await login({email:'south@demo.land',password},randomUUID())).token;
 const result=await uploadDocument(token,file(),{...metadata(),villageId:southVillage},randomUUID(),randomUUID());
 assert.equal((await getDocument(admin,result.document.id)).id,result.document.id);
 for(const read of [()=>getDocument(north,result.document.id),()=>readDocumentFile(operator,result.document.id,'original',randomUUID()),()=>getDocumentHistory(operator,result.document.id),()=>getDocumentPages(operator,result.document.id)])await assert.rejects(read(),denied(404));
 assert.equal((await listDocuments(operator,{villageId:southVillage})).total,0);
});
test('concurrent identical keys create one document and a preview write failure cleans up its original',async()=>{
 const before=(await listDocuments(operator)).total,key=randomUUID();
 const results=await Promise.all([uploadDocument(operator,file(),metadata(),key,randomUUID()),uploadDocument(operator,file(),metadata(),key,randomUUID())]);
 assert.equal(results[0].document.id,results[1].document.id);assert.equal(results.filter(r=>r.reused).length,1);assert.equal((await listDocuments(operator)).total,before+1);
 const files=(await readdir(storageRoot,{recursive:true})).filter(f=>f.endsWith('.bin')||f.endsWith('.webp')).sort();const originalPut=storage.put;
 storage.put=async(k,b)=>{if(k.endsWith('preview.webp'))throw new Error('Simulated preview storage failure');return originalPut(k,b);};
 try{await assert.rejects(uploadDocument(operator,{name:'failed.png',type:'image/png',bytes:await sampleImage()},metadata(),randomUUID(),randomUUID()));}finally{storage.put=originalPut;}
 assert.equal((await listDocuments(operator)).total,before+1);assert.deepEqual((await readdir(storageRoot,{recursive:true})).filter(f=>f.endsWith('.bin')||f.endsWith('.webp')).sort(),files);
});

test("processing submission is idempotent and mock worker ingests a validated artifact", async () => {
  const queued = await submitProcessing(
    operator,
    documentId,
    { tasks: ["ocr"], languageHints: ["en"] },
    randomUUID(),
  );
  assert.equal(queued.reused, false);
  assert.equal(queued.job.status, "QUEUED");
  const repeated = await submitProcessing(
    operator,
    documentId,
    { tasks: ["ocr"], languageHints: ["en"] },
    randomUUID(),
  );
  assert.equal(repeated.reused, true);
  assert.equal(repeated.job.id, queued.job.id);

  assert.equal(await runProcessingOnce(), true);
  assert.equal(await runProcessingOnce(), true);
  assert.equal(await runProcessingOnce(), false);
  const detail = await getProcessingJob(operator, documentId);
  assert.equal(detail?.job.id, queued.job.id);
  assert.equal(detail?.job.status, "SUCCEEDED");
  assert.equal(detail?.artifacts.length, 1);
  assert.equal(detail?.artifacts[0].accepted, true);
  assert.ok(detail?.attempts.some((row) => row.operation === "submit"));
  assert.ok(detail?.attempts.some((row) => row.operation === "poll"));
});

test("malformed model results are quarantined and cannot complete a job", async () => {
  const image = await sampleImage("png");
  const uploaded = await uploadDocument(
    operator,
    { name: "processing-invalid.png", type: "image/png", bytes: image },
    metadata(),
    randomUUID(),
    randomUUID(),
  );
  const queued = await submitProcessing(
    operator,
    uploaded.document.id,
    { tasks: ["ocr"] },
    randomUUID(),
  );
  const result = await ingestModelResult(queued.job.id, {
    contract_version: "1.0",
    document_id: uploaded.document.id,
  });
  assert.equal(result.accepted, false);
  assert.equal(result.code, "MODEL_INVALID_RESPONSE");
  const detail = await getProcessingJob(operator, uploaded.document.id);
  assert.equal(detail?.job.status, "RESULT_REJECTED");
  assert.equal(detail?.artifacts[0].accepted, false);
});
