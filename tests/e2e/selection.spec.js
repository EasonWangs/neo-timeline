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

test("arrow navigation wraps back to the first keypoint", async function({ page }) {
  await page.goto("/timeline.html?name=ming&title=明朝");

  const item = page.locator("#content .item").filter({
    has: page.locator('.dotBox circle[data-index="2"]')
  }).first();
  const dots = item.locator('.dotBox circle[data-index]');
  const pointCount = await dots.count();

  await item.locator('.dotBox circle[data-index="0"]').click({ force: true });
  const firstPopupText = await page.locator(".connection-popup").textContent();

  for (let index = 0; index < pointCount; index += 1) {
    await page.keyboard.press("ArrowRight");
  }

  await expect(page.locator(".connection-popup")).toHaveText(firstPopupText);
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
  await expect(page.locator("#ruler-h text").first()).toHaveText("1300");
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

test("major ruler marks align to round absolute years", async function({ page }) {
  await page.goto("/timeline.html?name=ming&title=明朝");

  const tickStarts = await page.locator("#ruler-h").evaluate(function(ruler) {
    const getTickStart = function(x) {
      const line = Array.from(ruler.querySelectorAll("line")).find(function(node) {
        return Number(node.getAttribute("x1")) === x;
      });
      return Number(line.getAttribute("y1"));
    };

    return {
      1295: getTickStart(0),
      1300: getTickStart(25)
    };
  });

  expect(tickStarts[1295]).toBe(15);
  expect(tickStarts[1300]).toBe(0);
});

test("science uses 100-year major marks and unlabeled 10-year minor marks", async function({ page }) {
  await page.goto("/timeline.html?name=science&title=科学史");

  const ruler = await page.locator("#ruler-h").evaluate(function(node) {
    return {
      labels: Array.from(node.querySelectorAll("text"), function(text) {
        return Number(text.textContent);
      }),
      linePositions: Array.from(node.querySelectorAll("line"), function(line) {
        return Number(line.getAttribute("x1"));
      }).slice(0, 3)
    };
  });

  expect(ruler.labels.length).toBeGreaterThan(1);
  expect(ruler.labels.every(function(value) { return value % 100 === 0; })).toBe(true);
  expect(ruler.linePositions[1] - ruler.linePositions[0]).toBe(10);
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

test("an absolute period layer stays aligned with the ruler while scrolling", async function({ page }) {
  await page.goto("/timeline.html?name=civilization&title=文明史");
  const period = page.locator("#period");
  await expect(period).toHaveCSS("position", "absolute");

  const getPositions = function() {
    return page.evaluate(function() {
      return {
        scrollX: window.scrollX,
        period: document.querySelector("#period rect").getBoundingClientRect().left,
        ruler: document.querySelector("#ruler-h text").getBoundingClientRect().left
      };
    });
  };

  const before = await getPositions();
  await page.evaluate(function() { window.scrollTo(500, 0); });
  await expect.poll(function() { return page.evaluate(function() { return window.scrollX; }); }).toBe(500);
  const after = await getPositions();

  expect(after.period - before.period).toBe(-500);
  expect(after.ruler - before.ruler).toBe(-500);
  expect(after.period - after.ruler).toBe(before.period - before.ruler);
});
