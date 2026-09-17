const MONEY_RE = /^-?\d+(\.\d+)?$/;

function assertMoney(value: string, label: string): void {
  if (!MONEY_RE.test(value)) {
    throw new Error(`Invalid money value for ${label}: ${value}`);
  }
}

function splitParts(value: string): { negative: boolean; intPart: string; fracPart: string } {
  const negative = value.startsWith("-");
  const raw = negative ? value.slice(1) : value;
  const [intPart = "0", fracPart = ""] = raw.split(".");
  return { negative, intPart, fracPart };
}

function toScaledBigInt(value: string, scale: number): bigint {
  const { negative, intPart, fracPart } = splitParts(value);
  const paddedFrac = (fracPart + "0".repeat(scale)).slice(0, scale);
  const digits = `${intPart}${paddedFrac}`.replace(/^0+(?=\d)/, "") || "0";
  const scaled = BigInt(digits);
  return negative ? -scaled : scaled;
}

function maxFracScale(...values: string[]): number {
  return values.reduce((max, value) => {
    const { fracPart } = splitParts(value);
    return Math.max(max, fracPart.length);
  }, 0);
}

function fromScaledBigInt(value: bigint, scale: number): string {
  const negative = value < 0n;
  const abs = negative ? -value : value;
  const digits = abs.toString().padStart(scale + 1, "0");
  const intPart = digits.slice(0, digits.length - scale) || "0";
  const fracPart = scale > 0 ? digits.slice(-scale).replace(/0+$/, "") : "";
  const body = fracPart.length > 0 ? `${intPart}.${fracPart}` : intPart;
  return negative ? `-${body}` : body;
}

export function compareMoney(a: string, b: string, tolerance = "0"): number {
  assertMoney(a, "a");
  assertMoney(b, "b");
  assertMoney(tolerance, "tolerance");

  const scale = maxFracScale(a, b, tolerance);
  const diff = toScaledBigInt(a, scale) - toScaledBigInt(b, scale);
  const tol = toScaledBigInt(tolerance, scale);

  if (diff < 0n) {
    return -diff <= tol ? 0 : -1;
  }
  if (diff > 0n) {
    return diff <= tol ? 0 : 1;
  }
  return 0;
}

export function moneyEquals(a: string, b: string, tolerance = "0.01"): boolean {
  return compareMoney(a, b, tolerance) === 0;
}

export function subtractMoney(a: string, b: string): string {
  assertMoney(a, "a");
  assertMoney(b, "b");
  const scale = maxFracScale(a, b);
  return fromScaledBigInt(toScaledBigInt(a, scale) - toScaledBigInt(b, scale), scale);
}

export function addMoney(a: string, b: string): string {
  assertMoney(a, "a");
  assertMoney(b, "b");
  const scale = maxFracScale(a, b);
  return fromScaledBigInt(toScaledBigInt(a, scale) + toScaledBigInt(b, scale), scale);
}
