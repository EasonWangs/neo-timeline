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

async function getDescriptionBorderGeometry(item) {
  return item.evaluate(function(node) {
    const desc = node.querySelector(".descBox").getBBox();
    const border = node.querySelector(".desc-border").getBBox();
    return {
      descX: desc.x,
      descRight: desc.x + desc.width,
      descY: desc.y,
      descBottom: desc.y + desc.height,
      descHeight: desc.height,
      borderX: border.x,
      borderRight: border.x + border.width,
      borderY: border.y,
      borderBottom: border.y + border.height,
      borderHeight: border.height
    };
  });
}

test("arrow navigation switches the keypoint tooltip without showing contGroup", async function({ page }) {
  await page.goto("/timeline.html?name=ming&title=明朝");

  const item = page.locator("#content .item").filter({
    has: page.locator('.dotBox circle[data-index="2"]')
  }).first();
  await item.locator('.dotBox circle[data-index="0"]').click({ force: true });
  const popup = page.locator(".connection-popup");
  await expect(popup).toBeVisible();
  const firstTooltipText = await popup.textContent();
  await expect(page.locator("#content .currPoint")).toHaveCount(0);
  for (const detail of await item.locator(".contGroup").all()) {
    await expect(detail).toHaveCSS("display", "none");
  }

  await page.keyboard.press("ArrowRight");
  await expect(popup).toBeVisible();
  await expect(popup).not.toHaveText(firstTooltipText);
  await expect(page.locator("#content .currPoint")).toHaveCount(0);
});

