export function formatMoney(amount: string | number | null | undefined, currency = "EUR"): string {
  if (amount == null || amount === "") {
    return "-";
  }

  let value: number;
  if (typeof amount === "number") {
    value = amount;
  } else {
    value = Number(amount.trim().replace(",", "."));
  }

  if (Number.isNaN(value)) {
    return "-";
  }

  return new Intl.NumberFormat("fi-FI", {
    style: "currency",
    currency: currency || "EUR",
  }).format(value);
}

export function formatDate(value: string | null | undefined): string {
  if (!value) {
    return "-";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat("fi-FI", {
    day: "numeric",
    month: "numeric",
    year: "numeric",
  }).format(date);
}

export function formatDateInput(value: string | null | undefined): string {
  if (!value) {
    return "";
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value.slice(0, 10);
  }
  return date.toISOString().slice(0, 10);
}
