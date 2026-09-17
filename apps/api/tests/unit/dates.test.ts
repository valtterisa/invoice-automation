import { describe, expect, it } from "vitest";
import {
  compareIsoDates,
  isDateOnOrBefore,
  isValidIsoDate,
} from "../../src/shared/dates/index.js";

describe("date helpers", () => {
  it("validates real calendar ISO dates", () => {
    expect(isValidIsoDate("2024-01-31")).toBe(true);
    expect(isValidIsoDate("2024-02-29")).toBe(true);
    expect(isValidIsoDate("2023-02-29")).toBe(false);
    expect(isValidIsoDate("2024-02-30")).toBe(false);
    expect(isValidIsoDate("24-01-01")).toBe(false);
    expect(isValidIsoDate("2024-1-1")).toBe(false);
  });

  it("compares dates for due-before-invoice checks", () => {
    expect(compareIsoDates("2024-01-01", "2024-01-02")).toBe(-1);
    expect(compareIsoDates("2024-03-31", "2024-03-31")).toBe(0);
    expect(isDateOnOrBefore("2024-03-01", "2024-03-31")).toBe(true);
    expect(isDateOnOrBefore("2024-03-01", "2024-03-01")).toBe(true);
    expect(isDateOnOrBefore("2024-03-15", "2024-03-01")).toBe(false);
  });
});
