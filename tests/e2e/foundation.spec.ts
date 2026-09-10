import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";

type Accounts = Record<string, { password: string; id: string }>;
async function accounts(): Promise<Accounts> {
  return JSON.parse(await readFile(".local-data/demo-accounts.json", "utf8"));
}
test("sign in, create user, edit access, audit and logout", async ({
  page,
}) => {
  const data = await accounts();
  await page.goto("/login");
  await expect(
    page.getByRole("heading", { name: "Sign in to your workspace" }),
  ).toBeVisible();
  await page.screenshot({
    path: ".local-data/phase1-login.png",
    fullPage: true,
  });
  await page.getByLabel("Email address").fill("admin@demo.land");
  await page
    .getByLabel("Password", { exact: true })
    .fill(data["admin@demo.land"].password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(
    page.getByRole("heading", { name: "Welcome, Demo Administrator." }),
  ).toBeVisible();
  await page.screenshot({
    path: ".local-data/phase1-workspace.png",
    fullPage: true,
  });
  const cookie = (await page.context().cookies()).find(
    (c) => c.name === "land_session",
  );
  expect(cookie?.httpOnly).toBe(true);
  expect(cookie?.sameSite).toBe("Lax");
  await page
    .getByRole("navigation")
    .getByRole("link", { name: "Users & access" })
    .click();
  await page.getByRole("button", { name: "Add user", exact: true }).click();
  const email = `e2e.${Date.now()}@demo.land`;
  await page.getByLabel("Full name").fill("Browser Test Account");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Initial password").fill(randomUUID());
  await page.getByRole("button", { name: "Create user", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("User created");
  let row = page.getByRole("row").filter({ hasText: email });
  while ((await row.count()) === 0) {
    await page.getByRole("button", { name: "Next", exact: true }).click();
    row = page.getByRole("row").filter({ hasText: email });
  }
  await row.getByRole("button", { name: /Edit access/ }).click();
  await page.getByLabel("Account active").uncheck();
  await page.getByRole("button", { name: "Save access", exact: true }).click();
  await expect(page.getByRole("status")).toContainText(
    "Existing sessions were revoked",
  );
  await expect(page.getByRole("row").filter({ hasText: email })).toContainText(
    "Inactive",
  );
  await page
    .getByRole("navigation")
    .getByRole("link", { name: "Audit history" })
    .click();
  await expect(page.getByRole("table")).toContainText("user / access changed");
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  expect((await page.request.get("/api/v1/auth/me")).status()).toBe(401);
});
test("direct API authorization, no cache leakage and CSRF denial", async ({
  page,
}) => {
  const data = await accounts();
  const anonymous = await page.request.get("/api/v1/users");
  expect(anonymous.status()).toBe(401);
  expect(anonymous.headers()["cache-control"]).toContain("no-store");
  await page.goto("/login");
  await page.getByLabel("Email address").fill("operator@demo.land");
  await page
    .getByLabel("Password", { exact: true })
    .fill(data["operator@demo.land"].password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/dashboard/);
  expect((await page.request.get("/api/v1/users")).status()).toBe(403);
  expect((await page.request.get("/api/v1/audit")).status()).toBe(403);
  expect(
    (
      await page.request.post("/api/v1/users", {
        data: {},
        headers: { origin: "http://127.0.0.1:3000" },
      })
    ).status(),
  ).toBe(403);
  await expect(
    page.getByRole("navigation").getByRole("link", { name: "Users & access" }),
  ).toHaveCount(0);
  await page.goto("/admin/users");
  await expect(
    page.getByRole("heading", { name: "Access restricted" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await page.getByLabel("Email address").fill("admin@demo.land");
  await page
    .getByLabel("Password", { exact: true })
    .fill(data["admin@demo.land"].password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/dashboard/);
  expect(
    (
      await page.request.get(
        `/api/v1/users/${data["external.admin@demo.land"].id}`,
      )
    ).status(),
  ).toBe(404);
  const result = await (await page.request.get("/api/v1/users")).text();
  expect(result).not.toContain("passwordHash");
  expect(result).not.toContain(data["admin@demo.land"].password);
  expect(result).not.toContain("external.admin@demo.land");
});
test("mobile sign-in layout stays inside viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/login");
  await expect(page.getByLabel("Email address")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Sign in", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: ".local-data/phase1-login-mobile.png",
    fullPage: true,
  });
});
