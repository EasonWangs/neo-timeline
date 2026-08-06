import { describe, expect, it } from "vitest";
import {
  getDatePosition,
  getNextSelectionIndex,
  getRulerInterval,
  parseDate
} from "../../utils.js";

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
  it("keeps an explicitly configured interval", function() {
    expect(getRulerInterval(10, 20, 25, 5)).toBe(5);
  });

  it("calculates a readable minor interval", function() {
    expect(getRulerInterval(10, 20, 25)).toBe(1);
    expect(getRulerInterval(100, 1, 25)).toBe(25);
  });

  it("never returns Infinity when the main mark is narrow", function() {
    expect(getRulerInterval(10, 1, 25)).toBe(10);
  });

  it("falls back safely for invalid configuration", function() {
    expect(getRulerInterval(0, 10, 25)).toBe(1);
    expect(getRulerInterval(10, 0, 25)).toBe(10);
  });
});

describe("selection navigation", function() {
  it("moves in both directions", function() {
    expect(getNextSelectionIndex(1, 3, "ArrowLeft")).toBe(0);
    expect(getNextSelectionIndex(1, 3, "ArrowDown")).toBe(2);
  });

  it("stops at the first and last point", function() {
    expect(getNextSelectionIndex(0, 3, "ArrowUp")).toBe(0);
    expect(getNextSelectionIndex(2, 3, "ArrowRight")).toBe(2);
  });

  it("enters the first point from an item-only selection", function() {
    expect(getNextSelectionIndex(-1, 3, "ArrowRight")).toBe(0);
  });

  it("ignores unrelated keys and invalid state", function() {
    expect(getNextSelectionIndex(1, 3, "Enter")).toBe(1);
    expect(getNextSelectionIndex(1, 0, "ArrowRight")).toBe(1);
  });
});
