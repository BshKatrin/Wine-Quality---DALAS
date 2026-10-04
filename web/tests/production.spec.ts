import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFileSync } from "node:fs";

test.describe("static first page", () => {
  test.use({ javaScriptEnabled: false });
  test("real wines are visible before JavaScript loads", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await expect(page.locator(".wine-card")).toHaveCount(12);
    await expect(page.locator(".data-banner")).toContainText(
      "9,329 test wines",
    );
    await expect(page.getByRole("searchbox")).toBeDisabled();
  });
});

test("hydration preserves saved wines and the chosen theme on narrow phones", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto("/");
  await expect(page.getByRole("searchbox")).toBeEnabled();
  await page.locator(".bookmark-button").first().click();
  await page
    .getByRole("button", { name: "Switch to dark mode", exact: true })
    .click();
  await page.reload();
  await expect(page.getByRole("searchbox")).toBeEnabled();
  await expect(
    page.getByRole("button", { name: "Switch to light mode", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".bookmark-button").first()).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  expect(errors).toEqual([]);
});

test("first wines and explanations work before full search arrives", async ({
  page,
}) => {
  let finish!: () => void;
  const gate = new Promise<void>((resolve) => {
    finish = resolve;
  });
  await page.route("**/catalogue.*.json", async (route) => {
    await gate;
    await route.continue();
  });
  try {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.locator(".wine-card")).toHaveCount(12);
    await expect(
      page.getByText("First wines ready.", { exact: false }),
    ).toBeVisible();
    await expect(page.getByRole("searchbox")).toBeDisabled();
    await expect(
      page.getByRole("button", { name: "Next page", exact: true }),
    ).toBeDisabled();
    const firstIds = await page.locator(".wine-card h2").allTextContents();
    await page
      .getByRole("button", { name: /^Explore / })
      .first()
      .click();
    await expect(
      page.getByRole("img", { name: /SHAP waterfall/ }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Close wine details", exact: true })
      .click();
    finish();
    await expect(page.locator(".results-heading")).toContainText("9,329 wines");
    await expect(page.getByRole("searchbox")).toBeEnabled();
    expect(await page.locator(".wine-card h2").allTextContents()).toEqual(
      firstIds,
    );
    await page.getByRole("searchbox").fill("chardonnay");
    await expect(page.locator(".results-heading")).not.toContainText(
      "9,329 wines",
    );
  } finally {
    finish();
  }
});

test("a failed full catalogue keeps the first page usable and offers retry", async ({
  page,
}) => {
  let failed = false;
  await page.route("**/catalogue.*.json", async (route) => {
    if (!failed) {
      failed = true;
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: "{}",
      });
    } else await route.continue();
  });
  await page.goto("/");
  await expect(page.locator(".wine-card")).toHaveCount(12);
  await expect(
    page.getByText("Full search is unavailable.", { exact: false }),
  ).toBeVisible();
  await expect(page.getByRole("searchbox")).toBeDisabled();
  await page
    .getByRole("button", { name: "Retry full collection", exact: true })
    .click();
  await expect(page.locator(".results-heading")).toContainText("9,329 wines");
  await expect(page.getByRole("searchbox")).toBeEnabled();
});

test("a shared wine beyond the first page waits for the full catalogue", async ({
  page,
}) => {
  const manifest = JSON.parse(
    readFileSync("public/release/manifest.json", "utf8"),
  );
  const index = JSON.parse(readFileSync(`public${manifest.index.url}`, "utf8"));
  const preview = JSON.parse(
    readFileSync(`public${manifest.preview.url}`, "utf8"),
  );
  const wine = index.wines.find(
    (w: { id: string }) =>
      !preview.wines.some((p: { id: string }) => p.id === w.id),
  );
  let finish!: () => void;
  const gate = new Promise<void>((resolve) => {
    finish = resolve;
  });
  await page.route("**/catalogue.*.json", async (route) => {
    await gate;
    await route.continue();
  });
  try {
    await page.goto(`/?wine=${wine.id}`, { waitUntil: "domcontentloaded" });
    await expect(page.locator(".wine-card")).toHaveCount(12);
    await expect(
      page.getByText("Could not open this wine", { exact: true }),
    ).toHaveCount(0);
    finish();
    await expect(
      page.getByRole("img", { name: /SHAP waterfall/ }),
    ).toBeVisible();
    await expect(page.locator(".detail-title")).toHaveText(wine.name);
  } finally {
    finish();
  }
});

