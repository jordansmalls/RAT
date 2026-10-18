import type { ReactNode } from "react";
export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-svh flex-1 flex-col items-center justify-center gap-6 bg-background p-6 md:p-10">
      <main className="flex w-full max-w-sm flex-col gap-6">{children}</main>
    </div>
  );
}
