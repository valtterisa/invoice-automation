import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Badge } from "@/components/ui/Badge";
import { statusLabel } from "@/features/invoices/types";
import { formatMoney } from "@/lib/format";
import { StatusBadge } from "./StatusBadge";

describe("statusLabel", () => {
  it("maps snake_case statuses to labels", () => {
    expect(statusLabel("needs_review")).toBe("Needs review");
    expect(statusLabel("uploaded")).toBe("Uploaded");
  });
});

describe("formatMoney", () => {
  it("formats EUR with fi-FI locale", () => {
    expect(formatMoney("123.45", "EUR")).toMatch(/123[,.]45/);
    expect(formatMoney(null)).toBe("-");
  });
});

describe("Badge", () => {
  it("renders children", () => {
    render(<Badge variant="success">Approved</Badge>);
    expect(screen.getByText("Approved")).toBeInTheDocument();
  });
});

describe("StatusBadge", () => {
  it("renders needs review label", () => {
    render(<StatusBadge status="needs_review" />);
    expect(screen.getByText("Needs review")).toBeInTheDocument();
  });
});
