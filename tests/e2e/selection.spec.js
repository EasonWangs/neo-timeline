import { expect, test } from "@playwright/test";

async function dragBy(page, locator, deltaX, deltaY) {
  await locator.scrollIntoViewIfNeeded();
  const box = await locator.boundingBox();
  expect(box).not.toBeNull();
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + deltaX, y + deltaY, { steps: 6 });
  await page.mouse.up();
}

test("arrow navigation keeps only the current keypoint visible", async function({ page }) {
  await page.goto("/timeline.html?name=ming&title=明朝");

  const item = page.locator("#content .item").filter({
    has: page.locator('.dotBox circle[data-index="2"]')
  }).first();
  await item.locator('.dotBox circle[data-index="0"]').click({ force: true });
  await expect(page.locator("#content .currPoint")).toHaveCount(1);
  await expect(page.locator("#content .currPoint")).toHaveCSS("display", "block");
  await expect(page.locator(".connection-popup")).toHaveCount(0);

  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  await expect(page.locator("#content .currPoint")).toHaveCount(1);
  await expect(page.locator("#content .currPoint")).toHaveCSS("display", "block");
  await expect(page.locator(".connection-popup")).toHaveCount(0);
});

test("arrow navigation wraps back to the first keypoint", async function({ page }) {
  await page.goto("/timeline.html?name=ming&title=明朝");

  const item = page.locator("#content .item").filter({
    has: page.locator('.dotBox circle[data-index="2"]')
  }).first();
  const dots = item.locator('.dotBox circle[data-index]');
  const pointCount = await dots.count();

  await item.locator('.dotBox circle[data-index="0"]').click({ force: true });
  const firstDetailText = await page.locator("#content .currPoint").textContent();

  for (let index = 0; index < pointCount; index += 1) {
    await page.keyboard.press("ArrowRight");
  }

  await expect(page.locator("#content .currPoint")).toHaveText(firstDetailText);
  await expect(page.locator("#content .currPoint")).toHaveCount(1);
  await expect(page.locator(".connection-popup")).toHaveCount(0);
});

test("keypoint shows a temporary popup immediately on hover", async function({ page }) {
  await page.goto("/timeline.html?name=ming&title=明朝");

  const keypoint = page.locator("#content .keypoint-hit").first();
  await keypoint.hover({ force: true });
  await expect(page.locator(".connection-popup.is-hover")).toBeVisible();
  await expect(page.locator("#content .currPoint")).toHaveCount(0);

  await page.mouse.move(0, 0);
  await expect(page.locator(".connection-popup")).toHaveCount(0);

  await keypoint.click({ force: true });
  await expect(page.locator(".connection-popup")).toHaveCount(0);
  await expect(page.locator("#content .currPoint")).toHaveCSS("display", "block");
});

test("connection reveals both endpoint items and their point details", async function({ page }) {
  await page.goto("/timeline.html?name=newton&title=牛顿时代");

  const connection = page.locator("#content .connection").first();
  const fromRole = await connection.getAttribute("data-from-role");
  const toRole = await connection.getAttribute("data-to-role");
  const clickConnection = async function() {
    const point = await connection.locator(".connection-hit").evaluate(function(path) {
      const localPoint = path.getPointAtLength(path.getTotalLength() / 2);
      const screenPoint = localPoint.matrixTransform(path.getScreenCTM());
      return { x: screenPoint.x, y: screenPoint.y };
    });
    await page.mouse.click(point.x, point.y);
  };
  await clickConnection();

  await expect(connection).toHaveClass(/active/);
  await expect(page.locator("#content .item.show")).toHaveCount(2);
  await expect(page.locator("#content .connection-point")).toHaveCount(2);
  const visibleRoles = await page.locator("#content .item.show").evaluateAll(function(items) {
    return items.map(function(item) { return item.id; });
  });
  expect(visibleRoles).toEqual(expect.arrayContaining([fromRole, toRole]));
  for (const detail of await page.locator("#content .connection-point").all()) {
    await expect(detail).toHaveCSS("display", "block");
  }

  await clickConnection();
  await expect(connection).not.toHaveClass(/active/);
  await expect(page.locator("#content .item.show")).toHaveCount(0);
  await expect(page.locator("#content .connection-point")).toHaveCount(0);
});

test("item exposes its configured title immediately on hover", async function({ page }) {
  await page.goto("/timeline.html?name=zhou&title=周朝");

  const item = page.locator('#content .item[id="秦国"]');
  await item.locator(".name").hover({ force: true });
  const tooltip = page.locator(".item-title-popup");
  await expect(tooltip).toBeVisible();
  await expect(tooltip).toContainText("秦国");
  await expect(tooltip).toContainText("王（前325年起自称）");

  await item.locator(".name").click({ force: true });
  await expect(tooltip).toHaveCount(0);
  await expect(item.locator(".descBox")).toHaveCSS("display", "block");
  await expect(item.locator(".descBox")).not.toContainText("王（前325年起自称）");

  const itemRect = item.locator(":scope > rect");
  await itemRect.click({ force: true });
  await expect(item).not.toHaveClass(/show/);
  await itemRect.click({ force: true });
  await expect(item).toHaveClass(/show/);
  await expect(item.locator(".descBox")).toHaveCSS("display", "block");
});

