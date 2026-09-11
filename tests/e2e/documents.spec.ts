import { test, expect, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { randomUUID, createHash } from "node:crypto";
import { writeFixtures } from "../../scripts/document-fixtures";
async function signIn(page: Page, email = "operator@demo.land") {
  const accounts = JSON.parse(
    await readFile(".local-data/demo-accounts.json", "utf8"),
  );
  await page.goto("/login");
  await page.getByLabel("Email address").fill(email);
  await page
    .getByLabel("Password", { exact: true })
    .fill(accounts[email].password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/dashboard/);
}
async function location(page: Page) {
  await page
    .getByRole("combobox", { name: "State", exact: true })
    .selectOption({ index: 1 });
  await page
    .getByRole("combobox", { name: "District", exact: true })
    .selectOption({ index: 1 });
  await page
    .getByRole("combobox", { name: "Tehsil", exact: true })
    .selectOption({ index: 1 });
  await page
    .getByRole("combobox", { name: "Village", exact: true })
    .selectOption({ label: "Synthetic NORTH Village" });
  await page
    .getByRole("combobox", { name: "Document type", exact: true })
    .selectOption({ index: 1 });
}
test.beforeAll(async () => {
  await writeFixtures();
});
test("batch upload, PDF navigation, metadata history, original download and private access", async ({
  page,
}) => {
  await signIn(page);
  await page.goto("/documents/upload");
  await location(page);
  await page.getByLabel("Language", { exact: true }).fill("English");
  await page
    .getByLabel("Choose files or drop them here")
    .setInputFiles([
      ".local-data/fixtures/synthetic-record.pdf",
      ".local-data/fixtures/synthetic-record.png",
    ]);
  await page.getByRole("button", { name: "Upload selected files" }).click();
  await expect(page.getByRole("link", { name: "Open document" })).toHaveCount(
    2,
    { timeout: 30000 },
  );
  await page.screenshot({
    path: ".local-data/phase2-upload.png",
    fullPage: true,
  });
  const links = await page
    .getByRole("link", { name: "Open document" })
    .evaluateAll((nodes) => nodes.map((n) => n.getAttribute("href")!));
  await page.goto("/documents");
  await expect(page.getByRole("table", { name: "Documents" })).toBeVisible();
  await page.screenshot({
    path: ".local-data/ui-documents-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator(".document-card-list article").first()).toBeVisible();
  await expect(page.getByRole("table", { name: "Documents" })).toBeHidden();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.waitForTimeout(300);
  await page.screenshot({
    path: ".local-data/ui-documents-mobile.png",
    fullPage: false,
  });
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto(links[0]);
  await expect(page.getByRole("status")).toHaveText("Page rendered", {
    timeout: 20000,
  });
  await expect(page.getByText("Page 1 of 2", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Next page" }).click();
  await expect(page.getByText("Page 2 of 2", { exact: true })).toBeVisible();
  await expect(page.getByRole("status")).toHaveText("Page rendered");
  await page
    .getByRole("combobox", { name: "Zoom", exact: true })
    .selectOption("1.5");
  await page
    .locator("summary")
    .filter({ hasText: "Edit descriptive metadata" })
    .click();
  await page
    .getByLabel("title", { exact: true })
    .fill("Browser corrected record");
  await page.getByLabel("Reason for change").fill("Correct synthetic title");
  await page.getByRole("button", { name: "Save metadata" }).click();
  await expect(
    page.getByRole("heading", {
      name: "Browser corrected record",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByText("Metadata revision 2", { exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: ".local-data/phase2-document.png",
    fullPage: true,
  });
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("link", { name: "Download original" }).click();
  const download = await downloadPromise;
  const downloaded = await readFile((await download.path())!);
  expect(createHash("sha256").update(downloaded).digest("hex")).toBe(
    createHash("sha256")
      .update(await readFile(".local-data/fixtures/synthetic-record.pdf"))
      .digest("hex"),
  );
  const id = links[0].split("/").pop();
  const content = await page.request.get(`/api/v1/documents/${id}/content`);
  expect(content.headers()["cache-control"]).toContain("no-store");
  expect(content.headers()["x-content-type-options"]).toBe("nosniff");
  await page.goto(links[1]);
  await expect(page.getByRole("img", { name: /Preview of/ })).toBeVisible();
  expect(
    await page
      .getByRole("img", { name: /Preview of/ })
      .evaluate((img: HTMLImageElement) =>
        img.decode().then(() => img.naturalWidth > 0),
      ),
  ).toBe(true);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: ".local-data/phase2-mobile.png",
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.context().clearCookies();
  await signIn(page, "external.admin@demo.land");
  for (const suffix of ["", "/content", "/history", "/pages"])
    expect(
      (await page.request.get(`/api/v1/documents/${id}${suffix}`)).status(),
    ).toBe(404);
});
test("administrator creates hierarchy entry and publishes immutable type versions", async ({
  page,
}) => {
  await signIn(page, "admin@demo.land");
  await page.goto("/admin/master-data");
  await page
    .getByRole("combobox", { name: "Parent area", exact: true })
    .selectOption({ index: 1 });
  const code = `E2E-${Date.now()}`;
  await page.getByLabel("Name", { exact: true }).fill(`Synthetic ${code}`);
  await page.getByLabel("Code", { exact: true }).fill(code);
  await page.getByRole("button", { name: "Create area" }).click();
  await expect(page.getByRole("status")).toHaveText(
    "Administrative area created.",
  );
  await page.goto("/admin/document-types");
  const typeCode = `e2e-${Date.now()}`;
  await page
    .getByLabel("Type name", { exact: true })
    .fill(`Browser schema ${typeCode}`);
  await page.getByLabel("Type code", { exact: true }).fill(typeCode);
  await page
    .getByLabel("Reason for this schema")
    .fill("Create synthetic browser schema");
  await page
    .getByRole("button", { name: "Create document type", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Document type created");
  const row = page.getByRole("row").filter({ hasText: typeCode });
  await expect(row).toContainText("Version 1");
  await page
    .getByRole("combobox", { name: "Action", exact: true })
    .selectOption({ label: `Publish new version: Browser schema ${typeCode}` });
  await page.getByRole("button", { name: "Add field", exact: true }).click();
  await page.getByLabel("Field 4 key").fill("test_reference");
  await page.getByLabel("Field 4 label").fill("Test reference");
  await page
    .getByLabel("Reason for this schema")
    .fill("Add optional reference");
  await page.getByRole("button", { name: "Publish version 2" }).click();
  await expect(row).toContainText("Version 2");
  await page.screenshot({
    path: ".local-data/phase2-types.png",
    fullPage: true,
  });
  const response = await page.request.post("/api/v1/documents/upload", {
    headers: { origin: "http://127.0.0.1:3000" },
  });
  expect(response.status()).toBe(403);
});
test("interrupted upload response can be retried without duplicate and invalid input is rejected", async ({
  page,
}) => {
  await signIn(page);
  await page.goto("/documents/upload");
  await location(page);
  await page
    .getByLabel("Choose files or drop them here")
    .setInputFiles(".local-data/fixtures/synthetic-record.pdf");
  let savedId = "";
  let intercept = true;
  await page.route("**/api/v1/documents/upload", async (route) => {
    if (intercept) {
      intercept = false;
      // Chromium interception omits file bytes from postData. Preserve the
      // original metadata/key and submit the known fixture before losing the response.
      const headers=route.request().headers();
      const body=await new Response(new Uint8Array(route.request().postDataBuffer()!),{headers:{'content-type':headers['content-type']}}).formData();
      const response = await page.request.post(route.request().url(),{
        headers:{origin:headers.origin,'x-csrf-token':headers['x-csrf-token'],'idempotency-key':headers['idempotency-key']},
        multipart:{metadata:String(body.get('metadata')),file:{name:'synthetic-record.pdf',mimeType:'application/pdf',buffer:await readFile('.local-data/fixtures/synthetic-record.pdf')}}
      });
      expect(response.status()).toBe(201);
      savedId = (await response.json()).document.id;
      await route.abort("failed");
    } else await route.continue();
  });
  await page.getByRole("button", { name: "Upload selected files" }).click();
  await expect(
    page.getByRole("button", { name: "Retry failed uploads" }),
  ).toBeEnabled({ timeout: 30000 });
  await page.getByRole("button", { name: "Retry failed uploads" }).click();
  await expect(
    page.getByRole("link", { name: "Open document" }),
  ).toHaveAttribute("href", `/documents/${savedId}`);
  const me = await (await page.request.get("/api/v1/auth/me")).json();
  const tree = await (await page.request.get("/api/v1/master-data")).json();
  const response = await page.request.post("/api/v1/documents/upload", {
    headers: {
      origin: new URL(page.url()).origin,
      "x-csrf-token": me.csrfToken,
      "idempotency-key": randomUUID(),
    },
    multipart: {
      file: {
        name: "malformed.pdf",
        mimeType: "application/pdf",
        buffer: Buffer.from("not a PDF"),
      },
      metadata: JSON.stringify({
        title: "Malformed test",
        villageId: tree.villages[0].id,
        schemaVersionId: null,
      }),
    },
  });
  expect(response.status()).toBe(415);
});
