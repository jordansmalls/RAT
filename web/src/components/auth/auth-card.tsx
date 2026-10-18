import type { ReactNode } from "react";
import { FieldDescription } from "@/components/ui/field";

/**
 * The shadcn `login-05` layout the old app used, without the icon mark: a
 * heading, a one-line switch link under it, the form, and an optional footnote.
 * <AuthShell> provides the centred `max-w-sm` column.
 */
export function AuthCard({
  title,
  eyebrow,
  description,
  footer,
  children,
}: {
  title: ReactNode;
  /** Small muted line above the heading, e.g. "Step 1 of 2". */
  eyebrow?: ReactNode;
  /** Under the heading. Usually the "New to RAT? Create an account" switch link. */
  description?: ReactNode;
  /** Under the form. */
  footer?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="flex w-full flex-col gap-6">
      <header className="flex flex-col items-center gap-2 text-center">
        {eyebrow && <p className="text-xs text-muted-foreground">{eyebrow}</p>}
        <h1 className="text-xl font-medium tracking-tight">{title}</h1>
        {description && <FieldDescription className="text-center text-balance">{description}</FieldDescription>}
      </header>
      {children}
      {footer && <FieldDescription className="text-center text-balance">{footer}</FieldDescription>}
    </section>
  );
}
