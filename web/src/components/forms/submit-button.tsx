import type { ComponentProps } from "react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

type SubmitButtonProps = ComponentProps<typeof Button> & {
  pending?: boolean;
};

export function SubmitButton({ pending = false, disabled, children, ...props }: SubmitButtonProps) {
  return (
    <Button type="submit" disabled={pending || disabled} aria-busy={pending} {...props}>
      {pending && <Spinner />}
      {children}
    </Button>
  );
}
