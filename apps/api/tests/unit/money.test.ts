import { describe, expect, it } from "vitest";
import {
  addMoney,
  compareMoney,
  isValidMoneyString,
  moneyEquals,
  normalizeMoney,
  sumMoney,
} from "../../src/shared/money/index.js";

describe("money helpers", () => {
  it("rejects non-decimal strings", () => {
    expect(isValidMoneyString("10.50")).toBe(true);
    expect(isValidMoneyString("-1.2")).toBe(true);
    expect(isValidMoneyString("10.1234")).toBe(true);
    expect(isValidMoneyString("10.12345")).toBe(false);
    expect(isValidMoneyString("abc")).toBe(false);
    expect(isValidMoneyString("10,50")).toBe(false);
    expect(isValidMoneyString("")).toBe(false);
  });

  it("normalizes to 4 decimal places without float drift", () => {
    expect(normalizeMoney("10.5")).toBe("10.5000");
    expect(normalizeMoney("10")).toBe("10.0000");
    expect(normalizeMoney("00.1")).toBe("0.1000");
    expect(normalizeMoney("-0.01")).toBe("-0.0100");
    expect(normalizeMoney("0")).toBe("0.0000");
    expect(() => normalizeMoney("10.12345")).toThrow(/Invalid money/);
  });

  it("avoids classic floating-point traps", () => {
    expect(addMoney("0.1", "0.2")).toBe("0.3");
    expect(addMoney("0.10", "0.20")).toBe("0.3");
    expect(moneyEquals(addMoney("0.10", "0.20"), "0.30")).toBe(true);
    expect(sumMoney(["0.1", "0.2", "0.3"])).toBe("0.6");
    expect(addMoney("19.99", "0.01")).toBe("20");
    expect(addMoney("100.00", "24.00")).toBe("124");
  });

  it("compares and equals with optional tolerance", () => {
    expect(compareMoney("10.5", "10.5000")).toBe(0);
    expect(compareMoney("9.9999", "10")).toBe(-1);
    expect(compareMoney("100", "99.9999")).toBe(1);
    expect(moneyEquals("1.10", "1.1000")).toBe(true);
    expect(moneyEquals("124.00", "124.004", "0.01")).toBe(true);
    expect(moneyEquals("124.00", "124.02", "0.01")).toBe(false);
    expect(moneyEquals("100.00", "100.009", "0.01")).toBe(true);
  });

  it("sums Finnish EUR line amounts without drift", () => {
    expect(sumMoney(["49.90", "49.90", "24.20"])).toBe("124");
    expect(addMoney("99.99", "0.01")).toBe("100");
  });
});
