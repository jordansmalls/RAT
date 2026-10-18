import type { FieldValues, Path, UseFormReturn } from "react-hook-form";
import { errorMessage, isApiError } from "@/lib/api";

/**
 * Map a failed API call onto a react-hook-form instance: Laravel validation
 * errors go to their fields, and anything else becomes a form-level error.
 */
export function applyServerErrors<T extends FieldValues, TTransformed extends FieldValues = T>(
  form: UseFormReturn<T, unknown, TTransformed>,
  error: unknown,
): void {
  if (isApiError(error) && Object.keys(error.errors).length > 0) {
    const knownFields = new Set(Object.keys(form.getValues()));
    let focused = false;
    let matchedAny = false;

    for (const [field, messages] of Object.entries(error.errors)) {
      if (!knownFields.has(field)) continue;
      form.setError(field as Path<T>, { type: "server", message: messages[0] }, { shouldFocus: !focused });
      focused = true;
      matchedAny = true;
    }

    if (matchedAny) return;
  }

  form.setError("root.server", { type: "server", message: errorMessage(error) });
}
