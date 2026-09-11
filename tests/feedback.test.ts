import "../scripts/env";
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { readFile, unlink, rm } from "node:fs/promises";
import path from "node:path";
import { Pool } from "pg";
import { migrate } from "../scripts/migrate";
import { seed } from "../scripts/seed";
import { samplePdf } from "../scripts/document-fixtures";
import { getPool } from "../src/server/db";
import { login } from "../src/modules/identity/server/service";
import { getMasterData } from "../src/modules/master-data/server/service";
import {
  createType,
  listTypes,
} from "../src/modules/document-types/server/service";
import { uploadDocument } from "../src/modules/documents/server/service";
import {
  ingestModelResult,
  submitProcessing,
} from "../src/modules/processing/server/service";
import {
  approveVerification,
  getVerificationTaskForDocument,
  submitCorrections,
  submitReview,
} from "../src/modules/verification/server/service";
import {
  createFeedbackDataset,
  createFeedbackEvaluation,
  exportFeedbackDataset,
  listFeedbackDatasets,
  listFeedbackEvaluations,
  reviewFeedbackDataset,
} from "../src/modules/feedback/server/service";

const suffix = randomBytes(8).toString("hex");
const dbName = `land_feedback_test_${suffix}`;
const accountFile = `.local-data/test-accounts-${suffix}.json`;
const storageRoot = path.resolve(`.local-data/storage-feedback-test-${suffix}`);
const denied = (status: number) => (error: unknown) =>
  (error as { status: number }).status === status;

let owner: Pool;
let control: Pool;
let admin: string;
let operator: string;
let verifier: string;
let external: string;
let schemaVersionId: string;
let documentId: string;
let datasetId: string;
let evaluationId: string;

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
  verifier = await sign("verifier@demo.land");
  external = await sign("external.admin@demo.land");
});

after(async () => {
  await getPool().end();
  await control?.end();
  if (owner && /^land_feedback_test_[a-f0-9]{16}$/.test(dbName)) {
    await owner.query(`DROP DATABASE ${dbName} WITH (FORCE)`);
    await owner.end();
  }
  await unlink(accountFile).catch(() => {});
  const base = path.resolve(".local-data");
  assert.ok(
    storageRoot.startsWith(base + path.sep) &&
      /^storage-feedback-test-[a-f0-9]{16}$/.test(path.basename(storageRoot)),
  );
  await rm(storageRoot, { recursive: true, force: true });
});

