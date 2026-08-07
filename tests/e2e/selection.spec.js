import { expect, test } from "@playwright/test";

test("arrow navigation keeps only the current keypoint visible", async function({ page }) {
  await page.goto("/timeline.html?name=ming&title=明朝");

  const item = page.locator("#content .item").filter({
    has: page.locator('.dotBox circle[data-index="2"]')
  }).first();
  await item.locator('.dotBox circle[data-index="0"]').click({ force: true });
  await expect(page.locator("#content .currPoint")).toHaveCount(1);

  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  await expect(page.locator("#content .currPoint")).toHaveCount(1);
});

test("mobile controls and keypoint details stay inside the viewport", async function({ page }) {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/timeline.html?name=ming&title=明朝");

  const toolbar = page.locator(".timeline-tools");
  await expect(toolbar).toBeVisible();

  const toolbarBox = await toolbar.boundingBox();
  expect(toolbarBox).not.toBeNull();
  expect(toolbarBox.x).toBeGreaterThanOrEqual(0);
  expect(toolbarBox.x + toolbarBox.width).toBeLessThanOrEqual(390);
  expect(toolbarBox.y + toolbarBox.height).toBeLessThanOrEqual(844);

  for (const button of await toolbar.locator("button").all()) {
    const buttonBox = await button.boundingBox();
    expect(buttonBox).not.toBeNull();
    expect(buttonBox.width).toBeGreaterThanOrEqual(44);
    expect(buttonBox.height).toBeGreaterThanOrEqual(44);
  }

  const keypointHit = page.locator(".keypoint-hit").first();
  await keypointHit.scrollIntoViewIfNeeded();
  await keypointHit.click({ position: { x: 18, y: 10 } });

  const popup = page.locator(".connection-popup");
  await expect(popup).toBeVisible();
  const popupBox = await popup.boundingBox();
  expect(popupBox).not.toBeNull();
  expect(popupBox.x).toBeGreaterThanOrEqual(0);
  expect(popupBox.y).toBeGreaterThanOrEqual(0);
  expect(popupBox.x + popupBox.width).toBeLessThanOrEqual(390);
  expect(popupBox.y + popupBox.height).toBeLessThanOrEqual(844);
});

test("resize keeps only the ruler for the active layout", async function({ page }) {
  await page.goto("/timeline.html?name=ming&title=明朝");
  await expect(page.locator("#ruler-h text").first()).toHaveText("1295");
  await expect(page.locator("#ruler-h")).toHaveCount(1);
  await expect(page.locator("#ruler-v")).toHaveCount(0);

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator("#ruler-h")).toHaveCount(1);
  await expect(page.locator("#ruler-v")).toHaveCount(0);

  await page.locator("#timeline-layout").click();
  await expect(page.locator("#ruler-h")).toHaveCount(0);
  await expect(page.locator("#ruler-v")).toHaveCount(1);

  await page.setViewportSize({ width: 844, height: 390 });
  await expect(page.locator("#ruler-h")).toHaveCount(0);
  await expect(page.locator("#ruler-v")).toHaveCount(1);
});

test("a period-only dataset starts at the exact period boundary", async function({ page }) {
  await page.goto("/timeline.html?name=spectrum&title=光谱史");
  await expect(page.locator("#ruler-v text").first()).toHaveText("400");
});

test("automatic start leaves room for the earliest visible group", async function({ page }) {
  await page.goto("/timeline.html?name=AI&title=人工智能史");
  const groupStarts = await page.locator("#content .group").evaluateAll(function(groups) {
    return groups.map(function(group) { return group.getBBox().x; });
  });
  expect(groupStarts.length).toBeGreaterThan(0);
  expect(Math.min(...groupStarts)).toBeGreaterThanOrEqual(0);
});