test("item drag follows the cross axis in horizontal and vertical layouts", async function({ page }) {
  await page.goto("/timeline.html?name=newton&title=牛顿时代");

  const connection = page.locator("#content .connection").first();
  const roleName = await connection.getAttribute("data-from-role");
  const item = page.locator(`#content .item[id="${roleName}"]`);
  const itemRect = item.locator(":scope > rect");
  const horizontalBefore = await itemRect.boundingBox();
  const connectionBefore = await connection.locator(".connection-line").getAttribute("d");

  await dragBy(page, item.locator(".name"), 0, 40);
  const horizontalAfter = await itemRect.boundingBox();
  const connectionAfter = await connection.locator(".connection-line").getAttribute("d");
  expect(horizontalAfter.y - horizontalBefore.y).toBeGreaterThan(30);
  expect(Math.abs(horizontalAfter.x - horizontalBefore.x)).toBeLessThan(2);
  expect(connectionAfter).not.toBe(connectionBefore);
  await expect(item).not.toHaveClass(/show/);

  await page.locator("#timeline-layout").click();
  await expect(page.locator("#ruler-v")).toHaveCount(1);
  const verticalBefore = await itemRect.boundingBox();
  await dragBy(page, item.locator(".name"), 35, 0);
  const verticalAfter = await itemRect.boundingBox();
  expect(verticalAfter.x - verticalBefore.x).toBeGreaterThan(25);
  expect(Math.abs(verticalAfter.y - verticalBefore.y)).toBeLessThan(2);
});

test("grouped items can move alone or together from the group title", async function({ page }) {
  await page.goto("/timeline.html?name=newton&title=牛顿时代");

  const group = page.locator("#content .group").filter({
    has: page.locator('.item[id="波义耳"]')
  });
  const members = group.locator(":scope > .item");
  await expect(members).toHaveCount(3);
  const outsiderRect = page.locator('#content .item[id="霍布斯"] > rect');
  const groupFrame = group.locator(":scope > rect");
  const getMemberTops = function() {
    return members.evaluateAll(function(items) {
      return items.map(function(item) {
        return item.querySelector(":scope > rect").getBoundingClientRect().top;
      });
    });
  };

  const initialMemberTops = await getMemberTops();
  const outsiderBefore = await outsiderRect.boundingBox();
  await dragBy(page, members.first().locator(".name"), 0, 35);
  const memberTopsAfterSingleDrag = await getMemberTops();

  expect(memberTopsAfterSingleDrag[0] - initialMemberTops[0]).toBeGreaterThan(25);
  expect(Math.abs(memberTopsAfterSingleDrag[1] - initialMemberTops[1])).toBeLessThan(2);
  expect(Math.abs(memberTopsAfterSingleDrag[2] - initialMemberTops[2])).toBeLessThan(2);

  const frameBeforeGroupDrag = await groupFrame.boundingBox();
  await dragBy(page, group.locator(":scope > .title"), 0, 35);
  const memberTopsAfterGroupDrag = await getMemberTops();
  const outsiderAfter = await outsiderRect.boundingBox();
  const frameAfterGroupDrag = await groupFrame.boundingBox();

  memberTopsAfterGroupDrag.forEach(function(top, index) {
    expect(top - memberTopsAfterSingleDrag[index]).toBeGreaterThan(25);
  });
  expect(Math.abs(outsiderAfter.y - outsiderBefore.y)).toBeLessThan(2);
  expect(frameAfterGroupDrag.y - frameBeforeGroupDrag.y).toBeGreaterThan(25);
});

test("event text drag follows the cross axis in both layouts", async function({ page }) {
  await page.goto("/timeline.html?name=ming&title=明朝");

  const eventText = page.locator("#events .common .text").first();
  const horizontalBefore = await eventText.boundingBox();
  await dragBy(page, eventText, 0, 35);
  const horizontalAfter = await eventText.boundingBox();
  expect(horizontalAfter.y - horizontalBefore.y).toBeGreaterThan(25);
  expect(Math.abs(horizontalAfter.x - horizontalBefore.x)).toBeLessThan(2);

  await page.locator("#timeline-layout").click();
  await expect(page.locator("#ruler-v")).toHaveCount(1);
  const verticalBefore = await eventText.boundingBox();
  await dragBy(page, eventText, 35, 0);
  const verticalAfter = await eventText.boundingBox();
  expect(verticalAfter.x - verticalBefore.x).toBeGreaterThan(25);
  expect(Math.abs(verticalAfter.y - verticalBefore.y)).toBeLessThan(2);
});

