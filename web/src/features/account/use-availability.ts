"use client";

import { useQuery } from "@tanstack/react-query";
import { emailSchema, usernameSchema } from "@/features/auth/schemas";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { availabilityApi, type AvailabilityField } from "./api";
import { availabilityKeys } from "./queries";

export type AvailabilityStatus =
  | { state: "idle" }
  | { state: "checking" }
  | { state: "available" }
  | { state: "unavailable"; reason: "taken" | "reserved" }
  | { state: "error" };

const schemas = { email: emailSchema, username: usernameSchema } as const;

type Options = {
  /** Skip checking, e.g. when the value equals the user's current one. */
  enabled?: boolean;
  delayMs?: number;
};

/**
 * Debounced, cached availability lookup for a form field. Only values that pass
 * client-side validation are sent to the API; format errors are left to the form.
 */
export function useAvailability(
  field: AvailabilityField,
  rawValue: string,
  { enabled = true, delayMs = 400 }: Options = {},
): AvailabilityStatus {
  const parsed = schemas[field].safeParse(rawValue);
  const value = parsed.success ? parsed.data : null;
  const debouncedValue = useDebouncedValue(value, delayMs);
  const isSettled = debouncedValue === value;

  const query = useQuery({
    queryKey: availabilityKeys.check(field, debouncedValue ?? ""),
    queryFn: ({ signal }) => availabilityApi.check(field, debouncedValue!, signal),
    enabled: enabled && debouncedValue !== null,
    staleTime: 30 * 1000,
    retry: false,
  });

  if (!enabled || value === null) return { state: "idle" };
  if (!isSettled || query.isPending) return { state: "checking" };
  if (query.isError) return { state: "error" };
  if (query.data.available) return { state: "available" };
  return { state: "unavailable", reason: query.data.reason ?? "taken" };
}
