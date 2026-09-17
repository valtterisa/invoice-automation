const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isValidIsoDate(value: string): boolean {
  if (!ISO_DATE_RE.test(value)) {
    return false;
  }
  const [y, m, d] = value.split("-").map(Number) as [number, number, number];
  const dt = new Date(Date.UTC(y, m - 1, d));
  return (
    dt.getUTCFullYear() === y &&
    dt.getUTCMonth() === m - 1 &&
    dt.getUTCDate() === d
  );
}

export function compareIsoDates(a: string, b: string): number {
  if (!isValidIsoDate(a) || !isValidIsoDate(b)) {
    throw new Error("Invalid ISO date");
  }
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

export function isDateOnOrBefore(a: string, b: string): boolean {
  return compareIsoDates(a, b) <= 0;
}
