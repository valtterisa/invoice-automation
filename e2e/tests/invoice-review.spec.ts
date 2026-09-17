import { expect, test } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturePdf = path.resolve(__dirname, "../fixtures/dev-services-oy-invoice.pdf");
const apiUrl = process.env.PLAYWRIGHT_API_URL ?? "http://127.0.0.1:3001";

test.describe("invoice review flow", () => {
  test("upload → process → edit → approve → payment task", async ({ page, request }) => {
    test.skip(
      process.env.ANTHROPIC_MOCK !== "true",
      "Set ANTHROPIC_MOCK=true in .env so extraction is deterministic without Claude",
    );

    let apiReady = false;
    try {
      const health = await request.get(`${apiUrl}/health`);
      apiReady = health.ok();
    } catch {
      apiReady = false;
    }

    test.skip(
      !apiReady,
      `API not reachable at ${apiUrl}/health — start MySQL + api (see README)`,
    );

    await page.goto("/invoices");
    await expect(page.getByRole("heading", { name: "Inbox" })).toBeVisible();

    await page.getByTestId("invoice-upload-input").first().setInputFiles(fixturePdf);

    const uploadError = page.getByTestId("invoice-upload-error");
    await Promise.race([
      page.waitForURL(/\/invoices\/[^/]+$/, { timeout: 30_000 }),
      uploadError.waitFor({ state: "visible", timeout: 30_000 }).then(async () => {
        throw new Error(
          `Upload failed: ${((await uploadError.textContent()) ?? "").trim() || "unknown error"} — check AWS S3 credentials and S3_BUCKET`,
        );
      }),
    ]);

    await expect(page.getByTestId("invoice-status")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("invoice-status")).toContainText(/uploaded/i);

    await expect(page.getByTestId("invoice-process")).toBeVisible();
    await page.getByTestId("invoice-process").click();

    await expect(page.getByTestId("invoice-status")).toContainText(/needs review/i, {
      timeout: 60_000,
    });

    await expect(page.getByTestId("extracted-vendor")).toBeVisible();
    await expect(page.getByTestId("extracted-total")).toBeVisible();

    const vendorField = page.getByTestId("field-vendor-name");
    await expect(vendorField).toBeEnabled();
    await vendorField.clear();
    await vendorField.fill("Dev Services Oy");
    await expect(vendorField).toHaveValue("Dev Services Oy");

    await page.getByTestId("invoice-save").click();
    await expect(page.getByTestId("invoice-save")).toBeEnabled({ timeout: 15_000 });
    await expect(page.getByTestId("invoice-save")).toContainText(/save changes/i);

    await expect(page.getByTestId("invoice-approve")).toBeVisible();
    await page.getByTestId("invoice-approve").click();

    await expect(page.getByTestId("invoice-status")).toContainText(/approved/i, {
      timeout: 30_000,
    });

    await expect(page.getByTestId("payment-task")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("payment-task-status")).toContainText(/pending/i);
    await expect(page.getByTestId("payment-task-vendor")).toContainText("Dev Services Oy");
  });
});
