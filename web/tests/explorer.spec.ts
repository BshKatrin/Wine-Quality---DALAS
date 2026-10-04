import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { demoCollection } from "../src/data/demo";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test("browse, filter, sort, paginate, and recover from an empty search", async ({
  page,
}) => {
  const cards = page.locator(".wine-card");
  await expect(cards).toHaveCount(12);
  await page.getByRole("button", { name: "Next page", exact: true }).click();
  await expect(page.getByText("Page 2 of 2")).toBeVisible();
  await page.getByLabel("Search wines, grapes, or regions").fill("cuvee");
  await expect(cards).toHaveCount(2);
  await page.getByLabel("Sort wines").selectOption("price-low");
  await expect(cards.first()).toContainText("Cuvée des Amandiers");
  await page
    .getByRole("combobox", { name: "Country", exact: true })
    .selectOption("France");
  await page.getByRole("checkbox", { name: "Red", exact: false }).check();
  await expect(page.getByText("No wines match just yet.")).toBeVisible();
  await page.getByRole("button", { name: "Clear all filters" }).click();
  await expect(cards).toHaveCount(12);
  await page.getByLabel("Prediction difference").selectOption("far");
  await expect(page.locator(".results-heading")).toContainText("8 wines");
  await page.getByRole("button", { name: "List view", exact: true }).click();
  await expect(page.locator(".wine-grid")).toHaveClass(/list-view/);
});
test("saved wines persist across reload and can be removed", async ({
  page,
}) => {
  const first = page.getByRole("button", { name: /^Save / }).first();
  const name = (await first.getAttribute("aria-label"))!.replace("Save ", "");
  await first.click();
  await page.reload();
  await page.getByRole("button", { name: "Saved 1", exact: true }).click();
  await expect(page.locator(".wine-card")).toHaveCount(1);
  await expect(page.locator(".wine-card")).toContainText(name);
  await page
    .getByRole("button", { name: `Unsave ${name}`, exact: true })
    .click();
  await expect(page.getByText("Your collection starts here.")).toBeVisible();
});
test("explanations, numeric feature context, chart selection and keyboard focus", async ({
  page,
}) => {
  const opener = page.getByRole("button", { name: /^Explore / }).first();
  await opener.click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("img", { name: /SHAP waterfall/ })).toBeVisible();
  await page.getByText("View exact feature contributions").click();
  await expect(page.locator("tbody tr")).toHaveCount(9);
  await page.getByRole("tab", { name: "SHAP breakdown" }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(
    page.getByRole("tab", { name: "Feature context" }),
  ).toBeFocused();
  await page
    .getByRole("combobox", { name: "Feature", exact: true })
    .selectOption("Alcohol");
  await expect(
    page.getByRole("img", { name: /Alcohol value versus/ }),
  ).toBeVisible();
  await page.getByRole("tab", { name: "Rating comparison" }).click();
  await page.locator(".scatter-dot[role=button]").first().focus();
  await page.keyboard.press("Enter");
  await expect(page.locator(".detail-title")).toHaveText(
    demoCollection.wines[0].name,
  );
  await page.getByRole("button", { name: "Next wine", exact: true }).click();
  await expect(page.locator(".detail-title")).not.toHaveText(
    demoCollection.wines[0].name,
  );
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(opener).toBeFocused();
});
test("local import rejects invalid explanations and accepts a valid held-out collection", async ({
  page,
}) => {
  await page
    .getByRole("button", { name: "Import collection", exact: true })
    .click();
  const input = page.getByLabel("Choose collection JSON file");
  const upload = async (data: unknown) =>
    input.setInputFiles({
      name: "wines.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(data)),
    });
  const invalid = structuredClone(demoCollection);
  invalid.wines[0].predictedRating += 0.3;
  await upload(invalid);
  await expect(page.getByRole("alert")).toContainText(
    "must equal its prediction",
  );
  const valid = {
    ...demoCollection,
    source: "test",
    name: "Validation fixture",
    modelName: "Test model",
    wines: demoCollection.wines.slice(0, 2),
  };
  await upload(valid);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.locator(".data-banner")).toContainText(
    "Validation fixture",
  );
  await expect(page.locator(".wine-card")).toHaveCount(2);
  await page
    .getByRole("button", { name: "Model overview", exact: true })
    .click();
  await expect(page.locator(".overview-stats")).toContainText("2");
  await page
    .getByRole("button", { name: "Import collection", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Return to demonstration collection" })
    .click();
  await expect(page.locator(".data-banner")).toContainText("demo collection");
});
test("downloadable example is valid and explicitly illustrative", async ({
  page,
}) => {
  await page
    .getByRole("button", { name: "Import collection", exact: true })
    .click();
  const downloaded = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download example JSON" }).click();
  const file = await downloaded;
  expect(file.suggestedFilename()).toBe("wine-collection-example.json");
  const stream = await file.createReadStream();
  let content = "";
  for await (const chunk of stream!) content += chunk;
  const json = JSON.parse(content);
  expect(json.source).toBe("demo");
  expect(json.wines).toHaveLength(2);
});
for (const theme of ["light", "dark"] as const) {
  test(`${theme} mode is accessible in the collection and explanation dialog`, async ({
    page,
  }) => {
    if (theme === "dark")
      await page.getByRole("button", { name: "Switch to dark mode" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
    await page.waitForTimeout(250);
    expect(
      (
        await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze()
      ).violations,
    ).toEqual([]);
    await page
      .getByRole("button", { name: /^Explore / })
      .first()
      .click();
    expect(
      (
        await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze()
      ).violations,
    ).toEqual([]);
    await page.getByRole("tab", { name: "Feature context" }).click();
    expect(
      (
        await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze()
      ).violations,
    ).toEqual([]);
  });
}
test("mobile filters, details, and overview stay within the viewport", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Filters", exact: true }).click();
  await page.getByRole("checkbox", { name: /White/ }).check();
  await page.getByRole("button", { name: "Show 5 wines" }).click();
  await expect(page.locator(".wine-card")).toHaveCount(5);
  await page
    .getByRole("button", { name: /^Explore / })
    .first()
    .click();
  await page.locator(".detail-tabs").scrollIntoViewIfNeeded();
  await page.getByRole("tab", { name: "Feature context" }).click();
  await expect(
    page.getByRole("combobox", { name: "Feature", exact: true }),
  ).toBeVisible();
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
  await page.getByRole("button", { name: "Close wine details" }).click();
  await page
    .getByRole("button", { name: "Model overview", exact: true })
    .click();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