test("feedback preserves approved truth, evaluates accuracy and exports idempotently", async () => {
  const village = (await getMasterData(operator)).villages[0];
  const createdType = await createType(
    admin,
    {
      code: "phase11-feedback-record",
      name: "Phase 11 Feedback Land Record",
      reason: "Synthetic feedback evaluation fixture",
      fields: [
        { key: "owner_name", label: "Owner name", type: "text", required: true, critical: true },
        { key: "survey_number", label: "Survey number", type: "text", required: true, critical: true },
        { key: "area", label: "Area", type: "number", required: true, critical: false },
        { key: "village", label: "Village", type: "text", required: true, critical: false },
      ],
    },
    randomUUID(),
  );
  const type = (await listTypes(admin)).find(
    (item) => item.id === createdType.id,
  )!;
  schemaVersionId = type.schemaVersionId;
  const uploaded = await uploadDocument(
    operator,
    { name: "feedback.pdf", type: "application/pdf", bytes: await samplePdf() },
    {
      title: "Synthetic feedback record",
      villageId: village.id,
      schemaVersionId,
      language: "English, Hindi",
      reference: "FEEDBACK-001",
      notes: "Fictional test data",
    },
    randomUUID(),
    randomUUID(),
  );
  documentId = uploaded.document.id;
  const queued = await submitProcessing(
    operator,
    documentId,
    { tasks: ["ocr", "extract"], languageHints: ["en", "hi"] },
    randomUUID(),
  );
  const remoteJobId = `feedback-${documentId}`;
  await control.query("UPDATE processing_jobs SET remote_job_id=$1 WHERE id=$2", [
    remoteJobId,
    queued.job.id,
  ]);
  const job = (
    await control.query(
      `SELECT j.request_id,j.input_sha256,j.document_revision,sv.version,dt.code
       FROM processing_jobs j
       JOIN document_schema_versions sv ON sv.id=j.schema_version_id
       JOIN document_types dt ON dt.id=sv.type_id
       WHERE j.id=$1`,
      [queued.job.id],
    )
  ).rows[0] as {
    request_id: string;
    input_sha256: string;
    document_revision: number;
    version: number;
    code: string;
  };
  const result = await ingestModelResult(queued.job.id, {
    contract_version: "1.0",
    request_id: job.request_id,
    job_id: remoteJobId,
    document_id: documentId,
    document_revision: job.document_revision,
    input_sha256: job.input_sha256,
    schema_id: job.code,
    schema_version: job.version,
    model: {
      provider: "synthetic-fixture",
      name: "contract-fixture",
      version: "fixture-v1",
      prompt_version: "phase11-test",
    },
    languages: ["en", "hi"],
    classification: { document_type: job.code, confidence: 0.99 },
    pages: [{
      page: 1,
      width: 1000,
      height: 1400,
      ocr_text: "Asha Devi SYN/001 1,250.50",
      blocks: [{ id: "owner", text: "Asha Devi", bbox: [0.1, 0.2, 0.4, 0.25], confidence: 0.96 }],
    }],
    fields: {
      owner_name: {
        value: "Asha Devi",
        confidence: 0.96,
        missing_reason: null,
        evidence: [{ page: 1, block_ids: ["owner"], bbox: [0.1, 0.2, 0.4, 0.25], source_text: "Asha Devi" }],
      },
      survey_number: { value: "syn/001", confidence: 0.95, missing_reason: null, evidence: [] },
      area: { value: "1,250.50", confidence: 0.93, missing_reason: null, evidence: [] },
      village: { value: village.name, confidence: 0.97, missing_reason: null, evidence: [] },
    },
    warnings: [],
    timing: { processing_ms: 12 },
  });
  assert.equal(result.accepted, true);

  const task = await getVerificationTaskForDocument(verifier, documentId);
  assert.ok(task);
  const returned = await submitReview(
    verifier,
    task.task.id,
    {
      expectedStatus: "PENDING_REVIEW",
      action: "RETURN",
      decisions: [],
      reason: "Verify the owner spelling against the source page.",
    },
    randomUUID(),
  );
  assert.equal(returned.task.status, "RETURNED_FOR_EDIT");
  const corrected = await submitCorrections(
    operator,
    task.task.id,
    {
      expectedStatus: "RETURNED_FOR_EDIT",
      corrections: [{
        fieldKey: "owner_name",
        value: "Asha Devi Verified",
        reason: "Corrected from the source register.",
      }],
    },
    randomUUID(),
  );
  const ready = await submitReview(
    verifier,
    task.task.id,
    {
      expectedStatus: "CORRECTED",
      action: "SUBMIT",
      decisions: corrected.fields.map((field) => ({
        fieldKey: field.fieldKey,
        decision: field.fieldKey === "owner_name" ? "ACCEPT_CORRECTION" : "ACCEPT_MODEL",
        correctedValue: field.fieldKey === "owner_name" ? "Asha Devi Verified" : undefined,
        reason: "Human verifier reviewed the source evidence.",
      })),
      reason: "All fields were checked against the source page.",
    },
    randomUUID(),
  );
  assert.equal(ready.task.status, "PENDING_APPROVAL");
  const approved = await approveVerification(
    verifier,
    task.task.id,
    {
      expectedStatus: "PENDING_APPROVAL",
      reason: "Source evidence and the owner correction were reviewed.",
    },
    randomUUID(),
  );
  assert.equal(approved.task.status, "APPROVED");

  const today = new Date().toISOString().slice(0, 10);
  const datasetInput = {
    name: `Phase 11 feedback ${suffix}`,
    fromDate: today,
    toDate: today,
  };
  await assert.rejects(
    createFeedbackDataset(operator, datasetInput, randomUUID()),
    denied(403),
  );
  const dataset = await createFeedbackDataset(
    admin,
    datasetInput,
    randomUUID(),
  );
  datasetId = dataset.id;
  assert.equal(dataset.status, "PENDING_REVIEW");
  assert.equal(dataset.itemCount, 4);
  assert.equal(
    (await listFeedbackDatasets(admin)).items.find(
      (item) => item.id === datasetId,
    )?.itemCount,
    4,
  );

  await assert.rejects(
    createFeedbackEvaluation(
      admin,
      { datasetId, modelVersion: "fixture-v1" },
      randomUUID(),
    ),
    denied(409),
  );
  await assert.rejects(
    reviewFeedbackDataset(
      external,
      datasetId,
      { decision: "APPROVED", reason: "Foreign administrator cannot review." },
      randomUUID(),
    ),
    denied(404),
  );
  const reviewed = await reviewFeedbackDataset(
    admin,
    datasetId,
    {
      decision: "APPROVED",
      reason: "All examples were checked against source evidence.",
    },
    randomUUID(),
  );
  assert.equal(reviewed.status, "APPROVED");
  await assert.rejects(
    reviewFeedbackDataset(
      admin,
      datasetId,
      { decision: "REJECTED", reason: "A reviewed dataset is immutable." },
      randomUUID(),
    ),
    denied(409),
  );
  await assert.rejects(
    control.query(
      "UPDATE feedback_datasets SET review_reason='Illegal edit' WHERE id=$1",
      [datasetId],
    ),
  );

  const evaluation = await createFeedbackEvaluation(
    admin,
    { datasetId, modelVersion: "fixture-v1" },
    randomUUID(),
  );
  evaluationId = evaluation.id;
  const repeatedEvaluation = await createFeedbackEvaluation(
    admin,
    { datasetId, modelVersion: "fixture-v1" },
    randomUUID(),
  );
  assert.equal(repeatedEvaluation.id, evaluationId);
  const listed = (await listFeedbackEvaluations(admin)).items.find(
    (item) => item.id === evaluationId,
  )!;
  assert.equal(listed.metrics.totalExamples, 4);
  assert.equal(listed.metrics.evaluatedFields, 4);
  assert.equal(listed.metrics.correctFields, 3);
  assert.equal(listed.metrics.accuracy, 0.75);
  assert.equal(listed.metrics.correctedFields, 1);
  assert.equal(listed.metrics.correctionRate, 0.25);
  assert.equal(
    listed.metrics.byField.find((metric) => metric.label === "owner_name")
      ?.accuracy,
    0,
  );
  assert.equal(
    listed.metrics.byField.find((metric) => metric.label === "survey_number")
      ?.accuracy,
    1,
  );

  await assert.rejects(
    exportFeedbackDataset(operator, datasetId, randomUUID()),
    denied(403),
  );
  const firstExport = await exportFeedbackDataset(
    verifier,
    datasetId,
    randomUUID(),
  );
  const secondExport = await exportFeedbackDataset(
    verifier,
    datasetId,
    randomUUID(),
  );
  assert.equal(secondExport.id, firstExport.id);
  assert.equal(secondExport.payloadSha256, firstExport.payloadSha256);
  assert.equal(firstExport.payload.automaticRetraining, false);
  assert.equal(firstExport.payload.examples.length, 4);
  assert.equal(firstExport.payload.evaluations.length, 1);
  assert.equal(
    firstExport.payload.examples.find(
      (example) => example.fieldKey === "owner_name",
    )?.truth,
    "Asha Devi Verified",
  );
});
