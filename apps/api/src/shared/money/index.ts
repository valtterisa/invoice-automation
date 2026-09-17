import {
  addMoney,
  compareMoney,
  moneyEquals,
} from "@invoice-agent/shared";

const MONEY_RE = /^-?\d+(\.\d{1,4})?$/;

export function isValidMoneyString(value: string): boolean {
  return MONEY_RE.test(value.trim());
}

export function normalizeMoney(value: string): string {
  const trimmed = value.trim();
  if (!isValidMoneyString(trimmed)) {
    throw new Error(`Invalid money value: ${value}`);
  }
  const negative = trimmed.startsWith("-");
  const raw = negative ? trimmed.slice(1) : trimmed;
  const [wholePart = "0", fracPart = ""] = raw.split(".");
  const whole = wholePart.replace(/^0+(?=\d)/, "") || "0";
  const frac = (fracPart + "0000").slice(0, 4);
  const normalized = `${whole}.${frac}`;
  return negative && normalized !== "0.0000" ? `-${normalized}` : normalized;
}

export function sumMoney(values: string[]): string {
  return values.reduce((acc, v) => addMoney(acc, v), "0");
}

export { addMoney, compareMoney, moneyEquals };
