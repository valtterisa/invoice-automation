import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Label } from "./label";
import { Input, type InputProps } from "./input";

type FieldProps = {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  flagged?: boolean;
  children: ReactNode;
  className?: string;
};

export function Field({
  label,
  htmlFor,
  error,
  hint,
  flagged = false,
  children,
  className,
}: FieldProps) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label htmlFor={htmlFor} className={flagged ? "text-warning-foreground" : undefined}>
        {label}
        {flagged ? <span className="ml-1 text-warning-foreground">*</span> : null}
      </Label>
      {children}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
      {!error && hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

type TextFieldProps = Omit<InputProps, "id"> & {
  label: string;
  error?: string;
  hint?: string;
  flagged?: boolean;
};

export function TextField({
  label,
  name,
  error,
  hint,
  flagged,
  className,
  ...props
}: TextFieldProps) {
  const id = name ?? label.toLowerCase().replace(/\s+/g, "-");

  return (
    <Field label={label} htmlFor={id} error={error} hint={hint} flagged={flagged}>
      <Input
        id={id}
        name={name}
        className={cn(
          error || flagged ? "border-warning focus-visible:ring-warning" : undefined,
          error ? "border-destructive focus-visible:ring-destructive" : undefined,
          className,
        )}
        aria-invalid={Boolean(error)}
        {...props}
      />
    </Field>
  );
}