test("full release loads lazily; deep links, history, and exact explanations work", async ({
  page,
}) => {
  const assets: string[] = [];
  page.on("request", (request) => assets.push(request.url()));
  await page.goto("/");
  await expect(page.locator(".results-heading")).toContainText("9,329 wines");
  await expect(page.locator(".wine-card")).toHaveCount(12);
  expect(
    assets.filter((url) => /\/details-|\/context-/.test(url)),
  ).toHaveLength(0);
  await page
    .getByRole("button", { name: /^Explore / })
    .first()
    .click();
  await expect(page.getByRole("img", { name: /SHAP waterfall/ })).toBeVisible();
  const firstUrl = page.url();
  expect(firstUrl).toContain("?wine=wine-");
  await page.getByText("View exact feature contributions").click();
  await expect(page.locator("tbody tr")).toHaveCount(103);
  expect(assets.filter((url) => /\/details-/.test(url))).toHaveLength(1);
  expect(assets.filter((url) => /\/context-/.test(url))).toHaveLength(0);
  await page.getByRole("tab", { name: "Feature context" }).click();
  await expect(
    page.getByRole("combobox", { name: "Feature", exact: true }),
  ).toBeVisible();
  expect(assets.filter((url) => /\/context-/.test(url))).toHaveLength(1);
  await page.getByRole("button", { name: "Next wine", exact: true }).click();
  await expect(page).not.toHaveURL(firstUrl);
  const secondUrl = page.url();
  await page.goBack();
  await expect(page).toHaveURL(firstUrl);
  await expect(page.getByRole("img", { name: /SHAP waterfall/ })).toBeVisible();
  await page.goForward();
  await expect(page).toHaveURL(secondUrl);
  await page.reload();
  await expect(page.getByRole("img", { name: /SHAP waterfall/ })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Import collection", exact: true }),
  ).toHaveCount(0);
});

test("failed detail request can be retried", async ({ page }) => {
  let failed = false;
  await page.route("**/release/assets/details-*", async (route) => {
    if (!failed) {
      failed = true;
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: "{}",
      });
    } else await route.continue();
  });
  await page.goto("/");
  await page
    .getByRole("button", { name: /^Explore / })
    .first()
    .click();
  await expect(page.getByText("Could not open this wine")).toBeVisible();
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await expect(page.getByRole("img", { name: /SHAP waterfall/ })).toBeVisible();
});

test("fortified wines and mobile real-data views are accessible", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: "Filters", exact: true }).click();
  await page.getByRole("checkbox", { name: /Fortified/ }).check();
  await page.getByRole("button", { name: "Show 159 wines" }).click();
  await expect(page.locator(".results-heading")).toContainText("159 wines");
  await page
    .getByRole("button", { name: /^Explore / })
    .first()
    .click();
  await expect(page.getByRole("img", { name: /SHAP waterfall/ })).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
});

test("price control remains usable across the real price range", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator(".results-heading")).toContainText("9,329 wines");
  const price = page.getByRole("slider");
  await price.press("Home");
  await expect(price).toHaveAttribute("aria-valuetext", "Up to $0");
  await price.press("ArrowRight");
  await expect(price).toHaveAttribute("aria-valuetext", "Up to $0.01");
  await price.press("End");
  await expect(price).toHaveAttribute("aria-valuetext", "Any price");
  await expect(page.locator(".results-heading")).toContainText("9,329 wines");
});