test("mobile controls and keypoint selection remain usable", async function({ page }) {
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
  await keypointHit.click({ force: true, position: { x: 18, y: 10 } });

  await expect(page.locator(".connection-popup")).toHaveCount(0);
  await expect(page.locator("#content .currPoint")).toHaveCSS("display", "block");
});

test("zoom rerenders time density from the left edge", async function({ page }) {
  await page.goto("/timeline.html?name=ming&title=明朝");
  await expect(page.locator("#zoom-value")).toHaveText("100%");

  const boardWidthAt100 = Number(await page.locator("#content").getAttribute("width"));
  await page.evaluate(function() { window.scrollTo(600, 0); });
  await expect.poll(function() { return page.evaluate(function() { return window.scrollX; }); }).toBe(600);

  const getLeftEdgeYear = function() {
    return page.locator("#ruler-h").evaluate(function(ruler) {
      const labels = Array.from(ruler.querySelectorAll("text"), function(text) {
        return {
          year: Number(text.textContent),
          x: text.getBoundingClientRect().left
        };
      }).filter(function(label) {
        return Number.isFinite(label.year) && Number.isFinite(label.x);
      });
      const first = labels[0];
      const last = labels[labels.length - 1];
      return first.year + (0 - first.x) *
        (last.year - first.year) / (last.x - first.x);
    });
  };
  const getMajorSpacing = function() {
    return page.locator("#ruler-h").evaluate(function(ruler) {
      const labels = Array.from(ruler.querySelectorAll("text"));
      const first = labels.find(function(text) { return text.textContent === "1300"; });
      const second = labels.find(function(text) { return text.textContent === "1310"; });
      return Number(second.getAttribute("x")) - Number(first.getAttribute("x"));
    });
  };

  const leftEdgeYearBefore = await getLeftEdgeYear();
  const majorSpacingAt100 = await getMajorSpacing();
  await page.locator("#zoom-in").click();
  await expect(page.locator("#zoom-value")).toHaveText("125%");
  const boardWidthAfter = Number(await page.locator("#content").getAttribute("width"));
  const leftEdgeYearAfter = await getLeftEdgeYear();
  const majorSpacingAt125 = await getMajorSpacing();

  expect(boardWidthAfter).toBeGreaterThan(boardWidthAt100 * 1.1);
  expect(majorSpacingAt125).toBeCloseTo(majorSpacingAt100 * 1.25, 5);
  expect(Math.abs(leftEdgeYearAfter - leftEdgeYearBefore)).toBeLessThan(1);

  await page.locator("#zoom-in").click();
  await expect(page.locator("#zoom-value")).toHaveText("150%");
  await page.locator("#timeline-layout").click();
  await expect(page.locator("#zoom-value")).toHaveText("150%");
  await expect(page.locator("#ruler-v")).toHaveCount(1);
});

test("resize keeps only the ruler for the active layout", async function({ page }) {
  await page.goto("/timeline.html?name=ming&title=明朝");
  await expect(page.locator("#ruler-h text").first()).toHaveText("1300");
  await expect(page.locator("#ruler-h")).toHaveCount(1);
  await expect(page.locator("#ruler-h")).toHaveAttribute("height", "26");
  await expect(page.locator("#ruler-v")).toHaveCount(0);

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator("#ruler-h")).toHaveCount(1);
  await expect(page.locator("#ruler-v")).toHaveCount(0);

  await page.locator("#timeline-layout").click();
  await expect(page.locator("#ruler-h")).toHaveCount(0);
  await expect(page.locator("#ruler-v")).toHaveCount(1);
  await expect(page.locator("#ruler-v")).toHaveAttribute("width", "26");

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

    const mainLabel = Array.from(ruler.querySelectorAll("text")).find(function(text) {
      return text.textContent === "1300";
    });
    // 横向标尺文字比刻度线右移 2px；前一个次刻度与主刻度仍相距 10px。
    const mainX = Number(mainLabel.getAttribute("x")) - 2;
    return { minor: getTickStart(mainX - 10), major: getTickStart(mainX) };
  });

  expect(tickStarts.minor).toBe(18);
  expect(tickStarts.major).toBe(0);
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
  const groups = page.locator("#content .group");
  await expect.poll(function() { return groups.count(); }).toBeGreaterThan(0);
  const groupStarts = await groups.evaluateAll(function(nodes) {
    return nodes.map(function(group) { return group.getBBox().x; });
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
  await expect.poll(async function() {
    const position = await getPositions();
    return position.ruler - before.ruler;
  }).toBe(-500);
  const after = await getPositions();

  expect(after.period - before.period).toBe(-500);
  expect(after.ruler - before.ruler).toBe(-500);
  expect(after.period - after.ruler).toBe(before.period - before.ruler);
});
