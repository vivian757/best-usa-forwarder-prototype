import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { chromium } from "playwright";

const url = process.argv[2] || process.env.PROTOTYPE_URL || "http://127.0.0.1:5175/";
const outputDir = "../../.impeccable/review";
await fs.mkdir(outputDir, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
});

async function openReports(page) {
  await page.goto(url, { waitUntil: "networkidle" });
  const openNavigation = page.getByRole("button", { name: "Open navigation", exact: true });
  if (await openNavigation.isVisible()) {
    assert.equal(await openNavigation.evaluate((element) => getComputedStyle(element).color), "rgb(255, 255, 255)", "Mobile navigation icon is white");
    await openNavigation.click();
  }
  await page.locator('.best-sidebar-shell:visible nav [role="button"]').filter({ hasText: "Reports" }).click();
  await page.getByRole("heading", { name: "Reports", exact: true }).waitFor();
}

try {
  const context = await browser.newContext({ viewport: { width: 1155, height: 814 }, reducedMotion: "reduce" });
  const page = await context.newPage();
  await openReports(page);

  const pageHeader = page.locator("header.page-header");
  assert.equal(await pageHeader.getByLabel("Chart analysis").count(), 0, "Chart selector is removed from the page header");
  assert.equal(await pageHeader.getByRole("button", { name: /Chart date range/ }).count(), 0, "Date range is removed from the page header");
  const exportButton = pageHeader.getByRole("button", { name: "Export", exact: true });
  await exportButton.waitFor();
  assert.equal(await exportButton.locator("svg.lucide-download").count(), 1, "Export button carries the download icon");
  assert.equal(await pageHeader.getByRole("button", { name: "Export CSV", exact: true }).count(), 0, "CSV is no longer a separate header button");
  assert.equal(await pageHeader.getByRole("button", { name: "Export PDF", exact: true }).count(), 0, "PDF is no longer a separate header button");

  const filterCard = page.getByRole("region", { name: "Report chart filters" });
  const chartCard = page.locator(".report-chart-card");
  const selector = filterCard.locator('[aria-label="Chart analysis"]');
  const dimensionSelector = filterCard.locator('[aria-label="Chart dimension"]');
  const dateRange = filterCard.getByRole("button", { name: /Chart date range/ });
  const chartTitle = chartCard.getByRole("heading", { level: 2 });
  const typeField = filterCard.locator(".report-chart-type-field");
  const dimensionField = filterCard.locator(".report-chart-dimension-field");
  const dateRangeField = filterCard.locator(".report-date-range-field");
  await selector.waitFor();
  await dimensionSelector.waitFor();
  await filterCard.locator("#report-chart-type-label").waitFor();
  await filterCard.locator("#report-chart-dimension-label").waitFor();
  await dateRange.waitFor();
  assert.equal(await chartCard.getByLabel("Chart analysis").count(), 0, "The chart card contains no filter controls");
  assert.equal(await chartTitle.evaluate((element) => getComputedStyle(element).fontSize), "16px", "Chart title uses the requested 16px size");
  const [filterCardBox, selectorBox, dimensionSelectorBox, dateRangeBox] = await Promise.all([filterCard.boundingBox(), selector.boundingBox(), dimensionSelector.boundingBox(), dateRange.boundingBox()]);
  const [typeFieldBox, dimensionFieldBox, dateRangeFieldBox] = await Promise.all([typeField.boundingBox(), dimensionField.boundingBox(), dateRangeField.boundingBox()]);
  assert.ok(typeFieldBox && dimensionFieldBox && dateRangeFieldBox, "All report filter fields are visible");
  assert.ok(Math.abs(typeFieldBox.width - dimensionFieldBox.width) <= 1 && Math.abs(typeFieldBox.width - dateRangeFieldBox.width) <= 1, "Report filter fields share equal widths");
  assert.ok(filterCardBox && selectorBox && selectorBox.x < filterCardBox.x + 250, "Dropdown sits at the filter card's left");
  assert.ok(selectorBox && dimensionSelectorBox && dimensionSelectorBox.x > selectorBox.x + selectorBox.width, "Dimension follows the chart type control");
  assert.ok(filterCardBox && dateRangeBox && dateRangeBox.x > filterCardBox.x + filterCardBox.width / 2, "Date range sits at the filter card's right");
  assert.equal((await dateRange.textContent()).trim(), "2026/04/01 – 2026/09/30", "A single range field displays the most recent six months");

  await selector.click();
  const grossProfitOption = page.getByRole("option", { name: "Gross profit", exact: true });
  await grossProfitOption.click();
  assert.equal(await chartCard.getAttribute("aria-busy"), "true", "Changing a report condition starts the chart loading transition");
  await chartCard.getByLabel("Updating chart").waitFor();
  await chartCard.getByLabel("Updating chart").waitFor({ state: "hidden" });
  assert.equal(await chartCard.getAttribute("aria-busy"), "false", "Chart loading transition completes");
  await grossProfitOption.waitFor({ state: "hidden" });
  await page.getByRole("heading", { name: "Gross profit by month", exact: true }).waitFor();

  await dimensionSelector.click();
  const customerOption = page.getByRole("option", { name: "Customer", exact: true });
  await customerOption.click();
  await customerOption.waitFor({ state: "hidden" });
  await page.getByRole("heading", { name: "Gross profit by customer", exact: true }).waitFor();
  assert.equal(await chartCard.locator(".report-series-chart").count(), 0, "Categorical customer analysis uses bars instead of a trend line");
  assert.equal(await chartCard.locator(".report-chart-group").count(), 4, "Customer dimension renders four comparison groups");
  await chartCard.getByText("Retail Dist.", { exact: true }).waitFor();

  for (const dimension of [
    { option: "Load type", heading: "Gross profit by load type", groups: 3 },
    { option: "Route", heading: "Gross profit by route", groups: 4 },
    { option: "Customer", heading: "Gross profit by customer", groups: 4 },
  ]) {
    await dimensionSelector.click();
    const option = page.getByRole("option", { name: dimension.option, exact: true });
    await option.click();
    await page.getByRole("heading", { name: dimension.heading, exact: true }).waitFor();
    assert.equal(await chartCard.locator(".report-chart-group").count(), dimension.groups, `${dimension.option} renders the expected comparison groups`);
  }
  await page.keyboard.press("Escape");
  await page.keyboard.press("Home");
  await page.waitForTimeout(250);
  await exportButton.click();
  const exportMenu = page.getByRole("menu", { name: "Export report" });
  await exportMenu.waitFor();
  const exportCsvMenuItem = exportMenu.getByRole("menuitem", { name: "Export CSV", exact: true });
  const exportPdfMenuItem = exportMenu.getByRole("menuitem", { name: "Export PDF", exact: true });
  await exportCsvMenuItem.waitFor();
  await exportPdfMenuItem.waitFor();
  assert.equal(await exportMenu.locator("svg").count(), 0, "Export menu items do not repeat file icons");
  await page.waitForTimeout(250);
  await page.screenshot({ path: `${outputDir}/report-chart-dropdown-desktop.png`, fullPage: false });

  const downloadPromise = page.waitForEvent("download");
  await exportCsvMenuItem.click();
  const download = await downloadPromise;
  assert.equal(download.suggestedFilename(), "best-usa-profit-by-customer-2026-04-01-to-2026-09-30.csv", "CSV filename reflects the selected report state");
  const csv = await fs.readFile(await download.path(), "utf8");
  assert.match(csv, /Gross profit by customer/, "CSV includes the selected report title");
  assert.match(csv, /Demo Retail Distribution LLC/, "CSV includes grouped customer data");
  await exportMenu.waitFor({ state: "hidden" });

  await exportButton.click();
  const popupPromise = page.waitForEvent("popup");
  await page.getByRole("menu", { name: "Export report" }).getByRole("menuitem", { name: "Export PDF", exact: true }).click();
  const pdfPreview = await popupPromise;
  await pdfPreview.getByRole("heading", { name: "Gross profit by customer", exact: true }).waitFor();
  await pdfPreview.getByText(/Grouped by customer/).waitFor();
  await pdfPreview.close();
  await dateRange.click();
  const picker = page.getByRole("region", { name: "Choose chart date range" });
  await picker.waitFor();
  assert.equal(await picker.getByLabel("From").inputValue(), "2026-04-01", "Picker defaults to the first day of the six-month range");
  assert.equal(await picker.getByLabel("To").inputValue(), "2026-09-30", "Picker defaults to the last day of the current month");
  await picker.getByLabel("From").fill("2026-07-01");
  await picker.getByRole("button", { name: "Apply", exact: true }).click();
  await page.getByRole("heading", { name: "Gross profit by customer", exact: true }).waitFor();
  assert.equal(await chartCard.getByText(/Grouped by|synthetic values/).count(), 0, "Chart subtitle is removed");
  await context.close();

  const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
  const mobilePage = await mobileContext.newPage();
  await openReports(mobilePage);
  const mobileFilterCard = mobilePage.getByRole("region", { name: "Report chart filters" });
  await mobilePage.locator("header.page-header").getByRole("button", { name: "Export", exact: true }).waitFor();
  await mobileFilterCard.locator('[aria-label="Chart analysis"]').waitFor();
  await mobileFilterCard.locator('[aria-label="Chart dimension"]').waitFor();
  await mobileFilterCard.getByRole("button", { name: /Chart date range/ }).waitFor();
  const overflow = await mobilePage.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  assert.ok(overflow <= 1, `Reports has no horizontal page overflow on mobile (overflow: ${overflow}px)`);
  await mobilePage.screenshot({ path: `${outputDir}/report-chart-dropdown-mobile.png`, fullPage: false });
  await mobileContext.close();

  console.log(JSON.stringify({
    status: "passed",
    url,
    screenshots: [
      `${outputDir}/report-chart-dropdown-desktop.png`,
      `${outputDir}/report-chart-dropdown-mobile.png`,
    ],
  }, null, 2));
} finally {
  await browser.close();
}
