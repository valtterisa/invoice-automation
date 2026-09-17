import { describe, expect, it } from "vitest";
import {
  addMoney,
  compareMoney,
  moneyEquals,
  subtractMoney,
} from "./money.js";

describe("money helpers", () => {
  it("avoids floating-point traps on decimal strings", () => {
    expect(addMoney("0.1", "0.2")).toBe("0.3");
    expect(addMoney("0.10", "0.20")).toBe("0.3");
    expect(moneyEquals(addMoney("0.10", "0.20"), "0.30")).toBe(true);
    expect(subtractMoney("1.00", "0.01")).toBe("0.99");
    expect(addMoney("19.99", "0.01")).toBe("20");
  });

  it("compares equal amounts within tolerance", () => {
    expect(moneyEquals("10.00", "10.004", "0.01")).toBe(true);
    expect(moneyEquals("10.00", "10.02", "0.01")).toBe(false);
    expect(moneyEquals("124.00", "124.009", "0.01")).toBe(true);
  });

  it("orders amounts without floating point", () => {
    expect(compareMoney("9.99", "10.00")).toBe(-1);
    expect(compareMoney("10.00", "10.00")).toBe(0);
    expect(compareMoney("10.01", "10.00")).toBe(1);
    expect(compareMoney("100.00", "100.004", "0.01")).toBe(0);
  });

  it("adds and subtracts Finnish EUR amounts", () => {
    expect(addMoney("100.00", "24.00")).toBe("124");
    expect(subtractMoney("124.00", "24.00")).toBe("100");
    expect(subtractMoney("1.00", "1.50")).toBe("-0.5");
  });
});
