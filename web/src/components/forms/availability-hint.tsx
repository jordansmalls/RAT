import { CircleCheckIcon, CircleXIcon } from "@/components/icons";
import type { ReactNode } from "react";
import { Spinner } from "@/components/ui/spinner";
import type { AvailabilityStatus } from "@/features/account/use-availability";

type AvailabilityHintProps = {
  status: AvailabilityStatus;
  available?: ReactNode;
  taken?: ReactNode;
  reserved?: ReactNode;
};

export function AvailabilityHint({
  status,
  available = "Available",
  taken = "Already taken",
  reserved = "Not available",
}: AvailabilityHintProps) {
  if (status.state === "idle") return null;
  if (status.state === "available" && available === null) return null;

  const content = {
    checking: (
      <span className="flex items-center gap-1.5 text-muted-foreground">
        <Spinner className="size-3.5" /> Checking availability…
      </span>
    ),
    available: (
      <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-500">
        <CircleCheckIcon className="size-3.5" /> {available}
      </span>
    ),
    unavailable: (
      <span className="flex items-center gap-1.5 text-destructive">
        <CircleXIcon className="size-3.5" />
        {status.state === "unavailable" && status.reason === "reserved" ? reserved : taken}
      </span>
    ),
    error: <span className="text-muted-foreground">Couldn&apos;t check availability right now.</span>,
  }[status.state];

  return (
    <div className="text-sm" aria-live="polite">
      {content}
    </div>
  );
}
