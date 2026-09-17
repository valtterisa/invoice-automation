import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

const toneClass = {
  default: "border-border bg-card text-foreground",
  info: "border-info/25 bg-info/10 text-info",
  warning: "border-warning/30 bg-warning/10 text-warning-foreground",
  success: "border-success/25 bg-success/10 text-success",
  destructive: "border-destructive/30 bg-destructive/10 text-destructive",
} as const;

export type AlertProps = HTMLAttributes<HTMLDivElement> & {
  tone?: keyof typeof toneClass;
  title?: string;
  children?: ReactNode;
};

export function Alert({
  className,
  tone = "default",
  title,
  children,
  ...props
}: AlertProps) {
  return (
    <div
      role="alert"
      className={cn("rounded-md border px-3.5 py-3 text-sm", toneClass[tone], className)}
      {...props}
    >
      {title ? <div className="font-medium">{title}</div> : null}
      {children ? (
        <div className={cn(title ? "mt-1 opacity-90" : undefined)}>{children}</div>
      ) : null}
    </div>
  );
}