test("arrow navigation wraps back to the first keypoint", async function({ page }) {
  await page.goto("/timeline.html?name=ming&title=明朝");

  const item = page.locator("#content .item").filter({
    has: page.locator('.dotBox circle[data-index="2"]')
  }).first();
  const dots = item.locator('.dotBox circle[data-index]');
  const pointCount = await dots.count();

  await item.locator('.dotBox circle[data-index="0"]').click({ force: true });
  const popup = page.locator(".connection-popup");
  const firstTooltipText = await popup.textContent();

  for (let index = 0; index < pointCount; index += 1) {
    await page.keyboard.press("ArrowRight");
  }

  await expect(popup).toHaveText(firstTooltipText);
  await expect(page.locator("#content .currPoint")).toHaveCount(0);
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
  const pinnedPopup = page.locator(".connection-popup:not(.is-hover)");
  await expect(pinnedPopup).toBeVisible();
  const pinnedText = await pinnedPopup.textContent();
  await expect(page.locator("#content .currPoint")).toHaveCount(0);
  const item = keypoint.locator("xpath=ancestor::*[contains(@class, 'item')]");
  for (const detail of await item.locator(".contGroup").all()) {
    await expect(detail).toHaveCSS("display", "none");
  }

  // 固定 tooltip 不应被随后经过的关键点替换，移出后仍保持显示。
  await page.locator("#content .keypoint-hit").nth(1).hover({ force: true });
  await page.mouse.move(0, 0);
  await expect(pinnedPopup).toBeVisible();
  await expect(pinnedPopup).toHaveText(pinnedText);

  await item.locator(".name").click({ force: true });
  await expect(page.locator(".connection-popup")).toHaveCount(0);
  for (const detail of await item.locator(".contGroup").all()) {
    await expect(detail).toHaveCSS("display", "block");
  }
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

test("item exposes its description immediately on hover", async function({ page }) {
  await page.goto("/timeline.html?name=zhou&title=周朝");

  const item = page.locator('#content .item[id="秦国"]');
  await item.locator(".name").hover({ force: true });
  const tooltip = page.locator(".item-title-popup");
  await expect(tooltip).toBeVisible();
  await expect(tooltip).toContainText("秦国");
  await expect(tooltip).toContainText("嬴姓赵氏");
  await expect(tooltip).toContainText("王（前325年起自称）");

  await item.locator(".name").click({ force: true });
  await expect(tooltip).toHaveCount(0);
  const descBox = item.locator(".descBox");
  const descBorder = item.locator(".desc-border");
  await expect(descBox).toHaveCSS("display", "block");
  for (const detail of await item.locator(".contGroup").all()) {
    await expect(detail).toHaveCSS("display", "block");
  }
  await expect(descBox).toContainText("王（前325年起自称）");
  await expect(descBorder).toHaveCSS("display", "block");
  const borderGeometry = await getDescriptionBorderGeometry(item);
  expect(borderGeometry.borderX).toBeLessThan(borderGeometry.descX);
  expect(borderGeometry.borderRight).toBeGreaterThan(borderGeometry.descRight);
  expect(borderGeometry.borderY).toBeLessThan(borderGeometry.descY);
  expect(borderGeometry.borderBottom).toBeGreaterThan(borderGeometry.descBottom);
  expect(borderGeometry.borderHeight).toBeGreaterThan(borderGeometry.descHeight);
  const horizontalLineOrder = await descBox.locator("tspan").evaluateAll(function(lines) {
    return lines.slice().sort(function(a, b) {
      return Number(a.getAttribute("y")) - Number(b.getAttribute("y"));
    }).map(function(line) { return line.textContent; });
  });
  expect(horizontalLineOrder[0]).toContain("嬴姓赵氏");
  expect(horizontalLineOrder.at(-1)).toContain("皇帝（前221年统一全国后改称）");

  const itemRect = item.locator(":scope > rect");
  await itemRect.click({ force: true });
  await expect(item).not.toHaveClass(/show/);
  await expect(descBorder).toHaveCSS("display", "none");
  await itemRect.click({ force: true });
  await expect(item).toHaveClass(/show/);
  await expect(item.locator(".descBox")).toHaveCSS("display", "block");

  await page.locator("#timeline-layout").click();
  await expect(page.locator("#ruler-v")).toHaveCount(1);
  await item.locator(".name").click({ force: true });
  await expect(descBorder).toHaveCSS("display", "block");
  await expect.poll(async function() {
    const geometry = await getDescriptionBorderGeometry(item);
    return geometry.borderX < geometry.descX;
  }).toBe(true);
  const verticalBorderGeometry = await getDescriptionBorderGeometry(item);
  expect(verticalBorderGeometry.borderX).toBeLessThan(verticalBorderGeometry.descX);
  expect(verticalBorderGeometry.borderRight).toBeGreaterThan(verticalBorderGeometry.descRight);
  expect(verticalBorderGeometry.borderY).toBeLessThan(verticalBorderGeometry.descY);
  expect(verticalBorderGeometry.borderBottom).toBeGreaterThan(verticalBorderGeometry.descBottom);
  expect(verticalBorderGeometry.borderHeight).toBeGreaterThan(verticalBorderGeometry.descHeight);
  const verticalLineOrder = await item.locator(".descBox tspan").evaluateAll(function(lines) {
    return lines.slice().sort(function(a, b) {
      return Number(b.getAttribute("x")) - Number(a.getAttribute("x"));
    }).map(function(line) { return line.textContent; });
  });
  expect(verticalLineOrder[0]).toContain("嬴姓赵氏");
  expect(verticalLineOrder.at(-1)).toContain("皇帝（前221年统一全国后改称）");
});

test("default item spacing separates the first row from the ruler", async function({ page }) {
  await page.goto("/timeline.html?name=ming&title=明朝");

  const spacing = await page.locator("#content").evaluate(function(content) {
    const names = Array.from(content.querySelectorAll(".item .name")).slice(0, 2);
    const ruler = document.querySelector("#ruler-h").getBoundingClientRect();
    const first = names[0].getBoundingClientRect();
    const second = names[1].getBoundingClientRect();
    return {
      firstRowGap: first.top - ruler.bottom,
      itemGap: second.top - first.top
    };
  });

  expect(spacing.firstRowGap).toBeGreaterThanOrEqual(18);
  expect(spacing.itemGap).toBe(28);
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
  await expect.poll(async function() {
    const box = await itemRect.boundingBox();
    return box ? box.x - verticalBefore.x : 0;
  }).toBeGreaterThan(25);
  const verticalAfter = await itemRect.boundingBox();
  expect(verticalAfter.x - verticalBefore.x).toBeGreaterThan(25);
  expect(Math.abs(verticalAfter.y - verticalBefore.y)).toBeLessThan(2);
});

test("item drag keeps the current viewport after redraw", async function({ page }) {
  await page.setViewportSize({ width: 700, height: 500 });
  await page.goto("/timeline.html?name=newton&title=牛顿时代");

  const itemName = page.locator('#content .item[id="牛顿"] .name');
  await itemName.scrollIntoViewIfNeeded();
  await page.evaluate(function() { window.scrollTo(250, 0); });
  await expect.poll(function() {
    return page.evaluate(function() { return window.scrollX; });
  }).toBe(250);

  const viewportBefore = await page.evaluate(function() {
    return { x: window.scrollX, y: window.scrollY };
  });
  await dragBy(page, itemName, 0, 35);
  const viewportAfter = await page.evaluate(function() {
    return { x: window.scrollX, y: window.scrollY };
  });

  expect(viewportAfter).toEqual(viewportBefore);
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
  await expect.poll(async function() {
    const tops = await getMemberTops();
    return tops.every(function(top, index) {
      return top - memberTopsAfterSingleDrag[index] > 25;
    });
  }).toBe(true);
  const memberTopsAfterGroupDrag = await getMemberTops();
  const outsiderAfter = await outsiderRect.boundingBox();
  const frameAfterGroupDrag = await groupFrame.boundingBox();

  memberTopsAfterGroupDrag.forEach(function(top, index) {
    expect(top - memberTopsAfterSingleDrag[index]).toBeGreaterThan(25);
  });
  expect(Math.abs(outsiderAfter.y - outsiderBefore.y)).toBeLessThan(2);
  expect(frameAfterGroupDrag.y - frameBeforeGroupDrag.y).toBeGreaterThan(25);
});

test("a group-bound period follows group dragging in both layouts", async function({ page }) {
  await page.goto("/timeline.html?name=spectrum&title=光谱史");
  await page.evaluate(async function() {
    const timelineModule = await import("/timeline.js");
    const data = {
      config: {
        start: 1900,
        axes: { time: { px: 4 } },
        g: {
          show: true,
          colors: {
            "测试组": "#d9e3e5",
            "相邻组": "#f4e3b1"
          }
        }
      },
      periods: [
        { name: "分组时期", start: 1905, end: 1935, group: "测试组" },
        { name: "相邻时期", start: 1905, end: 1935, group: "相邻组" }
      ],
      roles: [
        { name: "成员甲", start: 1900, end: 1930, groups: ["测试组"] },
        { name: "成员乙", start: 1910, end: 1940, groups: ["测试组"] },
        { name: "成员丙", start: 1900, end: 1930, groups: ["相邻组"], offset: -2 },
        { name: "成员丁", start: 1910, end: 1940, groups: ["相邻组"] }
      ]
    };
    window.renderGroupPeriodTest = function(layout) {
      timelineModule.initializeTimeline(data, { layout });
    };
    window.renderGroupPeriodTest("h");
  });

  const group = page.locator("#content .group").filter({
    has: page.locator('.item[id="成员甲"]')
  });
  const groupFrame = group.locator(":scope > .block");
  const periodRect = group.locator(':scope > .group-period[data-group="测试组"] > rect');
  const adjacentPeriodRect = page.locator('.group-period[data-group="相邻组"] > rect');
  await expect(periodRect).toHaveCount(1);

  const horizontalPeriodBefore = await periodRect.boundingBox();
  const horizontalAdjacentPeriod = await adjacentPeriodRect.boundingBox();
  const horizontalFrameBefore = await groupFrame.boundingBox();
  const horizontalRuler = await page.locator("#ruler-h").boundingBox();
  expect(horizontalPeriodBefore.y).toBeCloseTo(horizontalRuler.y + horizontalRuler.height, 1);
  expect(horizontalPeriodBefore.y).toBeLessThanOrEqual(horizontalFrameBefore.y + 1);
  expect(horizontalPeriodBefore.y + horizontalPeriodBefore.height)
    .toBeGreaterThanOrEqual(horizontalFrameBefore.y + horizontalFrameBefore.height - 1);
  expect(horizontalPeriodBefore.y + horizontalPeriodBefore.height)
    .toBeCloseTo(horizontalAdjacentPeriod.y, 1);
  await group.evaluate(function(node) {
    node.setAttribute("transform", "translate(0 35)");
  });
  const horizontalPeriodAfter = await periodRect.boundingBox();
  const horizontalFrameAfter = await groupFrame.boundingBox();
  expect(horizontalPeriodAfter.y - horizontalPeriodBefore.y).toBeCloseTo(35, 1);
  expect(horizontalFrameAfter.y - horizontalFrameBefore.y).toBeCloseTo(35, 1);

  await page.evaluate(function() { window.renderGroupPeriodTest("v"); });
  await expect(page.locator("#ruler-v")).toHaveCount(1);
  const verticalPeriodBefore = await periodRect.boundingBox();
  const verticalAdjacentPeriod = await adjacentPeriodRect.boundingBox();
  const verticalFrameBefore = await groupFrame.boundingBox();
  const verticalRuler = await page.locator("#ruler-v").boundingBox();
  expect(verticalPeriodBefore.x).toBeCloseTo(verticalRuler.x + verticalRuler.width, 1);
  expect(verticalPeriodBefore.x).toBeLessThanOrEqual(verticalFrameBefore.x + 1);
  expect(verticalPeriodBefore.x + verticalPeriodBefore.width)
    .toBeGreaterThanOrEqual(verticalFrameBefore.x + verticalFrameBefore.width - 1);
  expect(verticalPeriodBefore.x + verticalPeriodBefore.width)
    .toBeCloseTo(verticalAdjacentPeriod.x, 1);
  await group.evaluate(function(node) {
    node.setAttribute("transform", "translate(35 0)");
  });
  const verticalPeriodAfter = await periodRect.boundingBox();
  const verticalFrameAfter = await groupFrame.boundingBox();
  expect(verticalPeriodAfter.x - verticalPeriodBefore.x).toBeCloseTo(35, 1);
  expect(verticalFrameAfter.x - verticalFrameBefore.x).toBeCloseTo(35, 1);
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

  await expect(page.locator(".connection-popup:not(.is-hover)")).toBeVisible();
  await expect(page.locator("#content .currPoint")).toHaveCount(0);
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
  const majorSpacingAt125 = await getMajorSpacing();

  expect(boardWidthAfter).toBeGreaterThan(boardWidthAt100 * 1.1);
  expect(majorSpacingAt125).toBeCloseTo(majorSpacingAt100 * 1.25, 5);
  await expect.poll(async function() {
    return Math.abs(await getLeftEdgeYear() - leftEdgeYearBefore);
  }).toBeLessThan(1);

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

test("an unaligned automatic start still renders ruler values", async function({ page }) {
  await page.goto("/timeline.html?name=qin2qing&title=秦至清");

  const labels = page.locator("#ruler-h text");
  await expect(labels.first()).toHaveText("-400");
  const values = await labels.allTextContents();
  expect(values.length).toBeGreaterThan(10);
  expect(values.every(function(value) {
    return Number(value) % 100 === 0;
  })).toBe(true);
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

test("month ruler keeps one density across layouts without clipping", async function({ page }) {
  await page.goto("/timeline.html?name=spectrum&title=光谱史");
  await expect(page.locator("#ruler-v")).toHaveCount(1);
  await page.evaluate(async function() {
    const timelineModule = await import("/timeline.js");
    const data = {
      config: {
        start: 2000,
        axes: { time: { px: 120 } }
      },
      periods: [],
      events: [],
      roles: [{ name: "测试项", start: 2000, end: 2004 }]
    };
    window.renderMonthRulerTest = function(layout) {
      timelineModule.initializeTimeline(data, { layout });
    };
    window.renderMonthRulerTest("h");
  });

  const inspectMonthRuler = function(selector, positionAttr, lengthAttr) {
    return page.locator(selector).evaluate(function(ruler, attrs) {
      const labels = Array.from(ruler.querySelectorAll(".month-label"));
      const firstYear = labels[0] && labels[0].getAttribute("data-year");
      const rulerRect = ruler.getBoundingClientRect();
      const labelMonths = labels
        .filter(function(label) { return label.getAttribute("data-year") === firstYear; })
        .map(function(label) { return Number(label.getAttribute("data-month")); });
      const overflowingLabels = labels.flatMap(function(label) {
        const rect = label.getBoundingClientRect();
        const fits = rect.left >= rulerRect.left - 0.5 &&
          rect.right <= rulerRect.right + 0.5 &&
          rect.top >= rulerRect.top - 0.5 &&
          rect.bottom <= rulerRect.bottom + 0.5;
        return fits ? [] : [{
          year: label.getAttribute("data-year"),
          month: label.getAttribute("data-month"),
          rect: { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom },
          ruler: {
            left: rulerRect.left,
            right: rulerRect.right,
            top: rulerRect.top,
            bottom: rulerRect.bottom
          }
        }];
      });
      const tickPositions = Array.from(ruler.querySelectorAll(".month-tick"), function(tick) {
        return Number(tick.getAttribute(attrs.positionAttr));
      });
      return {
        firstYear,
        labelMonths,
        overflowingLabels,
        maxTickPosition: Math.max(...tickPositions),
        length: Number(ruler.getAttribute(attrs.lengthAttr))
      };
    }, { positionAttr, lengthAttr });
  };

  const horizontal = await inspectMonthRuler("#ruler-h", "x1", "width");
  expect(horizontal.labelMonths).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  expect(horizontal.overflowingLabels).toEqual([]);
  expect(horizontal.maxTickPosition).toBeLessThan(horizontal.length);

  await page.evaluate(function() { window.renderMonthRulerTest("v"); });
  await expect(page.locator("#ruler-v")).toHaveCount(1);
  const vertical = await inspectMonthRuler("#ruler-v", "y1", "height");
  expect(vertical.firstYear).toBe(horizontal.firstYear);
  expect(vertical.labelMonths).toEqual(horizontal.labelMonths);
  expect(vertical.overflowingLabels).toEqual([]);
  expect(vertical.maxTickPosition).toBeLessThan(vertical.length);
});

test("events-only timelines expand the scrollable time axis", async function({ page }) {
  await page.goto("/timeline.html?name=spectrum&title=光谱史");
  await expect(page.locator("#ruler-v")).toHaveCount(1);
  await page.evaluate(async function() {
    const timelineModule = await import("/timeline.js");
    const data = {
      config: {
        start: 2000,
        axes: { time: { px: 240 } }
      },
      periods: [],
      events: [
        { name: "起点事件", time: 2000 },
        { name: "最远事件", time: 2010 }
      ],
      roles: []
    };
    window.renderEventsOnlyTest = function(layout) {
      window.eventsOnlyTimeline = timelineModule.initializeTimeline(data, { layout });
      timelineModule.syncTimelineScroll();
    };
    window.renderEventsOnlyTest("h");
  });

  const farEvent = page.locator('#events .text[data-event-index="1"]');
  expect(Number(await page.locator("#content").getAttribute("width"))).toBeGreaterThan(2400);
  await page.evaluate(function() { window.eventsOnlyTimeline.reflow(); });
  const horizontalSize = await page.locator("#content").evaluate(function(content) {
    return { width: content.getAttribute("width"), height: content.getAttribute("height") };
  });
  await page.evaluate(function() {
    window.eventsOnlyTimeline.reflow();
    window.eventsOnlyTimeline.reflow();
  });
  await expect(page.locator("#content")).toHaveAttribute("width", horizontalSize.width);
  await expect(page.locator("#content")).toHaveAttribute("height", horizontalSize.height);
  await expect.poll(function() {
    return page.evaluate(function() { return document.documentElement.scrollWidth; });
  }).toBeGreaterThan(await page.evaluate(function() { return window.innerWidth; }));
  await page.evaluate(function() { window.scrollTo(document.documentElement.scrollWidth, 0); });
  await expect.poll(function() { return page.evaluate(function() { return window.scrollX; }); }).toBeGreaterThan(0);
  await expect.poll(async function() {
    const box = await farEvent.boundingBox();
    return box && box.x;
  }).toBeGreaterThanOrEqual(0);
  expect((await farEvent.boundingBox()).x).toBeLessThan(await page.evaluate(function() { return window.innerWidth; }));

  await page.evaluate(function() {
    window.scrollTo(0, 0);
    window.renderEventsOnlyTest("v");
  });
  expect(Number(await page.locator("#content").getAttribute("height"))).toBeGreaterThan(2400);
  await page.evaluate(function() { window.eventsOnlyTimeline.reflow(); });
  const verticalSize = await page.locator("#content").evaluate(function(content) {
    return { width: content.getAttribute("width"), height: content.getAttribute("height") };
  });
  await page.evaluate(function() {
    window.eventsOnlyTimeline.reflow();
    window.eventsOnlyTimeline.reflow();
  });
  await expect(page.locator("#content")).toHaveAttribute("width", verticalSize.width);
  await expect(page.locator("#content")).toHaveAttribute("height", verticalSize.height);
  await expect.poll(function() {
    return page.evaluate(function() { return document.documentElement.scrollHeight; });
  }).toBeGreaterThan(await page.evaluate(function() { return window.innerHeight; }));
  await page.evaluate(function() { window.scrollTo(0, document.documentElement.scrollHeight); });
  await expect.poll(function() { return page.evaluate(function() { return window.scrollY; }); }).toBeGreaterThan(0);
  await expect.poll(async function() {
    const box = await farEvent.boundingBox();
    return box && box.y;
  }).toBeGreaterThanOrEqual(0);
  expect((await farEvent.boundingBox()).y).toBeLessThan(await page.evaluate(function() { return window.innerHeight; }));
});

test("nationalPolicy events use month and day precision", async function({ page }) {
  const applicationErrors = [];
  page.on("console", function(message) {
    if (message.type() === "error") applicationErrors.push(message.text());
  });
  await page.goto("/timeline.html?name=nationalPolicy&title=国家政策");

  const events = page.locator("#events .common .text");
  await expect(events).toHaveCount(6);
  const november12 = Number(await events.nth(0).getAttribute("x"));
  const december6 = Number(await events.nth(5).getAttribute("x"));
  const expectedDifference = 10 + 5 / 31 * 10 - (11 / 30 * 10);
  expect(december6 - november12).toBeCloseTo(expectedDifference, 6);
  await expect(events.nth(0).locator("title")).toContainText("2013/11/12");
  expect(applicationErrors).toEqual([]);
});

test("slash and dash dates align across every rendered layer", async function({ page }) {
  await page.goto("/timeline.html?name=spectrum&title=光谱史");
  await expect(page.locator("#ruler-v")).toHaveCount(1);
  await page.evaluate(async function() {
    const timelineModule = await import("/timeline.js");
    timelineModule.initializeTimeline({
      config: {
        start: 2013,
        axes: { time: { px: 120 } }
      },
      periods: [{ name: "测试时期", start: "2013-01-01", end: "2014/01/01" }],
      events: [{ name: "测试事件", time: "2013-07-01" }],
      roles: [{
        name: "测试项",
        start: "2013/01/01",
        end: "2014-01-01",
        keypoints: [{ t: "2013/07/01", w: "年中" }]
      }]
    });
  });

  const periodWidth = Number(await page.locator("#period rect").first().getAttribute("width"));
  const itemWidth = Number(await page.locator('#content .item[id="测试项"] > rect').getAttribute("width"));
  const eventX = Number(await page.locator("#events .common .text").getAttribute("x"));
  const keypointX = Number(await page.locator('#content .item[id="测试项"] .dotBox circle[data-index]').getAttribute("cx"));
  expect(periodWidth).toBeCloseTo(120, 8);
  expect(itemWidth).toBeCloseTo(120, 8);
  expect(eventX).toBeCloseTo(60, 8);
  expect(keypointX).toBeCloseTo(60, 8);
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

test("a group-bound period stays aligned with the ruler while scrolling", async function({ page }) {
  await page.goto("/timeline.html?name=civilization&title=文明史");
  await expect(page.locator("#content .group-period").first()).toBeVisible();

  const getPositions = function() {
    return page.evaluate(function() {
      return {
        scrollX: window.scrollX,
        period: document.querySelector("#content .group-period rect").getBoundingClientRect().left,
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
