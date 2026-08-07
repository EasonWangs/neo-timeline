import { describe, expect, it } from "vitest";
import {
  getDatePosition,
  getNextSelectionIndex,
  getRulerInterval,
  getRulerIntervals,
  inferTimelineStart,
  isRulerMajor,
  orientPoint,
  orientRect,
  parseDate
} from "../../timeline-utils.js";

describe("automatic timeline start", function() {
  it("uses the earliest date from periods, events, roles, and keypoints", function() {
    expect(inferTimelineStart({
      periods: [{ start: 1368, end: 1398 }],
      events: [{ time: 1351 }],
      roles: [{ start: 1328, end: 1398, keypoints: [{ t: 1356 }] }]
    }, {
      layout: "h",
      zoom: 5,
      o: { hs: 10 }
    })).toBe(1320);
  });

  it("does not add leading space before the earliest period", function() {
    expect(inferTimelineStart({
      periods: [{ start: -250000, end: -10000 }],
      roles: []
    }, {
      layout: "v",
      zoom: 0.1,
      o: { vs: 1000, vm: 100 }
    })).toBe(-250000);
  });

  it("uses an item margin when it extends before the earliest period", function() {
    expect(inferTimelineStart({
      periods: [{ start: 100, end: 200 }],
      roles: [{ start: 110, end: 180 }]
    }, {
      layout: "h",
      zoom: 1,
      o: { hs: 10, hm: 5 }
    })).toBe(85);
  });

  it("adds extra space when the earliest item belongs to a visible group", function() {
    expect(inferTimelineStart({
      periods: [{ start: 100, end: 200 }],
      roles: [{ start: 110, end: 180, groups: ["group-a"] }]
    }, {
      layout: "h",
      zoom: 1,
      o: { hs: 10, hm: 5 },
      g: { show: true }
    })).toBe(65);
  });

  it("supports approximate and slash-separated dates", function() {
    expect(inferTimelineStart({
      roles: [{ start: "~1905/03", end: "~", keypoints: [{ t: "1910/06" }] }]
    }, {
      layout: "h",
      zoom: 10,
      o: { hs: 10, hm: 2 }
    })).toBe(1902);
  });

  it("reserves the default span for roles that only have an end date", function() {
    expect(inferTimelineStart({
      roles: [{ start: null, end: 200 }]
    }, {
      layout: "h",
      zoom: 1,
      o: { hs: 10, hm: 5 }
    })).toBe(115);
  });

  it("falls back to zero when the dataset has no dates", function() {
    expect(inferTimelineStart({ roles: [] }, { layout: "h", zoom: 10 })).toBe(0);
  });
});

describe("date coordinates", function() {
  it("places the first day of the start year at zero", function() {
    expect(getDatePosition(parseDate("2024"), 120, 2024)).toBe(0);
  });

  it("includes month and day fractions", function() {
    expect(getDatePosition(parseDate("2024/07/01"), 120, 2024)).toBe(60);
    expect(getDatePosition(parseDate("2024/01/16"), 120, 2024)).toBe(5);
  });

  it("supports years before the configured start", function() {
    expect(getDatePosition(parseDate("1999"), 20, 2000)).toBe(-20);
  });

  it("returns zero for missing or unusable input", function() {
    expect(getDatePosition(null, 20, 2000)).toBe(0);
    expect(getDatePosition(parseDate("2024"), Number.NaN, 2024)).toBe(0);
  });
});

describe("ruler intervals", function() {
  it("calculates readable major and minor intervals from zoom", function() {
    expect(getRulerIntervals(0.1, 60, 20)).toEqual({ major: 1000, minor: 200 });
    expect(getRulerIntervals(1, 60, 20)).toEqual({ major: 100, minor: 20 });
    expect(getRulerIntervals(10, 60, 20)).toEqual({ major: 10, minor: 2 });
    expect(getRulerIntervals(30, 60, 20)).toEqual({ major: 2, minor: 1 });
    expect(getRulerIntervals(3, 60, 20)).toEqual({ major: 20, minor: 10 });
  });

  it("keeps explicitly configured major and minor intervals", function() {
    expect(getRulerIntervals(10, 60, 20, 50, 5)).toEqual({ major: 50, minor: 5 });
  });

  it("keeps an explicitly configured interval", function() {
    expect(getRulerInterval(10, 20, 25, 5)).toBe(5);
  });

  it("calculates a readable minor interval", function() {
    expect(getRulerInterval(10, 20, 25)).toBe(2);
    expect(getRulerInterval(100, 1, 25)).toBe(25);
  });

  it("never returns Infinity when the main mark is narrow", function() {
    expect(getRulerInterval(10, 1, 25)).toBe(10);
  });

  it("falls back safely for invalid configuration", function() {
    expect(getRulerInterval(0, 10, 25)).toBe(1);
    expect(getRulerInterval(10, 0, 25)).toBe(10);
  });

  it("aligns major marks to absolute round values", function() {
    expect(isRulerMajor(1295, 20)).toBe(false);
    expect(isRulerMajor(1300, 20)).toBe(true);
    expect(isRulerMajor(-70000, 1000)).toBe(true);
  });
});

describe("layout coordinates", function() {
  it("keeps time on x in a horizontal layout", function() {
    expect(orientPoint(120, 45, "h")).toEqual({ x: 120, y: 45 });
    expect(orientRect(120, 45, 80, 2, "h")).toEqual({
      x: 120,
      y: 45,
      w: 80,
      h: 2
    });
  });

  it("moves time to y in a vertical layout", function() {
    expect(orientPoint(120, 45, "v")).toEqual({ x: 45, y: 120 });
    expect(orientRect(120, 45, 80, 2, "v")).toEqual({
      x: 45,
      y: 120,
      w: 2,
      h: 80
    });
  });

  it("preserves SVG percentage dimensions when transposing", function() {
    expect(orientRect(120, 25, 80, "100%", "v")).toEqual({
      x: 25,
      y: 120,
      w: "100%",
      h: 80
    });
  });
});

describe("selection navigation", function() {
  it("moves in both directions", function() {
    expect(getNextSelectionIndex(1, 3, "ArrowLeft")).toBe(0);
    expect(getNextSelectionIndex(1, 3, "ArrowDown")).toBe(2);
  });

  it("wraps between the first and last point", function() {
    expect(getNextSelectionIndex(0, 3, "ArrowUp")).toBe(2);
    expect(getNextSelectionIndex(2, 3, "ArrowRight")).toBe(0);
  });

  it("enters the first point from an item-only selection", function() {
    expect(getNextSelectionIndex(-1, 3, "ArrowRight")).toBe(0);
  });

  it("ignores unrelated keys and invalid state", function() {
    expect(getNextSelectionIndex(1, 3, "Enter")).toBe(1);
    expect(getNextSelectionIndex(1, 0, "ArrowRight")).toBe(1);
  });
});
