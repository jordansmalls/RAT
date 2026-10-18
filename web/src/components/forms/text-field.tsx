"use client";

import { useId, type ComponentProps, type ReactNode } from "react";
import { Controller, type Control, type FieldValues, type Path } from "react-hook-form";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

type TextFieldProps<T extends FieldValues, TTransformed extends FieldValues> = {
  control: Control<T, unknown, TTransformed>;
  name: Path<T>;
  label: ReactNode;
  description?: ReactNode;
  /** Extra status under the input, e.g. an availability check. */
  hint?: ReactNode;
  /** Rendered next to the label, e.g. a "Forgot password?" link. */
  labelAction?: ReactNode;
} & Omit<ComponentProps<typeof Input>, "name" | "value" | "defaultValue" | "onChange" | "onBlur">;

export function TextField<T extends FieldValues, TTransformed extends FieldValues = T>({
  control,
  name,
  label,
  description,
  hint,
  labelAction,
  id,
  ...inputProps
}: TextFieldProps<T, TTransformed>) {
  const generatedId = useId();
  const inputId = id ?? generatedId;

  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          {labelAction ? (
            <div className="flex items-center justify-between gap-2">
              <FieldLabel htmlFor={inputId}>{label}</FieldLabel>
              {labelAction}
            </div>
          ) : (
            <FieldLabel htmlFor={inputId}>{label}</FieldLabel>
          )}
          <Input {...inputProps} {...field} value={field.value ?? ""} id={inputId} aria-invalid={fieldState.invalid} />
          {description && <FieldDescription>{description}</FieldDescription>}
          {!fieldState.invalid && hint}
          <FieldError errors={[fieldState.error]} />
        </Field>
      )}
    />
  );
}
